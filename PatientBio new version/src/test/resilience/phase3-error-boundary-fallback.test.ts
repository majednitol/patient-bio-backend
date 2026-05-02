import { describe, it, expect } from "vitest";
import {
  createErrorBoundaryState,
  catchError,
  resetErrorBoundary,
  shouldShowFallback,
  getFallbackMessage,
  isNetworkError,
} from "./resilience-helpers";

describe("Phase 3: Error Boundary Fallback Rendering", () => {
  it("1. Initial state has no error", () => {
    const state = createErrorBoundaryState();
    expect(state.hasError).toBe(false);
    expect(state.error).toBeNull();
    expect(state.errorCount).toBe(0);
  });

  it("2. Catching an error sets hasError to true", () => {
    let state = createErrorBoundaryState();
    state = catchError(state, new Error("Component crashed"));
    expect(state.hasError).toBe(true);
    expect(state.error?.message).toBe("Component crashed");
  });

  it("3. Error count increments on each catch", () => {
    let state = createErrorBoundaryState();
    state = catchError(state, new Error("Error 1"));
    state = catchError(state, new Error("Error 2"));
    state = catchError(state, new Error("Error 3"));
    expect(state.errorCount).toBe(3);
  });

  it("4. Reset clears error but preserves count", () => {
    let state = createErrorBoundaryState();
    state = catchError(state, new Error("Test"));
    state = resetErrorBoundary(state);
    expect(state.hasError).toBe(false);
    expect(state.error).toBeNull();
    expect(state.errorCount).toBe(1);
  });

  it("5. shouldShowFallback returns true only when error exists", () => {
    let state = createErrorBoundaryState();
    expect(shouldShowFallback(state)).toBe(false);
    state = catchError(state, new Error("Crash"));
    expect(shouldShowFallback(state)).toBe(true);
  });

  it("6. shouldShowFallback returns false after reset", () => {
    let state = createErrorBoundaryState();
    state = catchError(state, new Error("Crash"));
    state = resetErrorBoundary(state);
    expect(shouldShowFallback(state)).toBe(false);
  });

  it("7. Network error shows 'Connection Problem' message", () => {
    const msg = getFallbackMessage(new Error("NetworkError: Failed to fetch"));
    expect(msg).toBe("Connection Problem");
  });

  it("8. Non-network error shows 'Something went wrong'", () => {
    const msg = getFallbackMessage(new Error("TypeError: Cannot read properties"));
    expect(msg).toBe("Something went wrong");
  });

  it("9. Null error shows generic message", () => {
    const msg = getFallbackMessage(null);
    expect(msg).toBe("An unexpected error occurred");
  });

  it("10. lastErrorAt is set when error is caught", () => {
    let state = createErrorBoundaryState();
    expect(state.lastErrorAt).toBeNull();
    const before = Date.now();
    state = catchError(state, new Error("Test"));
    expect(state.lastErrorAt).toBeGreaterThanOrEqual(before);
  });

  it("11. Multiple resets don't corrupt state", () => {
    let state = createErrorBoundaryState();
    state = catchError(state, new Error("Error"));
    state = resetErrorBoundary(state);
    state = resetErrorBoundary(state);
    state = resetErrorBoundary(state);
    expect(state.hasError).toBe(false);
    expect(state.errorCount).toBe(1);
  });

  it("12. Different error types produce correct messages", () => {
    expect(getFallbackMessage(new Error("Connection refused"))).toBe("Connection Problem");
    expect(getFallbackMessage(new Error("Failed to load chunk"))).toBe("Connection Problem");
    expect(getFallbackMessage(new Error("RangeError: Invalid array length"))).toBe("Something went wrong");
  });

  it("13. Error boundary can recover after reset and re-catch", () => {
    let state = createErrorBoundaryState();
    state = catchError(state, new Error("First"));
    state = resetErrorBoundary(state);
    expect(state.hasError).toBe(false);
    state = catchError(state, new Error("Second"));
    expect(state.hasError).toBe(true);
    expect(state.errorCount).toBe(2);
    expect(state.error?.message).toBe("Second");
  });

  it("14. isNetworkError correctly identifies network errors for fallback UI", () => {
    expect(isNetworkError("NetworkError: Failed to fetch")).toBe(true);
    expect(isNetworkError("Connection reset by peer")).toBe(true);
    expect(isNetworkError("ReferenceError: x is not defined")).toBe(false);
  });

  it("15. Error with empty message still triggers fallback", () => {
    let state = createErrorBoundaryState();
    state = catchError(state, new Error(""));
    expect(state.hasError).toBe(true);
    expect(shouldShowFallback(state)).toBe(true);
    expect(getFallbackMessage(state.error)).toBe("Something went wrong");
  });
});
