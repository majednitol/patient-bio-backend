import { describe, it, expect } from "vitest";
import {
  calculateBackoffDelay,
  simulateRetry,
  simulateQueryWithRetry,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
} from "./resilience-helpers";

describe("Phase 4: Retry Behavior", () => {
  it("1. First retry delay equals base delay", () => {
    expect(calculateBackoffDelay(1)).toBe(1000);
  });

  it("2. Second retry delay is baseDelay * multiplier", () => {
    expect(calculateBackoffDelay(2)).toBe(2000);
  });

  it("3. Third retry delay follows exponential backoff", () => {
    expect(calculateBackoffDelay(3)).toBe(4000);
  });

  it("4. Delay is capped at maxDelayMs", () => {
    expect(calculateBackoffDelay(20)).toBe(DEFAULT_RETRY_CONFIG.maxDelayMs);
  });

  it("5. Successful operation on first try returns attempts=1", () => {
    const result = simulateRetry(() => ({ success: true }));
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(1);
    expect(result.totalDelayMs).toBe(0);
  });

  it("6. Operation failing all retries returns final error", () => {
    const result = simulateRetry(() => ({ success: false, error: "Server error" }));
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(4); // 1 initial + 3 retries
    expect(result.errors.length).toBe(4);
    expect(result.finalError).toBe("Server error");
  });

  it("7. Operation succeeding on second attempt retries once", () => {
    let callCount = 0;
    const result = simulateRetry(() => {
      callCount++;
      return callCount >= 2 ? { success: true } : { success: false, error: "Transient" };
    });
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
    expect(result.errors).toEqual(["Transient"]);
  });

  it("8. Custom retry config with 0 retries only tries once", () => {
    const config: RetryConfig = { maxRetries: 0, baseDelayMs: 100, backoffMultiplier: 2, maxDelayMs: 1000 };
    const result = simulateRetry(() => ({ success: false, error: "Fail" }), config);
    expect(result.attempts).toBe(1);
    expect(result.success).toBe(false);
  });

  it("9. Custom config with 5 retries tries 6 times total", () => {
    const config: RetryConfig = { maxRetries: 5, baseDelayMs: 100, backoffMultiplier: 2, maxDelayMs: 10000 };
    const result = simulateRetry(() => ({ success: false, error: "Fail" }), config);
    expect(result.attempts).toBe(6);
  });

  it("10. Total delay accumulates across retries", () => {
    const result = simulateRetry(() => ({ success: false, error: "Fail" }));
    // Delays: 1000 + 2000 + 4000 = 7000
    expect(result.totalDelayMs).toBe(7000);
  });

  it("11. Query simulation succeeds on first try", () => {
    const state = simulateQueryWithRetry(() => ({ success: true, data: { id: 1 } }), 3);
    expect(state.status).toBe("success");
    expect(state.data).toEqual({ id: 1 });
    expect(state.retryCount).toBe(0);
  });

  it("12. Query simulation fails after exhausting retries", () => {
    const state = simulateQueryWithRetry(() => ({ success: false, error: "DB down" }), 2);
    expect(state.status).toBe("error");
    expect(state.error).toBe("DB down");
    expect(state.retryCount).toBe(2);
  });

  it("13. Query succeeds on last retry attempt", () => {
    let calls = 0;
    const state = simulateQueryWithRetry(() => {
      calls++;
      return calls === 3 ? { success: true, data: "recovered" } : { success: false, error: "Fail" };
    }, 3);
    expect(state.status).toBe("success");
    expect(state.data).toBe("recovered");
    expect(state.retryCount).toBe(2);
  });

  it("14. Backoff with multiplier 1 gives constant delay", () => {
    const config: RetryConfig = { maxRetries: 3, baseDelayMs: 500, backoffMultiplier: 1, maxDelayMs: 10000 };
    expect(calculateBackoffDelay(1, config)).toBe(500);
    expect(calculateBackoffDelay(2, config)).toBe(500);
    expect(calculateBackoffDelay(3, config)).toBe(500);
  });

  it("15. Error array captures each failure message", () => {
    let callCount = 0;
    const result = simulateRetry(() => {
      callCount++;
      return { success: false, error: `Error #${callCount}` };
    });
    expect(result.errors).toEqual(["Error #1", "Error #2", "Error #3", "Error #4"]);
  });
});
