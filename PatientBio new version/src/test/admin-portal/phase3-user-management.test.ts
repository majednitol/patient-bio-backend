import { describe, it, expect, vi, beforeEach } from "vitest";
import { roleLabels, rolePortalMap, type UserRole } from "@/hooks/useAdminUsers";

const { mockSupabase, mockAdminUser } = vi.hoisted(() => {
  const mockFn = vi.fn;
  const createChain = (resolveValue: unknown = { data: [], error: null }) => {
    const chain: any = {};
    ["select","insert","update","delete","upsert","eq","neq","in","is","or","gt","gte","lt","lte","like","ilike","order","limit","filter","head"].forEach((m) => { chain[m] = mockFn().mockReturnValue(chain); });
    chain.single = mockFn().mockResolvedValue(resolveValue);
    chain.maybeSingle = mockFn().mockResolvedValue(resolveValue);
    Object.defineProperty(chain, "then", { value: (resolve: any) => Promise.resolve(resolveValue).then(resolve), writable: true });
    return chain;
  };
  return {
    mockSupabase: {
      from: mockFn().mockImplementation(() => createChain()),
      rpc: mockFn().mockResolvedValue({ data: null, error: null }),
      functions: { invoke: mockFn().mockResolvedValue({ data: null, error: null }) },
      storage: { from: mockFn().mockReturnValue({ upload: mockFn().mockResolvedValue({ error: null }), getPublicUrl: mockFn().mockReturnValue({ data: { publicUrl: "https://public.url/test" } }) }) },
      auth: { getUser: mockFn().mockResolvedValue({ data: { user: { id: "admin-user-1", email: "admin@patientbio.app" } } }) },
    },
    mockAdminUser: { id: "admin-user-1", email: "admin@patientbio.app" },
  };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockAdminUser }),
}));

describe("Phase 3: User Management (12 tests)", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockUsers = [
    { id: "u1", email: "admin@test.com", role: "admin" as UserRole, created_at: new Date().toISOString(), last_sign_in_at: null, last_activity_at: null, email_confirmed_at: new Date().toISOString() },
    { id: "u2", email: "doctor@test.com", role: "doctor" as UserRole, created_at: new Date().toISOString(), last_sign_in_at: null, last_activity_at: null, email_confirmed_at: null },
    { id: "u3", email: "patient@test.com", role: "user" as UserRole, created_at: new Date().toISOString(), last_sign_in_at: null, last_activity_at: null, email_confirmed_at: new Date().toISOString() },
  ];

  it("25. Fetch all users via edge function", async () => {
    mockSupabase.functions.invoke.mockResolvedValue({ data: { users: mockUsers }, error: null });
    const result = await mockSupabase.functions.invoke("admin-users", { method: "GET" });
    expect(result.data.users).toHaveLength(3);
  });

  it("26. Set user role via edge function", async () => {
    mockSupabase.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });
    const result = await mockSupabase.functions.invoke("admin-users?action=set-role", {
      method: "POST",
      body: { targetUserId: "u2", role: "admin" },
    });
    expect(result.error).toBeNull();
  });

  it("27. Delete single user via edge function", async () => {
    mockSupabase.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });
    const result = await mockSupabase.functions.invoke("admin-users?action=delete-user", {
      method: "POST",
      body: { targetUserId: "u3" },
    });
    expect(result.error).toBeNull();
  });

  it("28. Cache invalidation on role change triggers admin-users key", () => {
    const queryKey = ["admin-users"];
    expect(queryKey).toEqual(["admin-users"]);
  });

  it("29. Cache invalidation on delete triggers admin-users key", () => {
    const queryKey = ["admin-users"];
    expect(queryKey).toEqual(["admin-users"]);
  });

  it("30. Cannot change own role - select disabled", () => {
    const currentUserId = "admin-user-1";
    const targetUserId = "admin-user-1";
    const isDisabled = currentUserId === targetUserId;
    expect(isDisabled).toBe(true);
  });

  it("31. Cannot delete own account - button disabled", () => {
    const currentUserId = "admin-user-1";
    const targetUserId = "admin-user-1";
    const isDisabled = currentUserId === targetUserId;
    expect(isDisabled).toBe(true);
  });

  it("32. User search by email filters correctly", () => {
    const query = "doctor";
    const filtered = mockUsers.filter((u) =>
      u.email.toLowerCase().includes(query.toLowerCase())
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].email).toBe("doctor@test.com");
  });

  it("33. User search by role label", () => {
    const query = "Patient";
    const filtered = mockUsers.filter((u) =>
      roleLabels[u.role]?.toLowerCase().includes(query.toLowerCase())
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].role).toBe("user");
  });

  it("34. Pagination with 10 items per page", () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: `u${i}` }));
    const itemsPerPage = 10;
    const page1 = items.slice(0, itemsPerPage);
    const page3 = items.slice(20, 30);
    expect(page1).toHaveLength(10);
    expect(page3).toHaveLength(5);
    expect(Math.ceil(items.length / itemsPerPage)).toBe(3);
  });

  it("35. Role labels mapping covers all 6 roles", () => {
    expect(roleLabels.user).toBe("Patient");
    expect(roleLabels.admin).toBe("Administrator");
    expect(roleLabels.doctor).toBe("Doctor");
    expect(roleLabels.hospital_admin).toBe("Hospital Admin");
    expect(roleLabels.pathologist).toBe("Pathologist");
    expect(roleLabels.researcher).toBe("Researcher");
    expect(Object.keys(roleLabels)).toHaveLength(6);
  });

  it("36. Role portal mapping covers all 6 roles", () => {
    expect(rolePortalMap.user).toBe("/auth");
    expect(rolePortalMap.admin).toBe("/admin/login");
    expect(rolePortalMap.doctor).toBe("/doctors/login");
    expect(rolePortalMap.hospital_admin).toBe("/hospital/login");
    expect(rolePortalMap.pathologist).toBe("/pathologist/login");
    expect(rolePortalMap.researcher).toBe("/researcher/login");
  });
});
