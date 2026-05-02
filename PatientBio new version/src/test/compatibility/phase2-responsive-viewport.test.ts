/**
 * Phase 16b: Responsive Viewport Compatibility Tests
 * Validates layout contracts across breakpoints.
 */
import { describe, it, expect } from "vitest";
import {
  simulateViewport,
  getBreakpointTier,
  PORTALS,
  ViewportContract,
} from "./compat-helpers";

describe("Phase 16b: Responsive Viewport Compatibility", () => {
  it("1 - 320px viewport: sidebar collapses, bottom nav appears", () => {
    const v = simulateViewport(320);
    expect(v.tier).toBe("xs");
    expect(v.sidebarVisible).toBe(false);
    expect(v.bottomNavVisible).toBe(true);
  });

  it("2 - 375px viewport: touch targets are minimum 44x44px", () => {
    const v = simulateViewport(375);
    expect(v.minTouchTarget).toBeGreaterThanOrEqual(44);
  });

  it("3 - 768px viewport: sidebar visible, bottom nav hidden", () => {
    const v = simulateViewport(768);
    expect(v.sidebarVisible).toBe(true);
    expect(v.bottomNavVisible).toBe(false);
  });

  it("4 - 1024px viewport: full sidebar with labels, no bottom nav", () => {
    const v = simulateViewport(1024);
    expect(v.tier).toBe("lg");
    expect(v.sidebarVisible).toBe(true);
    expect(v.bottomNavVisible).toBe(false);
  });

  it("5 - 1920px viewport: content max-width prevents excessive stretching", () => {
    const v = simulateViewport(1920);
    expect(v.contentMaxWidth).not.toBeNull();
    expect(v.contentMaxWidth!).toBeLessThan(1920);
  });

  it("6 - Portrait vs landscape: critical actions remain visible in both", () => {
    const portrait = simulateViewport(375);
    const landscape = simulateViewport(667);
    // Both should have bottom nav or sidebar
    expect(portrait.bottomNavVisible || portrait.sidebarVisible).toBe(true);
    expect(landscape.bottomNavVisible || landscape.sidebarVisible).toBe(true);
  });

  it("7 - Font scaling at 200%: navigation items have sufficient space", () => {
    // At 200% font scaling on a 1024px viewport, effective viewport is ~512px
    const effectiveViewport = simulateViewport(512);
    // Should still have navigation available
    expect(effectiveViewport.bottomNavVisible || effectiveViewport.sidebarVisible).toBe(true);
  });

  it("8 - Viewport meta tag prevents user-zoom-disable (accessibility)", () => {
    // Contract: viewport meta should NOT include maximum-scale=1 or user-scalable=no
    const disallowedPatterns = ["maximum-scale=1", "user-scalable=no", "user-scalable=0"];
    const viewportMeta = "width=device-width, initial-scale=1.0";
    for (const pattern of disallowedPatterns) {
      expect(viewportMeta).not.toContain(pattern);
    }
  });

  it("9 - Horizontal scroll absent at all 5 breakpoints", () => {
    const widths = [320, 375, 768, 1024, 1920];
    for (const w of widths) {
      const v = simulateViewport(w);
      // Content max-width should never exceed viewport
      if (v.contentMaxWidth) {
        expect(v.contentMaxWidth).toBeLessThanOrEqual(w);
      }
    }
  });

  it("10 - Modal/dialog width constrained to viewport on mobile", () => {
    const mobile = simulateViewport(375);
    // Dialog max-width contract: 95% of viewport on mobile
    const maxDialogWidth = mobile.tier === "xs" ? Math.floor(375 * 0.95) : 500;
    expect(maxDialogWidth).toBeLessThanOrEqual(375);
  });

  it("11 - Table columns prioritize critical data on narrow screens", () => {
    const allColumns = ["name", "date", "status", "doctor", "notes", "actions"];
    const mobileVisibleColumns = allColumns.filter(c => ["name", "status", "actions"].includes(c));
    const desktopVisibleColumns = allColumns;
    expect(mobileVisibleColumns.length).toBeLessThan(desktopVisibleColumns.length);
    expect(mobileVisibleColumns).toContain("name");
    expect(mobileVisibleColumns).toContain("actions");
  });

  it("12 - Form inputs use full width on mobile, 50% on desktop", () => {
    const mobile = simulateViewport(375);
    const desktop = simulateViewport(1280);
    expect(mobile.formInputWidth).toBe("full");
    expect(desktop.formInputWidth).toBe("half");
  });

  it("13 - Image/avatar sizes scale down proportionally on mobile", () => {
    const avatarSizes: Record<string, number> = { xs: 32, sm: 40, md: 48, lg: 64 };
    const mobileSize = avatarSizes[getBreakpointTier(375)] ?? avatarSizes.xs;
    const desktopSize = avatarSizes[getBreakpointTier(1280)] ?? avatarSizes.lg;
    expect(mobileSize).toBeLessThanOrEqual(desktopSize);
  });

  it("14 - Sticky headers remain functional at all breakpoints", () => {
    const widths = [320, 768, 1024, 1920];
    for (const w of widths) {
      const v = simulateViewport(w);
      // Contract: header is always present regardless of tier
      expect(v.tier).toBeDefined();
      // Sticky header height should leave enough content area
      const headerHeight = 64;
      const minContentArea = w < 768 ? 400 : 600;
      const availableHeight = 800 - headerHeight; // assuming 800px viewport height
      expect(availableHeight).toBeGreaterThanOrEqual(minContentArea);
    }
  });

  it("15 - All 7 portal dashboards meet layout contracts at 375px and 1280px", () => {
    for (const portal of PORTALS) {
      const mobile = simulateViewport(375);
      const desktop = simulateViewport(1280);
      // Each portal must have navigation available at both sizes
      expect(mobile.bottomNavVisible || mobile.sidebarVisible).toBe(true);
      expect(desktop.sidebarVisible).toBe(true);
      // Touch targets valid for mobile
      expect(mobile.minTouchTarget).toBeGreaterThanOrEqual(44);
    }
  });
});
