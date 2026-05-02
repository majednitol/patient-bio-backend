/**
 * Resilience Test Helpers
 * Pure utilities for simulating network failures, retry logic, error boundaries, and graceful degradation.
 */

// ── Network Simulation ──

export type NetworkState = "online" | "offline" | "slow" | "intermittent";

export interface NetworkSimulator {
  state: NetworkState;
  failureCount: number;
  totalRequests: number;
  latencyMs: number;
}

export function createNetworkSimulator(initial: NetworkState = "online"): NetworkSimulator {
  return { state: initial, failureCount: 0, totalRequests: 0, latencyMs: initial === "slow" ? 5000 : 100 };
}

export function simulateRequest(sim: NetworkSimulator): { success: boolean; error?: string; latencyMs: number } {
  sim.totalRequests++;
  switch (sim.state) {
    case "offline":
      sim.failureCount++;
      return { success: false, error: "NetworkError: Failed to fetch", latencyMs: 0 };
    case "slow":
      return { success: true, latencyMs: sim.latencyMs };
    case "intermittent":
      // Fails every other request
      if (sim.totalRequests % 2 === 0) {
        sim.failureCount++;
        return { success: false, error: "NetworkError: Connection reset", latencyMs: 0 };
      }
      return { success: true, latencyMs: 200 };
    case "online":
    default:
      return { success: true, latencyMs: sim.latencyMs };
  }
}

export function transitionNetwork(sim: NetworkSimulator, newState: NetworkState): NetworkSimulator {
  return { ...sim, state: newState, latencyMs: newState === "slow" ? 5000 : 100 };
}

// ── Retry Logic ──

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
};

export function calculateBackoffDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelayMs);
}

export interface RetryResult {
  success: boolean;
  attempts: number;
  totalDelayMs: number;
  errors: string[];
  finalError?: string;
}

export function simulateRetry(
  operation: () => { success: boolean; error?: string },
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): RetryResult {
  const errors: string[] = [];
  let totalDelay = 0;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    const result = operation();
    if (result.success) {
      return { success: true, attempts: attempt, totalDelayMs: totalDelay, errors };
    }
    errors.push(result.error || "Unknown error");
    if (attempt <= config.maxRetries) {
      totalDelay += calculateBackoffDelay(attempt, config);
    }
  }

  return {
    success: false,
    attempts: config.maxRetries + 1,
    totalDelayMs: totalDelay,
    errors,
    finalError: errors[errors.length - 1],
  };
}

// ── Error Classification ──

export type ErrorSeverity = "recoverable" | "fatal" | "transient";

export function classifyError(error: string): ErrorSeverity {
  const lower = error.toLowerCase();
  if (lower.includes("network") || lower.includes("timeout") || lower.includes("fetch") || lower.includes("connection")) {
    return "transient";
  }
  if (lower.includes("auth") || lower.includes("permission") || lower.includes("forbidden") || lower.includes("401") || lower.includes("403")) {
    return "fatal";
  }
  if (lower.includes("500") || lower.includes("server") || lower.includes("internal")) {
    return "recoverable";
  }
  return "recoverable";
}

export function isNetworkError(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase();
  return lower.includes("network") || lower.includes("fetch") || lower.includes("failed to load") || lower.includes("connection");
}

export function shouldRetry(error: string): boolean {
  const severity = classifyError(error);
  return severity !== "fatal";
}

// ── Graceful Degradation ──

export type DegradationLevel = "full" | "partial" | "cached" | "unavailable";

export interface DegradationState {
  level: DegradationLevel;
  availableFeatures: string[];
  unavailableFeatures: string[];
  message: string;
}

const ALL_FEATURES = ["view_records", "edit_records", "share_data", "sync", "notifications", "analytics", "messaging"];

export function determineDegradation(networkState: NetworkState, hasCachedData: boolean): DegradationState {
  switch (networkState) {
    case "online":
      return {
        level: "full",
        availableFeatures: [...ALL_FEATURES],
        unavailableFeatures: [],
        message: "All features available",
      };
    case "slow":
      return {
        level: "partial",
        availableFeatures: ["view_records", "edit_records", "share_data", "sync"],
        unavailableFeatures: ["notifications", "analytics", "messaging"],
        message: "Some features may be slow or unavailable",
      };
    case "intermittent":
      return {
        level: "partial",
        availableFeatures: ["view_records", "edit_records"],
        unavailableFeatures: ["share_data", "sync", "notifications", "analytics", "messaging"],
        message: "Connection unstable. Some features unavailable.",
      };
    case "offline":
      if (hasCachedData) {
        return {
          level: "cached",
          availableFeatures: ["view_records"],
          unavailableFeatures: ["edit_records", "share_data", "sync", "notifications", "analytics", "messaging"],
          message: "Offline mode. Viewing cached data only.",
        };
      }
      return {
        level: "unavailable",
        availableFeatures: [],
        unavailableFeatures: [...ALL_FEATURES],
        message: "No connection and no cached data available.",
      };
  }
}

// ── Error Boundary Simulation ──

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
  lastErrorAt: number | null;
}

export function createErrorBoundaryState(): ErrorBoundaryState {
  return { hasError: false, error: null, errorCount: 0, lastErrorAt: null };
}

export function catchError(state: ErrorBoundaryState, error: Error): ErrorBoundaryState {
  return {
    hasError: true,
    error,
    errorCount: state.errorCount + 1,
    lastErrorAt: Date.now(),
  };
}

export function resetErrorBoundary(state: ErrorBoundaryState): ErrorBoundaryState {
  return { ...state, hasError: false, error: null };
}

