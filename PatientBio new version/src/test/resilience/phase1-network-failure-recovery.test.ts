import { describe, it, expect } from "vitest";
import {
  createNetworkSimulator,
  simulateRequest,
  transitionNetwork,
  classifyError,
  isNetworkError,
  shouldRetry,
} from "./resilience-helpers";

describe("Phase 1: Network Failure Recovery", () => {
  it("1. Online request succeeds", () => {
    const sim = createNetworkSimulator("online");
    const result = simulateRequest(sim);
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("2. Offline request fails with NetworkError", () => {
    const sim = createNetworkSimulator("offline");
    const result = simulateRequest(sim);
    expect(result.success).toBe(false);
    expect(result.error).toContain("NetworkError");
  });

  it("3. Slow network returns success with high latency", () => {
    const sim = createNetworkSimulator("slow");
    const result = simulateRequest(sim);
    expect(result.success).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(5000);
  });

  it("4. Intermittent network fails every other request", () => {
    const sim = createNetworkSimulator("intermittent");
    const r1 = simulateRequest(sim); // request 1: success
    const r2 = simulateRequest(sim); // request 2: fail
    const r3 = simulateRequest(sim); // request 3: success
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(false);
    expect(r3.success).toBe(true);
  });

  it("5. Transitioning from offline to online recovers", () => {
    let sim = createNetworkSimulator("offline");
    expect(simulateRequest(sim).success).toBe(false);
    sim = transitionNetwork(sim, "online");
    expect(simulateRequest(sim).success).toBe(true);
  });

  it("6. Transitioning from online to offline fails", () => {
    let sim = createNetworkSimulator("online");
    expect(simulateRequest(sim).success).toBe(true);
    sim = transitionNetwork(sim, "offline");
    expect(simulateRequest(sim).success).toBe(false);
  });

  it("7. Failure count tracks correctly", () => {
    const sim = createNetworkSimulator("offline");
    simulateRequest(sim);
    simulateRequest(sim);
    simulateRequest(sim);
    expect(sim.failureCount).toBe(3);
    expect(sim.totalRequests).toBe(3);
  });

  it("8. Network error classification: fetch failure is transient", () => {
    expect(classifyError("NetworkError: Failed to fetch")).toBe("transient");
  });

  it("9. Network error classification: 401 is fatal", () => {
    expect(classifyError("401 Unauthorized")).toBe("fatal");
  });

  it("10. Network error classification: 500 is recoverable", () => {
    expect(classifyError("500 Internal Server Error")).toBe("recoverable");
  });

  it("11. isNetworkError detects network-related errors", () => {
    expect(isNetworkError("NetworkError: Failed to fetch")).toBe(true);
    expect(isNetworkError("Connection refused")).toBe(true);
    expect(isNetworkError("Failed to load resource")).toBe(true);
    expect(isNetworkError("Validation error")).toBe(false);
  });

  it("12. Transient errors should be retried", () => {
    expect(shouldRetry("NetworkError: timeout")).toBe(true);
    expect(shouldRetry("500 Internal Server Error")).toBe(true);
  });

  it("13. Fatal errors should not be retried", () => {
    expect(shouldRetry("403 Forbidden")).toBe(false);
    expect(shouldRetry("401 Unauthorized")).toBe(false);
  });

  it("14. Multiple transitions maintain state consistency", () => {
    let sim = createNetworkSimulator("online");
    simulateRequest(sim);
    sim = transitionNetwork(sim, "offline");
    simulateRequest(sim);
    sim = transitionNetwork(sim, "slow");
    simulateRequest(sim);
    sim = transitionNetwork(sim, "online");
    simulateRequest(sim);
    expect(sim.totalRequests).toBe(4);
    expect(sim.failureCount).toBe(1);
  });

  it("15. Offline request has zero latency", () => {
    const sim = createNetworkSimulator("offline");
    const result = simulateRequest(sim);
    expect(result.latencyMs).toBe(0);
  });
});
