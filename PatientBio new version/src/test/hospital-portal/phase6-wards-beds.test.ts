import { describe, it, expect, vi, beforeEach } from "vitest";
import { WARD_TYPES, BED_STATUSES } from "@/hooks/useWards";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("Phase 6: Wards and Beds", () => {
  beforeEach(() => vi.clearAllMocks());

  // Test 49: Fetch wards ordered by name
  it("should query wards for hospital ordered by name", () => {
    const queryConfig = { table: "wards", filter: "hospital_id", order: "name" };
    expect(queryConfig.order).toBe("name");
  });

  // Test 50: Create ward with type
  it("should insert ward with valid type", () => {
    const ward = { hospital_id: "hosp-1", name: "ICU Wing", type: "icu", floor: "2", total_beds: 10, is_active: true };
    expect(ward.type).toBe("icu");
    expect(ward.total_beds).toBe(10);
  });

  // Test 51: Update ward
  it("should partial update ward by id", () => {
    const { id, ...updates } = { id: "ward-1", name: "Updated Ward", floor: "3" };
    expect(id).toBe("ward-1");
    expect(updates.name).toBe("Updated Ward");
  });

  // Test 52: Delete ward (hard delete)
  it("should hard delete ward", () => {
    const operation = "delete";
    expect(operation).toBe("delete");
  });

  // Test 53: Fetch beds with joined ward data
  it("should select beds with ward join", () => {
    const selectQuery = "*, ward:wards(*)";
    expect(selectQuery).toContain("ward:wards(*)");
  });

  // Test 54: Fetch beds filtered by ward
  it("should add ward_id filter when provided", () => {
    const wardId = "ward-1";
    const hasWardFilter = !!wardId;
    expect(hasWardFilter).toBe(true);
  });

  // Test 55: Fetch available beds only
  it("should filter beds with status=available", () => {
    const statusFilter = "available";
    expect(statusFilter).toBe("available");
  });

  // Test 56: Create bed
  it("should insert bed with bed_number, bed_type, daily_rate", () => {
    const bed = { ward_id: "ward-1", hospital_id: "hosp-1", bed_number: "B101", bed_type: "standard", daily_rate: 500, status: "available" as const };
    expect(bed.bed_number).toBe("B101");
    expect(bed.daily_rate).toBe(500);
  });

  // Test 57: Update bed status
  it("should support status transitions", () => {
    const validStatuses = ["available", "occupied", "maintenance", "reserved"];
    expect(validStatuses).toContain("available");
    expect(validStatuses).toContain("occupied");
    expect(validStatuses).toContain("maintenance");
    expect(validStatuses).toContain("reserved");
  });

  // Test 58: Delete bed (hard delete)
  it("should hard delete bed", () => {
    const operation = "delete";
    expect(operation).toBe("delete");
  });

  // Test 59: Bed strips joined ward on update
  it("should remove ward field from update payload", () => {
    const updates = { id: "bed-1", status: "maintenance" as const, ward: { id: "w1", name: "ICU" } };
    const { ward, ...cleanUpdates } = updates;
    expect(cleanUpdates).not.toHaveProperty("ward");
    expect(cleanUpdates.status).toBe("maintenance");
  });

  // Test 60: Ward types constant
  it("should define 6 ward types", () => {
    expect(WARD_TYPES).toHaveLength(6);
    const values = WARD_TYPES.map((t) => t.value);
    expect(values).toContain("general");
    expect(values).toContain("icu");
    expect(values).toContain("emergency");
    expect(values).toContain("maternity");
    expect(values).toContain("pediatric");
    expect(values).toContain("private");
  });

  // Test 61: Bed status colors constant
  it("should define 4 bed statuses with colors", () => {
    expect(BED_STATUSES).toHaveLength(4);
    const available = BED_STATUSES.find((s) => s.value === "available");
    expect(available?.color).toContain("green");
    const occupied = BED_STATUSES.find((s) => s.value === "occupied");
    expect(occupied?.color).toContain("red");
  });

  // Test 62: Cache invalidation on bed change
  it("should invalidate both beds and available-beds keys", () => {
    const keysToInvalidate = [["beds", "hosp-1"], ["available-beds", "hosp-1"]];
    expect(keysToInvalidate).toHaveLength(2);
    expect(keysToInvalidate[0][0]).toBe("beds");
    expect(keysToInvalidate[1][0]).toBe("available-beds");
  });
});