export function shouldShowFallback(state: ErrorBoundaryState): boolean {
  return state.hasError && state.error !== null;
}

export function getFallbackMessage(error: Error | null): string {
  if (!error) return "An unexpected error occurred";
  if (isNetworkError(error.message)) return "Connection Problem";
  return "Something went wrong";
}

// ── Query Client Simulation ──

export interface QueryState {
  status: "idle" | "loading" | "error" | "success";
  data: unknown;
  error: string | null;
  retryCount: number;
  isStale: boolean;
}

export function simulateQueryWithRetry(
  fetchFn: () => { success: boolean; data?: unknown; error?: string },
  maxRetries: number
): QueryState {
  for (let i = 0; i <= maxRetries; i++) {
    const result = fetchFn();
    if (result.success) {
      return { status: "success", data: result.data, error: null, retryCount: i, isStale: false };
    }
    if (i === maxRetries) {
      return { status: "error", data: null, error: result.error || "Failed", retryCount: i, isStale: false };
    }
  }
  return { status: "error", data: null, error: "Exhausted retries", retryCount: maxRetries, isStale: false };
}

// ── Throttled Network Simulation ──

export interface ThrottledNetwork {
  name: string;
  bandwidthKbps: number;
  latencyMs: number;
  packetLoss: number; // 0-1
}

export function createThrottledNetwork(profile: "3g" | "edge" | "satellite" | "4g"): ThrottledNetwork {
  switch (profile) {
    case "3g":
      return { name: "3G", bandwidthKbps: 750, latencyMs: 300, packetLoss: 0.05 };
    case "edge":
      return { name: "Edge/2G", bandwidthKbps: 50, latencyMs: 500, packetLoss: 0.02 };
    case "satellite":
      return { name: "Satellite", bandwidthKbps: 5000, latencyMs: 600, packetLoss: 0.01 };
    case "4g":
      return { name: "4G", bandwidthKbps: 10000, latencyMs: 50, packetLoss: 0.001 };
  }
}

/**
 * Calculate transfer time in seconds for a payload given a throttled network profile.
 * Accounts for bandwidth, latency (per request), and packet loss (retransmission overhead).
 */
export function simulateThrottledTransfer(
  payloadSizeKB: number,
  network: ThrottledNetwork,
  requestCount: number = 1
): number {
  const payloadKbits = payloadSizeKB * 8;
  const effectiveBandwidth = network.bandwidthKbps * (1 - network.packetLoss * 1.5); // retransmission overhead
  const transferTimeSec = payloadKbits / effectiveBandwidth;
  const totalLatencySec = (network.latencyMs * requestCount) / 1000;
  return transferTimeSec + totalLatencySec;
}

// ── Device Profile Simulation ──

export interface DeviceProfile {
  name: string;
  memoryMB: number;
  cpuMultiplier: number; // 1 = baseline high-end, higher = slower
}

export function createDeviceProfile(tier: "low" | "mid" | "high"): DeviceProfile {
  switch (tier) {
    case "low":
      return { name: "Low-end", memoryMB: 512, cpuMultiplier: 4 };
    case "mid":
      return { name: "Mid-range", memoryMB: 2048, cpuMultiplier: 2 };
    case "high":
      return { name: "High-end", memoryMB: 8192, cpuMultiplier: 1 };
  }
}

export function simulateConstrainedProcessing(baseTimeMs: number, device: DeviceProfile): number {
  return baseTimeMs * device.cpuMultiplier;
}

export function shouldReducePayload(payloadSizeKB: number, network: ThrottledNetwork): boolean {
  const transferTime = simulateThrottledTransfer(payloadSizeKB, network);
  return transferTime > 10; // recommend reduction if transfer > 10s
}

export function getRecommendedBatchSize(
  totalRecords: number,
  network: ThrottledNetwork,
  device: DeviceProfile
): number {
  const baseBatch = 200;
  let batch = baseBatch;

  // Reduce for slow networks
  if (network.bandwidthKbps < 1000) batch = Math.min(batch, 50);
  else if (network.bandwidthKbps < 5000) batch = Math.min(batch, 100);

  // Reduce for constrained devices
  if (device.memoryMB <= 512) batch = Math.min(batch, 50);
  else if (device.memoryMB <= 2048) batch = Math.min(batch, 100);

  return Math.min(batch, totalRecords);
}

export type RequestPriority = "critical" | "normal" | "low";

export interface PrioritizedRequest {
  name: string;
  priority: RequestPriority;
  payloadSizeKB: number;
}

export function prioritizeRequests(requests: PrioritizedRequest[]): PrioritizedRequest[] {
  const order: Record<RequestPriority, number> = { critical: 0, normal: 1, low: 2 };
  return [...requests].sort((a, b) => order[a.priority] - order[b.priority]);
}

export function getProgressivePayloadSize(
  network: ThrottledNetwork
): { strategy: "summary" | "full"; maxPayloadKB: number } {
  if (network.bandwidthKbps < 1000) {
    return { strategy: "summary", maxPayloadKB: 5 };
  }
  return { strategy: "full", maxPayloadKB: 200 };
}

export function getThrottledDegradationLevel(network: ThrottledNetwork): DegradationLevel {
  if (network.bandwidthKbps >= 5000) return "full";
  if (network.bandwidthKbps >= 500) return "partial";
  return "cached";
}

export function shouldChunkProcessing(payloadSizeKB: number, device: DeviceProfile): boolean {
  const memoryBudgetKB = device.memoryMB * 1024 * 0.1; // 10% of RAM budget
  return payloadSizeKB > memoryBudgetKB;
}
