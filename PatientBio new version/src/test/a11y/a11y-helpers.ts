import { vi } from "vitest";

/**
 * A11y test utilities for verifying ARIA roles, keyboard navigation,
 * and screen reader support across all portal components.
 */

// ── ARIA assertion helpers ──────────────────────────────────────

/** Assert element has the correct ARIA role */
export function expectRole(el: HTMLElement, role: string) {
  expect(el.getAttribute("role") ?? el.tagName.toLowerCase()).toBe(role);
}

/** Assert element has aria-label or aria-labelledby */
export function expectLabelled(el: HTMLElement) {
  const hasLabel = el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby");
  const hasTitle = el.hasAttribute("title");
  const hasText = (el.textContent ?? "").trim().length > 0;
  expect(hasLabel || hasTitle || hasText).toBe(true);
}

/** Assert sr-only text exists somewhere in element tree */
export function expectSrOnly(container: HTMLElement, text: string) {
  const srElements = container.querySelectorAll(".sr-only");
  const found = Array.from(srElements).some((el) => el.textContent?.includes(text));
  expect(found).toBe(true);
}

/** Assert element is focusable (tabindex >= 0 or natively focusable) */
export function expectFocusable(el: HTMLElement) {
  const focusableTags = ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"];
  const tabIndex = el.getAttribute("tabindex");
  const isFocusable = focusableTags.includes(el.tagName) || (tabIndex !== null && parseInt(tabIndex) >= 0);
  expect(isFocusable).toBe(true);
}

/** Assert focus-visible ring classes present */
export function expectFocusRing(el: HTMLElement) {
  const classes = el.className;
  const hasFocusRing =
    classes.includes("focus-visible:ring") ||
    classes.includes("focus:ring") ||
    classes.includes("focus-visible:outline") ||
    classes.includes("focus:outline");
  expect(hasFocusRing).toBe(true);
}

/** Assert element has aria-expanded attribute */
export function expectExpandable(el: HTMLElement) {
  expect(el.hasAttribute("aria-expanded")).toBe(true);
}

/** Assert element has aria-disabled or disabled attribute */
export function expectDisabledState(el: HTMLElement, disabled: boolean) {
  const isDisabled =
    el.hasAttribute("disabled") ||
    el.getAttribute("aria-disabled") === "true";
  expect(isDisabled).toBe(disabled);
}

/** Assert live region exists for dynamic content */
export function expectLiveRegion(container: HTMLElement, politeness: "polite" | "assertive" = "polite") {
  const liveRegions = container.querySelectorAll(`[aria-live="${politeness}"]`);
  expect(liveRegions.length).toBeGreaterThan(0);
}

/** Assert heading hierarchy is valid (no skipped levels) */
export function expectValidHeadingHierarchy(container: HTMLElement) {
  const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
  let lastLevel = 0;
  const issues: string[] = [];

  headings.forEach((h) => {
    const level = parseInt(h.tagName.charAt(1));
    if (lastLevel > 0 && level > lastLevel + 1) {
      issues.push(`Skipped from h${lastLevel} to h${level}: "${h.textContent?.trim()}"`);
    }
    lastLevel = level;
  });

  expect(issues).toEqual([]);
}

/** Assert no duplicate IDs in container */
export function expectUniqueIds(container: HTMLElement) {
  const allIds = container.querySelectorAll("[id]");
  const idMap = new Map<string, number>();

  allIds.forEach((el) => {
    const id = el.id;
    idMap.set(id, (idMap.get(id) || 0) + 1);
  });

  const duplicates = Array.from(idMap.entries()).filter(([, count]) => count > 1);
  expect(duplicates).toEqual([]);
}

/** Assert images have alt text */
export function expectImagesHaveAlt(container: HTMLElement) {
  const images = container.querySelectorAll("img");
  const missing: string[] = [];

  images.forEach((img) => {
    if (!img.hasAttribute("alt")) {
      missing.push(img.src || "unknown");
    }
  });

  expect(missing).toEqual([]);
}

/** Assert form inputs have associated labels */
export function expectInputsLabelled(container: HTMLElement) {
  const inputs = container.querySelectorAll("input, select, textarea");
  const unlabelled: string[] = [];

  inputs.forEach((input) => {
    const hasAriaLabel = input.hasAttribute("aria-label") || input.hasAttribute("aria-labelledby");
    const hasId = input.id;
    const hasAssociatedLabel = hasId && container.querySelector(`label[for="${hasId}"]`);
    const isWithinLabel = input.closest("label") !== null;
    const hasPlaceholder = input.hasAttribute("placeholder");
    const hasTitle = input.hasAttribute("title");
    const isHidden = input.getAttribute("type") === "hidden";

    if (!isHidden && !hasAriaLabel && !hasAssociatedLabel && !isWithinLabel && !hasPlaceholder && !hasTitle) {
      unlabelled.push(`${input.tagName.toLowerCase()}${hasId ? `#${hasId}` : ""}`);
    }
  });

  expect(unlabelled).toEqual([]);
}

// ── Keyboard simulation ─────────────────────────────────────────

export function pressKey(el: HTMLElement, key: string, options: Partial<KeyboardEventInit> = {}) {
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...options }));
  el.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true, ...options }));
}

export function pressTab(el: HTMLElement, shift = false) {
  pressKey(el, "Tab", { shiftKey: shift });
}

export function pressEnter(el: HTMLElement) {
  pressKey(el, "Enter");
}

export function pressEscape(el: HTMLElement) {
  pressKey(el, "Escape");
}

export function pressSpace(el: HTMLElement) {
  pressKey(el, " ");
}

export function pressArrowDown(el: HTMLElement) {
  pressKey(el, "ArrowDown");
}

export function pressArrowUp(el: HTMLElement) {
  pressKey(el, "ArrowUp");
}

// ── Color contrast helpers ──────────────────────────────────────

/** Check if disabled elements have reduced opacity class */
export function expectDisabledOpacity(el: HTMLElement) {
  expect(el.className).toContain("disabled:opacity");
}

// ── Mock providers ──────────────────────────────────────────────

export function createMockAuthContext() {
  return {
    user: null,
    loading: false,
    signOut: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
  };
}

export function createMockRouterContext() {
  return {
    navigate: vi.fn(),
    location: { pathname: "/" },
  };
}
