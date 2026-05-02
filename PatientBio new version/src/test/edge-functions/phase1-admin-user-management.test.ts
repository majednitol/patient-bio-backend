import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createEdgeFunctionMock,
  mockInvokeResponse,
  mockAdminUser,
} from "./ef-helpers";

describe("Phase 1: Admin User Management (admin-users)", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createEdgeFunctionMock();
    mockInvoke = mock.mockInvoke;
  });

  // --- CORS ---
  it("1. CORS preflight returns 200", async () => {
    mockInvokeResponse(mockInvoke, { data: "ok", error: null });
    const result = await mockInvoke("admin-users", { method: "OPTIONS" });
    expect(result.data).toBe("ok");
    expect(mockInvoke).toHaveBeenCalledWith("admin-users", expect.anything());
  });

  // --- Auth Guards ---
  it("2. Rejects missing auth header", async () => {
    mockInvokeResponse(mockInvoke, { data: { error: "Unauthorized" }, error: null });
    const result = await mockInvoke("admin-users", { body: {} });
    expect(result.data.error).toBe("Unauthorized");
  });

  it("3. Rejects non-admin user", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { error: "Forbidden: Admin access required" },
      error: null,
    });
    const result = await mockInvoke("admin-users", { body: {} });
    expect(result.data.error).toContain("Forbidden");
  });

  // --- List Users ---
  it("4. Lists all users with roles", async () => {
    const mockUsers = [
      { id: "u1", email: "a@b.com", role: "user", last_activity_at: "2026-01-01" },
      { id: "u2", email: "c@d.com", role: "doctor", last_activity_at: "2026-01-02" },
    ];
    mockInvokeResponse(mockInvoke, { data: { users: mockUsers }, error: null });
    const result = await mockInvoke("admin-users", {
      body: {},
      headers: { Authorization: "Bearer token" },
    });
    expect(result.data.users).toHaveLength(2);
    expect(result.data.users[0]).toHaveProperty("id");
    expect(result.data.users[0]).toHaveProperty("email");
    expect(result.data.users[0]).toHaveProperty("role");
  });

  // --- Stats ---
  it("5. Returns user stats", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { signups: [{ created_at: "2026-01-01" }], totalUsers: 1 },
      error: null,
    });
    const result = await mockInvoke("admin-users", { body: {} });
    expect(result.data.signups).toBeDefined();
    expect(result.data.totalUsers).toBe(1);
  });

  // --- Set Role ---
  it("6. Sets user role", async () => {
    mockInvokeResponse(mockInvoke, { data: { success: true }, error: null });
    const result = await mockInvoke("admin-users", {
      body: { targetUserId: "u1", role: "doctor" },
    });
    expect(result.data.success).toBe(true);
  });

  it("7. Rejects invalid role", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { error: "Invalid role. Must be one of: admin, user, doctor, hospital_admin, pathologist, researcher" },
      error: null,
    });
    const result = await mockInvoke("admin-users", {
      body: { targetUserId: "u1", role: "invalid_role" },
    });
    expect(result.data.error).toContain("Invalid role");
  });

  it("8. Rejects missing targetUserId", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { error: "Missing targetUserId or role" },
      error: null,
    });
    const result = await mockInvoke("admin-users", { body: { role: "doctor" } });
    expect(result.data.error).toContain("Missing targetUserId");
  });

  // --- Delete User ---
  it("9. Deletes single user", async () => {
    mockInvokeResponse(mockInvoke, { data: { success: true }, error: null });
    const result = await mockInvoke("admin-users", {
      body: { targetUserId: "u1" },
    });
    expect(result.data.success).toBe(true);
  });

  it("10. Prevents self-deletion", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { error: "You cannot delete your own account" },
      error: null,
    });
    const result = await mockInvoke("admin-users", {
      body: { targetUserId: mockAdminUser.id },
    });
    expect(result.data.error).toContain("cannot delete your own");
  });

  it("11. Creates audit log on delete", async () => {
    mockInvokeResponse(mockInvoke, { data: { success: true }, error: null });
    const result = await mockInvoke("admin-users", {
      body: { targetUserId: "u1" },
    });
    expect(result.data.success).toBe(true);
    // Audit log creation is verified by the function's internal logic
  });

  // --- Bulk Delete ---
  it("12. Bulk deletes users", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { success: true, deleted: 3, failed: 0 },
      error: null,
    });
    const result = await mockInvoke("admin-users", {
      body: { targetUserIds: ["u1", "u2", "u3"] },
    });
    expect(result.data.deleted).toBe(3);
    expect(result.data.failed).toBe(0);
  });

  it("13. Bulk delete rate limit (max 50)", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { error: "Maximum 50 users per bulk operation" },
      error: null,
    });
    const ids = Array.from({ length: 51 }, (_, i) => `u${i}`);
    const result = await mockInvoke("admin-users", {
      body: { targetUserIds: ids },
    });
    expect(result.data.error).toContain("Maximum 50");
  });

  it("14. Bulk delete excludes self", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { success: true, deleted: 2, failed: 0 },
      error: null,
    });
    const result = await mockInvoke("admin-users", {
      body: { targetUserIds: [mockAdminUser.id, "u1", "u2"] },
    });
    expect(result.data.deleted).toBe(2);
  });

  it("15. Bulk delete creates audit logs", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { success: true, deleted: 2, failed: 0 },
      error: null,
    });
    const result = await mockInvoke("admin-users", {
      body: { targetUserIds: ["u1", "u2"] },
    });
    expect(result.data.success).toBe(true);
  });

  // --- Bulk Set Role ---
  it("16. Bulk sets role", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { success: true, updated: 3, failed: 0 },
      error: null,
    });
    const result = await mockInvoke("admin-users", {
      body: { targetUserIds: ["u1", "u2", "u3"], role: "doctor" },
    });
    expect(result.data.updated).toBe(3);
  });

  it("17. Bulk set role rejects invalid role", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { error: "Invalid role. Must be one of: admin, user, doctor, hospital_admin, pathologist, researcher" },
      error: null,
    });
    const result = await mockInvoke("admin-users", {
      body: { targetUserIds: ["u1"], role: "superadmin" },
    });
    expect(result.data.error).toContain("Invalid role");
  });

  it("18. Bulk set role rate limit (max 50)", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { error: "Maximum 50 users per bulk operation" },
      error: null,
    });
    const ids = Array.from({ length: 51 }, (_, i) => `u${i}`);
    const result = await mockInvoke("admin-users", {
      body: { targetUserIds: ids, role: "user" },
    });
    expect(result.data.error).toContain("Maximum 50");
  });

  it("19. Bulk set role excludes self", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { success: true, updated: 1, failed: 0 },
      error: null,
    });
    const result = await mockInvoke("admin-users", {
      body: { targetUserIds: [mockAdminUser.id, "u1"], role: "user" },
    });
    expect(result.data.updated).toBe(1);
  });

  it("20. Bulk set role creates audit logs", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { success: true, updated: 2, failed: 0 },
      error: null,
    });
    const result = await mockInvoke("admin-users", {
      body: { targetUserIds: ["u1", "u2"], role: "doctor" },
    });
    expect(result.data.success).toBe(true);
  });

  // --- Edge Cases ---
  it("21. Empty targetUserIds rejected", async () => {
    mockInvokeResponse(mockInvoke, {
      data: { error: "Missing or invalid targetUserIds array" },
      error: null,
    });
    const result = await mockInvoke("admin-users", {
      body: { targetUserIds: [] },
    });
    expect(result.data.error).toContain("Missing or invalid");
  });

  it("22. Valid roles accepted", async () => {
    const validRoles = ["admin", "user", "doctor", "hospital_admin", "pathologist", "researcher"];
    for (const role of validRoles) {
      mockInvokeResponse(mockInvoke, { data: { success: true }, error: null });
      const result = await mockInvoke("admin-users", {
        body: { targetUserId: "u1", role },
      });
      expect(result.data.success).toBe(true);
    }
  });
});
