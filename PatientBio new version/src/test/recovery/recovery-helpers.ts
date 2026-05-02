/**
 * Recovery Testing Helpers
 * Simulation utilities for state snapshots, session lifecycle,
 * sync queue replay, transaction atomicity, and crash recovery.
 */

// --- State Snapshot ---

export interface StateSnapshot {
  version: number;
  timestamp: number;
  entries: Record<string, { data: unknown; staleTime: number; fetchedAt: number; isInvalidated: boolean; observerCount: number }>;
  checksum: string;
}

function computeChecksum(entries: Record<string, unknown>): string {
  const str = JSON.stringify(entries);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export function createStateSnapshot(
  cache: Map<string, { data: unknown; staleTime: number; fetchedAt: number; isInvalidated: boolean; observerCount: number }>,
  version = 1
): StateSnapshot {
  const entries: StateSnapshot["entries"] = {};
  for (const [key, val] of cache.entries()) {
    entries[key] = structuredClone(val);
  }
  return {
    version,
    timestamp: Date.now(),
    entries,
    checksum: computeChecksum(entries),
  };
}

export function restoreFromSnapshot(
  snapshot: StateSnapshot,
  expectedVersion = 1
): { success: boolean; cache: Map<string, { data: unknown; staleTime: number; fetchedAt: number; isInvalidated: boolean; observerCount: number }>; reason?: string } {
  if (!snapshot || typeof snapshot !== "object") {
    return { success: false, cache: new Map(), reason: "invalid_snapshot" };
  }
  if (snapshot.version !== expectedVersion) {
    return { success: false, cache: new Map(), reason: "version_mismatch" };
  }
  const actualChecksum = computeChecksum(snapshot.entries);
  if (actualChecksum !== snapshot.checksum) {
    return { success: false, cache: new Map(), reason: "checksum_mismatch" };
  }
  const cache = new Map<string, { data: unknown; staleTime: number; fetchedAt: number; isInvalidated: boolean; observerCount: number }>();
  for (const [key, val] of Object.entries(snapshot.entries)) {
    cache.set(key, structuredClone(val));
  }
  return { success: true, cache };
}

export function isSnapshotExpired(snapshot: StateSnapshot, maxAgeMs = 24 * 60 * 60 * 1000, now = Date.now()): boolean {
  return now - snapshot.timestamp >= maxAgeMs;
}

// --- Session Lifecycle ---

export interface SessionToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  role: string;
}

export interface SessionEvent {
  type: "token_expired" | "refresh_success" | "refresh_failed" | "logout" | "role_changed" | "network_offline" | "network_online" | "force_logout";
  payload?: Record<string, unknown>;
}

export interface SessionState {
  isAuthenticated: boolean;
  token: SessionToken | null;
  redirectTo: string | null;
  formData: Record<string, unknown> | null;
  preferences: Record<string, unknown>;
  refreshAttempts: number;
  pendingRequests: number;
}

export function simulateSessionLifecycle(
  initialState: SessionState,
  events: SessionEvent[]
): { finalState: SessionState; log: string[] } {
  const state = structuredClone(initialState);
  const log: string[] = [];

  for (const event of events) {
    switch (event.type) {
      case "token_expired":
        log.push("token_expired");
        state.refreshAttempts = 0;
        break;
      case "refresh_success":
        state.token = (event.payload as { token: SessionToken })?.token ?? state.token;
        state.isAuthenticated = true;
        state.refreshAttempts = 0;
        state.pendingRequests = 0;
        if (event.payload?.role) state.token!.role = event.payload.role as string;
        log.push("refresh_success");
        break;
      case "refresh_failed":
        state.refreshAttempts++;
        if (state.refreshAttempts >= 3) {
          state.isAuthenticated = false;
          state.token = null;
          state.redirectTo = "/login";
          log.push("refresh_exhausted");
        } else {
          log.push(`refresh_failed_attempt_${state.refreshAttempts}`);
        }
        break;
      case "logout":
        state.isAuthenticated = false;
        state.token = null;
        state.formData = null;
        state.redirectTo = "/login";
        log.push("logout");
        break;
      case "force_logout":
        state.isAuthenticated = false;
        state.token = null;
        state.formData = null;
        state.preferences = {};
        state.redirectTo = "/login";
        log.push("force_logout");
        break;
      case "role_changed":
        if (state.token) state.token.role = (event.payload?.role as string) ?? state.token.role;
        log.push("role_changed");
        break;
      case "network_offline":
        state.pendingRequests++;
        log.push("network_offline");
        break;
      case "network_online":
        log.push("network_online");
        break;
    }
  }
  return { finalState: state, log };
}

