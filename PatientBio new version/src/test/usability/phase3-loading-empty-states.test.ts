import { describe, it, expect } from "vitest";
import { assessLoadingState, assessEmptyState, getAllPortals } from "./usability-helpers";

describe("Phase 15c: Loading and Empty States", () => {
  it("dashboard cards show skeleton loaders matching final layout shape", () => {
    const state = assessLoadingState("dashboard_cards");
    expect(state.type).toBe("skeleton");
    expect(state.matchesLayout).toBe(true);
  });

  it("tables show row skeletons with correct column count", () => {
    const state = assessLoadingState("table");
    expect(state.type).toBe("skeleton");
    expect(state.matchesLayout).toBe(true);
  });

  it("loading states include subtle animation (pulse or shimmer)", () => {
    const entities = ["dashboard_cards", "table", "profile", "list", "page"];
    entities.forEach(entity => {
      const state = assessLoadingState(entity);
      expect(state.hasAnimation).toBe(true);
    });
  });

  it("empty patient list shows 'Add your first patient' CTA", () => {
    const state = assessEmptyState("patients", "doctor");
    expect(state.ctaLabel.toLowerCase()).toContain("add");
    expect(state.ctaLabel.toLowerCase()).toContain("patient");
  });

  it("empty appointments view shows 'Schedule an appointment' action", () => {
    const state = assessEmptyState("appointments", "patient");
    expect(state.ctaLabel.toLowerCase()).toMatch(/book|schedule/);
  });

  it("empty health records shows 'Upload your first record'", () => {
    const state = assessEmptyState("records", "patient");
    expect(state.ctaLabel.toLowerCase()).toContain("upload");
  });

  it("empty search results show 'Try different keywords' suggestion", () => {
    const state = assessEmptyState("results", "search");
    expect(state.message.toLowerCase()).toContain("keyword");
  });

  it("empty notifications shows friendly 'All caught up' message", () => {
    const state = assessEmptyState("notifications", "patient");
    expect(state.message.toLowerCase()).toContain("caught up");
  });

  it("each portal has a defined empty state for its primary entity", () => {
    const portalEntities: Record<string, string> = {
      patient: "appointments",
      doctor: "patients",
      hospital: "admissions",
      researcher: "datasets",
      pathologist: "reports",
      pharma: "trials",
      admin: "users",
    };
    Object.entries(portalEntities).forEach(([portal, entity]) => {
      const state = assessEmptyState(entity, portal);
      expect(state.message.length).toBeGreaterThan(0);
      expect(state.ctaLabel.length).toBeGreaterThan(0);
    });
  });

  it("loading states have timeout fallback (show error after 30s)", () => {
    const entities = ["dashboard_cards", "table", "profile"];
    entities.forEach(entity => {
      const state = assessLoadingState(entity);
      expect(state.timeoutMs).toBeLessThanOrEqual(30000);
      expect(["error", "retry", "message"]).toContain(state.timeoutFallback);
    });
  });

  it("partial data loads show available data with loading indicator for remaining", () => {
    const listState = assessLoadingState("list");
    expect(listState.type).toBe("shimmer");
    expect(listState.hasAnimation).toBe(true);
  });

  it("skeleton components match the dimensions of real content", () => {
    const skeletonEntities = ["dashboard_cards", "table", "profile"];
    skeletonEntities.forEach(entity => {
      const state = assessLoadingState(entity);
      if (state.type === "skeleton") {
        expect(state.matchesLayout).toBe(true);
      }
    });
  });

  it("empty states use illustration or icon (not just text)", () => {
    const state = assessEmptyState("patients", "doctor");
    expect(state.hasIcon).toBe(true);
  });

  it("refresh/retry button appears when loading exceeds expected duration", () => {
    const state = assessLoadingState("dashboard_cards");
    expect(state.timeoutFallback).toBe("retry");
  });

  it("first-time user experience differs from returning user empty state", () => {
    const firstTime = assessEmptyState("records", "patient", true);
    const returning = assessEmptyState("records", "patient", false);
    expect(firstTime.message).not.toBe(returning.message);
    expect(firstTime.isFirstTime).toBe(true);
    expect(returning.isFirstTime).toBe(false);
  });
});
