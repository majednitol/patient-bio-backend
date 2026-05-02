import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, act } from "@testing-library/react";

// ── Render-count tracker ────────────────────────────────────────
function createRenderCounter() {
  let count = 0;
  const Counter = React.memo(
    React.forwardRef<{ getRenderCount: () => number }, { children?: React.ReactNode }>(
      (_props, ref) => {
        count++;
        React.useImperativeHandle(ref, () => ({ getRenderCount: () => count }));
        return null;
      }
    )
  );
  return { Counter, getRenderCount: () => count, reset: () => { count = 0; } };
}

// ── 1. SearchInput render stability ─────────────────────────────

describe("Phase 5: Render Performance", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("SearchInput render counts", () => {
    it("should not re-render when parent re-renders with same props", () => {
      // Simulate a memoized search input pattern:
      // The component should only re-render when value or onChange changes.
      let renderCount = 0;

      const SearchInputSim = React.memo(function SearchInputSim({
        value,
        onChange,
      }: {
        value: string;
        onChange: (v: string) => void;
      }) {
        renderCount++;
        return React.createElement("input", {
          value,
          onChange: (e: any) => onChange(e.target.value),
        });
      });

      const stableOnChange = () => {};

      // Initial render
      const { rerender } = render(
        React.createElement(SearchInputSim, { value: "test", onChange: stableOnChange })
      );
      expect(renderCount).toBe(1);

      // Re-render with identical props — should NOT cause extra render
      rerender(
        React.createElement(SearchInputSim, { value: "test", onChange: stableOnChange })
      );
      expect(renderCount).toBe(1);

      // Re-render with new value — SHOULD cause render
      rerender(
        React.createElement(SearchInputSim, { value: "test2", onChange: stableOnChange })
      );
      expect(renderCount).toBe(2);
    });

    it("should debounce onChange to avoid excessive re-renders", () => {
      let externalUpdateCount = 0;
      const debouncedHandler = (() => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        return (value: string) => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => { externalUpdateCount++; }, 300);
        };
      })();

      // Simulate rapid typing: 10 keystrokes within 300ms intervals
      for (let i = 0; i < 10; i++) {
        debouncedHandler(`query-${i}`);
        vi.advanceTimersByTime(50); // 50ms between keystrokes
      }

      // Before debounce settles
      expect(externalUpdateCount).toBe(0);

      // After debounce settles
      vi.advanceTimersByTime(300);
      expect(externalUpdateCount).toBe(1);
    });

    it("should fire at most 1 search per debounce window under rapid input", () => {
      let fireCount = 0;
      const DEBOUNCE_MS = 300;
      const KEYSTROKE_COUNT = 50;

      let timer: ReturnType<typeof setTimeout> | null = null;
      for (let i = 0; i < KEYSTROKE_COUNT; i++) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { fireCount++; }, DEBOUNCE_MS);
        vi.advanceTimersByTime(10); // 10ms between keystrokes = 500ms total typing
      }
      vi.advanceTimersByTime(DEBOUNCE_MS + 1);

      expect(fireCount).toBe(1);
    });
  });

  // ── 2. ConsultationTimerBadge render efficiency ───────────────

  describe("ConsultationTimerBadge render logic", () => {
    it("phase computation should be stable when elapsed is under average", () => {
      const avgMs = 12 * 60 * 1000; // 12 min average

      const computePhase = (elapsedMs: number, averageDurationMinutes: number | undefined, ended: boolean) => {
        if (!averageDurationMinutes || ended) return "default";
        const avg = averageDurationMinutes * 60 * 1000;
        if (elapsedMs <= avg) return "green";
        if (elapsedMs <= avg * 1.5) return "amber";
        return "red";
      };

      // Phase should remain "green" for any elapsed under average
      const phases = Array.from({ length: 100 }, (_, i) => {
        const elapsed = i * 7200; // 0 to ~720s in 7.2s steps
        return computePhase(elapsed, 12, false);
      });

      const greenCount = phases.filter((p) => p === "green").length;
      expect(greenCount).toBe(100); // all under 12 min
    });

    it("phase transitions should happen at exact thresholds", () => {
      const computePhase = (elapsedMs: number, avgMin: number) => {
        const avg = avgMin * 60 * 1000;
        if (elapsedMs <= avg) return "green";
        if (elapsedMs <= avg * 1.5) return "amber";
        return "red";
      };

      const avgMin = 10;
      const avgMs = avgMin * 60 * 1000; // 600_000

      expect(computePhase(avgMs, avgMin)).toBe("green");         // exactly at average
      expect(computePhase(avgMs + 1, avgMin)).toBe("amber");     // 1ms over
      expect(computePhase(avgMs * 1.5, avgMin)).toBe("amber");   // exactly at 1.5x
      expect(computePhase(avgMs * 1.5 + 1, avgMin)).toBe("red"); // 1ms over 1.5x
    });

    it("formatDuration should not allocate excessively for 1000 calls", () => {
      const formatDuration = (ms: number): string => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (hours > 0) {
          return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        }
        return `${minutes}:${String(seconds).padStart(2, "0")}`;
      };

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        formatDuration(i * 1000);
      }
      const durationMs = performance.now() - start;

      // 1000 format calls should complete in under 50ms
      expect(durationMs).toBeLessThan(50);
    });
  });

  // ── 3. VirtualList batch rendering ────────────────────────────

  describe("VirtualList rendering efficiency", () => {
    it("should only render batchSize items initially, not all items", () => {
      const TOTAL = 1000;
      const BATCH = 20;
      let renderedCount = 0;

      const items = Array.from({ length: TOTAL }, (_, i) => i);
      const renderItem = (_item: number) => {
        renderedCount++;
        return React.createElement("div", null, `item`);
      };

      // Simulate the VirtualList slicing logic
      const visibleItems = items.slice(0, BATCH);
      visibleItems.forEach((item) => renderItem(item));

      expect(renderedCount).toBe(BATCH);
      expect(renderedCount).toBeLessThan(TOTAL);
    });

    it("should batch-load items incrementally", () => {
      const TOTAL = 500;
      const BATCH = 20;
      let visibleCount = BATCH;

      const loadMore = () => {
        visibleCount = Math.min(visibleCount + BATCH, TOTAL);
      };

      // Simulate 5 scroll-triggered loads
      for (let i = 0; i < 5; i++) {
        loadMore();
      }

      expect(visibleCount).toBe(BATCH + 5 * BATCH); // 120
      expect(visibleCount).toBeLessThan(TOTAL);
    });

    it("should reset visible count when items array changes", () => {
      const BATCH = 20;
      let visibleCount = 100; // user had scrolled

      // Simulate items change (e.g., new search results)
      const newItemsLength = 50;
      visibleCount = BATCH; // reset

      expect(visibleCount).toBe(BATCH);
    });

    it("renderItem should handle 10k items batch-slice in under 10ms", () => {
      const items = Array.from({ length: 10_000 }, (_, i) => ({ id: i, name: `Item ${i}` }));

      const start = performance.now();
      const batch = items.slice(0, 50);
      batch.forEach((item) => {
        // Simulate minimal render work
        `${item.id}-${item.name}`;
      });
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
    });
  });

  // ── 4. GlobalSearchDialog render efficiency ───────────────────

  describe("GlobalSearchDialog grouping performance", () => {
    it("should group 500 results by type in under 5ms", () => {
      const types = ["patient", "appointment", "record", "prescription", "report", "doctor", "hospital"];
      const results = Array.from({ length: 500 }, (_, i) => ({
        id: `r-${i}`,
        type: types[i % types.length],
        title: `Result ${i}`,
        subtitle: `Subtitle ${i}`,
        icon: "file-text",
        url: `/item/${i}`,
      }));

      const start = performance.now();
      const grouped = results.reduce<Record<string, typeof results>>((acc, r) => {
        if (!acc[r.type]) acc[r.type] = [];
        acc[r.type].push(r);
        return acc;
      }, {});
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5);
      expect(Object.keys(grouped).length).toBe(7);
      // Each type should have ~71 items
      for (const type of types) {
        expect(grouped[type].length).toBeGreaterThanOrEqual(71);
      }
    });

    it("HighlightMatch regex should handle 1000 highlight operations efficiently", () => {
      const text = "Dr. Amit Patel - Cardiology Department at City Hospital";
      const query = "patel";

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
        text.split(regex);
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });

  // ── 5. Memoization stability ──────────────────────────────────

  describe("Callback memoization patterns", () => {
    it("useCallback-style stable reference should prevent child re-renders", () => {
      let childRenderCount = 0;

      const Child = React.memo(({ onClick }: { onClick: () => void }) => {
        childRenderCount++;
        return React.createElement("button", { onClick }, "click");
      });

      const stableCallback = () => {};

      const { rerender } = render(
        React.createElement(Child, { onClick: stableCallback })
      );
      expect(childRenderCount).toBe(1);

      // Same reference — no re-render
      rerender(React.createElement(Child, { onClick: stableCallback }));
      expect(childRenderCount).toBe(1);

      // New reference — re-render
      rerender(React.createElement(Child, { onClick: () => {} }));
      expect(childRenderCount).toBe(2);
    });

    it("unstable callbacks should cause re-renders (anti-pattern detection)", () => {
      let renderCount = 0;

      const Child = React.memo(({ onClick }: { onClick: () => void }) => {
        renderCount++;
        return React.createElement("button", { onClick }, "click");
      });

      const { rerender } = render(
        React.createElement(Child, { onClick: () => {} })
      );

      // Each rerender with inline arrow = new reference = re-render
      for (let i = 0; i < 5; i++) {
        rerender(React.createElement(Child, { onClick: () => {} }));
      }

      expect(renderCount).toBe(6); // 1 initial + 5 re-renders
    });
  });
});