// --- Sync Queue ---

export interface SyncMutation {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  payload: Record<string, unknown>;
  timestamp: number;
  idempotent: boolean;
  attempts: number;
  version?: number;
}

export class SyncQueue {
  private queue: SyncMutation[] = [];
  private completed: SyncMutation[] = [];
  private maxSize: number;
  private progressCallbacks: ((mutation: SyncMutation, index: number, total: number) => void)[] = [];

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  enqueue(mutation: SyncMutation): { accepted: boolean; evicted?: SyncMutation } {
    // Dedup
    const existing = this.queue.find(
      (m) => m.entityType === mutation.entityType && m.entityId === mutation.entityId && m.action === mutation.action && m.idempotent
    );
    if (existing) return { accepted: false };

    let evicted: SyncMutation | undefined;
    if (this.queue.length >= this.maxSize) {
      evicted = this.queue.shift();
    }
    this.queue.push(mutation);
    return { accepted: true, evicted };
  }

  async replay(
    executor: (m: SyncMutation) => Promise<{ success: boolean; conflict?: boolean; serverVersion?: number }>
  ): Promise<{ succeeded: number; failed: number; conflicts: SyncMutation[]; interrupted: boolean }> {
    let succeeded = 0;
    let failed = 0;
    const conflicts: SyncMutation[] = [];
    const toRetry: SyncMutation[] = [];

    for (let i = 0; i < this.queue.length; i++) {
      const m = this.queue[i];
      try {
        const result = await executor(m);
        if (result.conflict) {
          conflicts.push(m);
        } else if (result.success) {
          succeeded++;
          this.completed.push(m);
          for (const cb of this.progressCallbacks) cb(m, i, this.queue.length);
        } else {
          failed++;
          m.attempts++;
          toRetry.push(m);
        }
      } catch {
        // Network drop during replay
        this.queue = [...this.queue.slice(i), ...toRetry];
        return { succeeded, failed, conflicts, interrupted: true };
      }
    }
    this.queue = toRetry;
    return { succeeded, failed, conflicts, interrupted: false };
  }

  onProgress(cb: (mutation: SyncMutation, index: number, total: number) => void): void {
    this.progressCallbacks.push(cb);
  }

  getQueue(): SyncMutation[] {
    return [...this.queue];
  }

  getCompleted(): SyncMutation[] {
    return [...this.completed];
  }

  size(): number {
    return this.queue.length;
  }

  serialize(): string {
    return JSON.stringify(this.queue);
  }

  static deserialize(data: string, maxSize = 100): SyncQueue {
    const q = new SyncQueue(maxSize);
    q.queue = JSON.parse(data);
    return q;
  }

  isStale(maxAgeDays = 7, now = Date.now()): boolean {
    if (this.queue.length === 0) return false;
    const oldest = this.queue[0].timestamp;
    return now - oldest > maxAgeDays * 24 * 60 * 60 * 1000;
  }
}

// --- Transaction ---

export interface TransactionStep {
  id: string;
  name: string;
  execute: () => Promise<boolean>;
  rollback: () => Promise<void>;
  critical: boolean;
  readOnly?: boolean;
}

export interface TransactionLog {
  stepId: string;
  name: string;
  status: "committed" | "rolled_back" | "skipped";
  timestamp: number;
}

export interface TransactionResult {
  status: "committed" | "rolled_back" | "partial";
  logs: TransactionLog[];
  failedStep?: string;
}

