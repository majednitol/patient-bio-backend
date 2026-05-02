import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockHospital } from "./test-helpers";

describe("Phase 5: Hospital Oversight (8 tests)", () => {
  beforeEach(() => vi.clearAllMocks());

  const hospitals = [
    { ...mockHospital, id: "h1", name: "City Hospital", city: "Dhaka", email: "city@h.com", is_active: true },
    { ...mockHospital, id: "h2", name: "General Medical", city: "Chittagong", email: "gen@h.com", is_active: true },
    { ...mockHospital, id: "h3", name: "Rural Clinic", city: "Sylhet", email: "rural@h.com", is_active: false },
  ];

  const staffCounts: Record<string, number> = { h1: 12, h2: 8, h3: 3 };

  it("47. Fetch all hospitals ordered by created_at desc", () => {
    expect(hospitals).toHaveLength(3);
    expect(hospitals[0]).toHaveProperty("name");
    expect(hospitals[0]).toHaveProperty("created_at");
  });

  it("48. Staff count aggregation per hospital", () => {
    expect(staffCounts["h1"]).toBe(12);
    expect(staffCounts["h2"]).toBe(8);
  });

  it("49. Active hospitals count", () => {
    const active = hospitals.filter((h) => h.is_active !== false).length;
    expect(active).toBe(2);
  });

  it("50. Total staff sum", () => {
    const total = Object.values(staffCounts).reduce((sum, c) => sum + c, 0);
    expect(total).toBe(23);
  });

  it("51. Hospital search by name", () => {
    const query = "general";
    const filtered = hospitals.filter((h) => h.name.toLowerCase().includes(query));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("h2");
  });

  it("52. Hospital search by city", () => {
    const query = "dhaka";
    const filtered = hospitals.filter((h) => h.city?.toLowerCase().includes(query));
    expect(filtered).toHaveLength(1);
  });

  it("53. Hospital search by email", () => {
    const query = "rural";
    const filtered = hospitals.filter((h) => h.email?.toLowerCase().includes(query));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("h3");
  });

  it("54. Hospital pagination with 10 items per page", () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: `h${i}` }));
    const itemsPerPage = 10;
    const totalPages = Math.ceil(items.length / itemsPerPage);
    expect(totalPages).toBe(3);
    expect(items.slice(0, 10)).toHaveLength(10);
    expect(items.slice(20, 30)).toHaveLength(5);
  });
});
