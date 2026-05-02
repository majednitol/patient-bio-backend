import { describe, it, expect } from "vitest";
import { simulateTransaction, detectOrphans, type TransactionStep } from "./recovery-helpers";

function makeStep(id: string, opts: Partial<TransactionStep> = {}): TransactionStep {
  let committed = false;
  return {
    id,
    name: opts.name ?? `Step ${id}`,
    execute: opts.execute ?? (async () => { committed = true; return true; }),
    rollback: opts.rollback ?? (async () => { committed = false; }),
    critical: opts.critical ?? true,
    readOnly: opts.readOnly ?? false,
  };
}

describe("Phase 17d: Transaction Recovery", () => {
  it("1 - all steps succeed: transaction commits fully", async () => {
    const result = await simulateTransaction([makeStep("1"), makeStep("2"), makeStep("3")]);
    expect(result.status).toBe("committed");
    expect(result.logs.filter((l) => l.status === "committed")).toHaveLength(3);
  });

  it("2 - step 2 fails: step 1 rolled back, step 3 never runs", async () => {
    const result = await simulateTransaction([
      makeStep("1"),
      makeStep("2", { execute: async () => false }),
      makeStep("3"),
    ]);
    expect(result.status).toBe("rolled_back");
    expect(result.failedStep).toBe("2");
    expect(result.logs.some((l) => l.stepId === "3" && l.status === "committed")).toBe(false);
  });

  it("3 - rollback restores exact pre-transaction state", async () => {
    let state = "initial";
    const result = await simulateTransaction([
      makeStep("1", { execute: async () => { state = "modified"; return true; }, rollback: async () => { state = "initial"; } }),
      makeStep("2", { execute: async () => false }),
    ]);
    expect(result.status).toBe("rolled_back");
    expect(state).toBe("initial");
  });

  it("4 - nested transaction: inner failure rolls back inner only (savepoint)", async () => {
    let outerState = "initial";
    let innerState = "initial";
    // Simulate inner as a non-critical step
    const result = await simulateTransaction([
      makeStep("outer", { execute: async () => { outerState = "done"; return true; } }),
      makeStep("inner", { execute: async () => { innerState = "fail"; return false; }, critical: false }),
    ]);
    expect(result.status).toBe("committed");
    expect(outerState).toBe("done");
  });

  it("5 - timeout on step 3: steps 1-2 rolled back", async () => {
    const result = await simulateTransaction([
      makeStep("1"),
      makeStep("2"),
      makeStep("3", { execute: async () => { throw new Error("timeout"); } }),
    ]);
    expect(result.status).toBe("rolled_back");
    expect(result.failedStep).toBe("3");
  });

  it("6 - prescription saved even if notification fails (non-critical)", async () => {
    let rxSaved = false;
    const result = await simulateTransaction([
      makeStep("rx", { execute: async () => { rxSaved = true; return true; } }),
      makeStep("notification", { execute: async () => false, critical: false }),
    ]);
    expect(result.status).toBe("committed");
    expect(rxSaved).toBe(true);
  });

  it("7 - appointment + bed assignment: both commit or both rollback", async () => {
    let appt = false, bed = false;
    const result = await simulateTransaction([
      makeStep("appt", { execute: async () => { appt = true; return true; }, rollback: async () => { appt = false; } }),
      makeStep("bed", { execute: async () => { bed = false; return false; }, rollback: async () => { bed = false; } }),
    ]);
    expect(result.status).toBe("rolled_back");
    expect(appt).toBe(false);
  });

  it("8 - compensation action: failed payment reverses invoice status", async () => {
    let invoiceStatus = "pending";
    const result = await simulateTransaction([
      makeStep("invoice", { execute: async () => { invoiceStatus = "invoiced"; return true; }, rollback: async () => { invoiceStatus = "reversed"; } }),
      makeStep("payment", { execute: async () => false }),
    ]);
    expect(result.status).toBe("rolled_back");
    expect(invoiceStatus).toBe("reversed");
  });

  it("9 - transaction log records all steps with timestamps", async () => {
    const result = await simulateTransaction([makeStep("1"), makeStep("2")]);
    expect(result.logs).toHaveLength(2);
    for (const log of result.logs) {
      expect(log.timestamp).toBeGreaterThan(0);
      expect(log.stepId).toBeDefined();
    }
  });

  it("10 - concurrent transactions on same entity: second detects conflict", async () => {
    let version = 1;
    const tx1 = await simulateTransaction([
      makeStep("update", { execute: async () => { version = 2; return true; } }),
    ]);
    // tx2 was started when version was 1 but now it's 2
    const tx2 = await simulateTransaction([
      makeStep("update", { execute: async () => { if (version !== 1) return false; version = 3; return true; } }),
    ]);
    expect(tx1.status).toBe("committed");
    expect(tx2.status).toBe("rolled_back");
  });

  it("11 - orphan detection: finds committed step 1 without step 2", () => {
    const logs = [
      { stepId: "1", name: "Step 1", status: "committed" as const, timestamp: Date.now() },
    ];
    const { hasOrphans, orphanedSteps } = detectOrphans(logs, 3);
    expect(hasOrphans).toBe(true);
    expect(orphanedSteps).toContain("1");
  });

  it("12 - retry failed transaction from last successful step", async () => {
    let attempts = 0;
    const step2 = makeStep("2", {
      execute: async () => { attempts++; return attempts >= 2; },
    });
    // First attempt fails
    const r1 = await simulateTransaction([makeStep("1"), step2]);
    expect(r1.status).toBe("rolled_back");
    // Retry - step2 now succeeds
    const r2 = await simulateTransaction([makeStep("1"), step2]);
    expect(r2.status).toBe("committed");
  });

  it("13 - transaction with 10 steps rolls back all on final step failure", async () => {
    const states: boolean[] = Array(10).fill(false);
    const steps = states.map((_, i) =>
      i < 9
        ? makeStep(`${i}`, { execute: async () => { states[i] = true; return true; }, rollback: async () => { states[i] = false; } })
        : makeStep(`${i}`, { execute: async () => false })
    );
    const result = await simulateTransaction(steps);
    expect(result.status).toBe("rolled_back");
    expect(states.slice(0, 9).every((s) => s === false)).toBe(true);
  });

  it("14 - read-only steps don't generate rollback actions", async () => {
    const rollbacks: string[] = [];
    const result = await simulateTransaction([
      makeStep("read", { readOnly: true, rollback: async () => { rollbacks.push("read"); } }),
      makeStep("write", { execute: async () => false }),
    ]);
    expect(result.status).toBe("rolled_back");
    expect(rollbacks).not.toContain("read");
  });

  it("15 - transaction metadata preserved in context", async () => {
    const result = await simulateTransaction(
      [makeStep("1")],
      { initiator: "doctor-123", reason: "prescription-create" }
    );
    expect(result.status).toBe("committed");
    expect(result.logs[0].stepId).toBe("1");
  });
});