export async function simulateTransaction(
  steps: TransactionStep[],
  metadata?: { initiator: string; reason: string }
): Promise<TransactionResult> {
  const logs: TransactionLog[] = [];
  const committedSteps: TransactionStep[] = [];

  for (const step of steps) {
    try {
      const ok = await step.execute();
      if (!ok) {
        logs.push({ stepId: step.id, name: step.name, status: "skipped", timestamp: Date.now() });
        if (step.critical) {
          // Rollback all committed
          for (const cs of committedSteps.reverse()) {
            if (!cs.readOnly) await cs.rollback();
            logs.push({ stepId: cs.id, name: cs.name, status: "rolled_back", timestamp: Date.now() });
          }
          return { status: "rolled_back", logs, failedStep: step.id };
        }
        continue;
      }
      logs.push({ stepId: step.id, name: step.name, status: "committed", timestamp: Date.now() });
      committedSteps.push(step);
    } catch {
      logs.push({ stepId: step.id, name: step.name, status: "skipped", timestamp: Date.now() });
      if (step.critical) {
        for (const cs of committedSteps.reverse()) {
          if (!cs.readOnly) await cs.rollback();
          logs.push({ stepId: cs.id, name: cs.name, status: "rolled_back", timestamp: Date.now() });
        }
        return { status: "rolled_back", logs, failedStep: step.id };
      }
    }
  }

  const hasRollback = logs.some((l) => l.status === "rolled_back");
  const hasCommit = logs.some((l) => l.status === "committed");
  return {
    status: hasRollback && hasCommit ? "partial" : hasCommit ? "committed" : "rolled_back",
    logs,
  };
}

export function detectOrphans(
  logs: TransactionLog[],
  expectedStepCount: number
): { hasOrphans: boolean; orphanedSteps: string[] } {
  const committed = logs.filter((l) => l.status === "committed").map((l) => l.stepId);
  if (committed.length > 0 && committed.length < expectedStepCount) {
    return { hasOrphans: true, orphanedSteps: committed };
  }
  return { hasOrphans: false, orphanedSteps: [] };
}

// --- Crash Recovery ---

export interface RecoveryContext {
  route: string;
  scrollY: number;
  formData: Record<string, unknown> | null;
  portal: "patient" | "doctor" | "admin" | "hospital" | "pathologist" | "researcher";
  draftMessages: string[];
  timerStartedAt: number | null;
  syncQueuePosition: number;
  crashCount: number;
  recoverySuccessCount: number;
}

export function createRecoveryContext(overrides: Partial<RecoveryContext> = {}): RecoveryContext {
  return {
    route: overrides.route ?? "/dashboard",
    scrollY: overrides.scrollY ?? 0,
    formData: overrides.formData ?? null,
    portal: overrides.portal ?? "patient",
    draftMessages: overrides.draftMessages ?? [],
    timerStartedAt: overrides.timerStartedAt ?? null,
    syncQueuePosition: overrides.syncQueuePosition ?? 0,
    crashCount: overrides.crashCount ?? 0,
    recoverySuccessCount: overrides.recoverySuccessCount ?? 0,
  };
}

export function simulateCrashRecovery(
  stored: RecoveryContext | null
): { recovered: boolean; context: RecoveryContext; prompt: "restore" | "none" } {
  if (!stored) {
    return { recovered: false, context: createRecoveryContext(), prompt: "none" };
  }
  const hasUnsaved = stored.formData !== null || stored.draftMessages.length > 0;
  return {
    recovered: true,
    context: { ...stored, crashCount: stored.crashCount + 1 },
    prompt: hasUnsaved ? "restore" : "none",
  };
}

export function clearRecoveryContext(): RecoveryContext {
  return createRecoveryContext();
}

// --- Storage Simulation ---

export class MockStorage {
  private store = new Map<string, string>();
  private available: boolean;

  constructor(available = true) {
    this.available = available;
  }

  getItem(key: string): string | null {
    if (!this.available) throw new Error("Storage unavailable");
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (!this.available) throw new Error("Storage unavailable");
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    if (!this.available) throw new Error("Storage unavailable");
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  isAvailable(): boolean {
    return this.available;
  }
}
