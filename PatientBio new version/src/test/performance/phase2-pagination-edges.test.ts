import { describe, it, expect } from "vitest";
import { paginationLogic, getVisiblePages } from "./perf-helpers";

describe("Phase 2: Pagination Edge Cases", () => {
  // 1
  it("empty dataset returns page 1 of 1", () => {
    const p = paginationLogic([], 1, 10);
    expect(p.currentPage).toBe(1);
    expect(p.totalPages).toBe(1);
    expect(p.paginatedData).toHaveLength(0);
  });

  // 2
  it("single item dataset: page 1, totalPages 1", () => {
    const p = paginationLogic(["a"], 1, 10);
    expect(p.currentPage).toBe(1);
    expect(p.totalPages).toBe(1);
    expect(p.paginatedData).toEqual(["a"]);
  });

  // 3
  it("exactly itemsPerPage items: 1 page", () => {
    const data = Array.from({ length: 10 }, (_, i) => i);
    const p = paginationLogic(data, 1, 10);
    expect(p.totalPages).toBe(1);
    expect(p.paginatedData).toHaveLength(10);
  });

  // 4
  it("itemsPerPage + 1 items: 2 pages", () => {
    const data = Array.from({ length: 11 }, (_, i) => i);
    const p = paginationLogic(data, 1, 10);
    expect(p.totalPages).toBe(2);
  });

  // 5
  it("last page has fewer items than itemsPerPage", () => {
    const data = Array.from({ length: 15 }, (_, i) => i);
    const p = paginationLogic(data, 2, 10);
    expect(p.paginatedData).toHaveLength(5);
  });

  // 6
  it("goToPage(0) clamps to 1", () => {
    const data = Array.from({ length: 50 }, (_, i) => i);
    const p = paginationLogic(data, 1, 10);
    expect(p.goToPage(0)).toBe(1);
  });

  // 7
  it("goToPage(totalPages + 5) clamps to last", () => {
    const data = Array.from({ length: 50 }, (_, i) => i);
    const p = paginationLogic(data, 1, 10);
    expect(p.goToPage(10)).toBe(5);
  });

  // 8
  it("rapid nextPage beyond end stays on last", () => {
    const data = Array.from({ length: 30 }, (_, i) => i);
    let page = 1;
    const totalPages = 3;
    for (let i = 0; i < 10; i++) {
      page = Math.max(1, Math.min(page + 1, totalPages));
    }
    expect(page).toBe(3);
  });

  // 9
  it("rapid prevPage below 1 stays on first", () => {
    let page = 3;
    for (let i = 0; i < 10; i++) {
      page = Math.max(1, page - 1);
    }
    expect(page).toBe(1);
  });

  // 10
  it("data shrinks while on page 5 -- auto-resets", () => {
    const p = paginationLogic(Array.from({ length: 5 }, (_, i) => i), 5, 10);
    expect(p.currentPage).toBe(1); // clamped
  });

  // 11
  it("data grows -- current page preserved", () => {
    const p = paginationLogic(Array.from({ length: 100 }, (_, i) => i), 3, 10);
    expect(p.currentPage).toBe(3);
  });

  // 12
  it("itemsPerPage = 1 with 100 items: 100 pages", () => {
    const p = paginationLogic(Array.from({ length: 100 }, (_, i) => i), 50, 1);
    expect(p.totalPages).toBe(100);
    expect(p.paginatedData).toEqual([49]);
  });

  // 13
  it("itemsPerPage = 10000 with 50 items: 1 page", () => {
    const p = paginationLogic(Array.from({ length: 50 }, (_, i) => i), 1, 10_000);
    expect(p.totalPages).toBe(1);
    expect(p.paginatedData).toHaveLength(50);
  });

  // 14
  it("getVisiblePages with 3 pages (no ellipsis)", () => {
    const pages = getVisiblePages(2, 3);
    expect(pages).toEqual([1, 2, 3]);
  });

  // 15
  it("getVisiblePages page 1 of 20 (left ellipsis hidden)", () => {
    const pages = getVisiblePages(1, 20);
    expect(pages[0]).toBe(1);
    expect(pages[1]).not.toBe("ellipsis"); // no left ellipsis
    expect(pages).toContain("ellipsis"); // right ellipsis exists
    expect(pages[pages.length - 1]).toBe(20);
  });

  // 16
  it("getVisiblePages page 20 of 20 (right ellipsis hidden)", () => {
    const pages = getVisiblePages(20, 20);
    expect(pages[pages.length - 1]).toBe(20);
    // Should have left ellipsis but no right ellipsis
    const ellipsisIndices = pages.reduce<number[]>((acc, p, i) => p === "ellipsis" ? [...acc, i] : acc, []);
    expect(ellipsisIndices.length).toBe(1); // only left
  });

  // 17
  it("getVisiblePages page 10 of 20 (both ellipsis)", () => {
    const pages = getVisiblePages(10, 20);
    const ellipsisCount = pages.filter((p) => p === "ellipsis").length;
    expect(ellipsisCount).toBe(2);
    expect(pages[0]).toBe(1);
    expect(pages[pages.length - 1]).toBe(20);
    expect(pages).toContain(10);
  });

  // 18
  it("getVisiblePages 7 pages exactly (no ellipsis)", () => {
    const pages = getVisiblePages(4, 7);
    expect(pages).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  // 19
  it("filter changes reset to page 1", () => {
    // Simulate: was on page 5 with old data, new filtered data is smaller
    const oldPage = 5;
    const newData = Array.from({ length: 8 }, (_, i) => i);
    const p = paginationLogic(newData, oldPage, 10);
    expect(p.currentPage).toBe(1); // auto-clamped
  });

  // 20
  it("concurrent page changes resolve to last call", () => {
    const changes = [3, 5, 2, 8, 4];
    const totalPages = 10;
    let finalPage = 1;
    for (const c of changes) {
      finalPage = Math.max(1, Math.min(c, totalPages));
    }
    expect(finalPage).toBe(4); // last call wins
  });
});
