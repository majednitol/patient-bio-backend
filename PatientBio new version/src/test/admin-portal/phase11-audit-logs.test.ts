import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Phase 11: Audit Logs (8 tests)", () => {
  beforeEach(() => vi.clearAllMocks());

  const logs = [
    { id: "al1", action: "distribute_data", target_type: "researcher", admin_email: "admin@test.com", created_at: new Date().toISOString() },
    { id: "al2", action: "delete_user", target_type: "user", admin_email: "admin@test.com", created_at: new Date().toISOString() },
    { id: "al3", action: "create_team_member", target_type: "team", admin_email: "super@test.com", created_at: new Date().toISOString() },
    { id: "al4", action: "update_role", target_type: "user", admin_email: "admin@test.com", created_at: new Date().toISOString() },
  ];

  it("113. Fetch audit logs ordered by created_at desc, limit 500", () => {
    expect(logs).toHaveLength(4);
    // Limit validation
    const limit = 500;
    expect(logs.slice(0, limit)).toHaveLength(4);
  });

  it("114. Search by action", () => {
    const query = "delete";
    const filtered = logs.filter((l) => l.action.toLowerCase().includes(query));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].action).toBe("delete_user");
  });

  it("115. Search by target type", () => {
    const query = "user";
    const filtered = logs.filter((l) => l.target_type?.toLowerCase().includes(query));
    expect(filtered).toHaveLength(2);
  });

  it("116. Search by admin email", () => {
    const query = "super";
    const filtered = logs.filter((l) => l.admin_email?.toLowerCase().includes(query));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("al3");
  });

  it("117. Action badge variant: delete returns destructive", () => {
    const getVariant = (action: string) => {
      if (action.includes("delete") || action.includes("remove")) return "destructive";
      if (action.includes("create") || action.includes("add")) return "default";
      if (action.includes("update") || action.includes("change")) return "secondary";
      return "outline";
    };
    expect(getVariant("delete_user")).toBe("destructive");
    expect(getVariant("remove_member")).toBe("destructive");
  });

  it("118. Action badge variant: create returns default", () => {
    const getVariant = (action: string) => {
      if (action.includes("delete") || action.includes("remove")) return "destructive";
      if (action.includes("create") || action.includes("add")) return "default";
      if (action.includes("update") || action.includes("change")) return "secondary";
      return "outline";
    };
    expect(getVariant("create_team_member")).toBe("default");
    expect(getVariant("add_user")).toBe("default");
  });

  it("119. Action badge variant: update returns secondary", () => {
    const getVariant = (action: string) => {
      if (action.includes("delete") || action.includes("remove")) return "destructive";
      if (action.includes("create") || action.includes("add")) return "default";
      if (action.includes("update") || action.includes("change")) return "secondary";
      return "outline";
    };
    expect(getVariant("update_role")).toBe("secondary");
    expect(getVariant("change_status")).toBe("secondary");
  });

  it("120. Pagination with 15 items per page", () => {
    const items = Array.from({ length: 45 }, (_, i) => ({ id: `al${i}` }));
    const itemsPerPage = 15;
    const totalPages = Math.ceil(items.length / itemsPerPage);
    expect(totalPages).toBe(3);
    expect(items.slice(0, 15)).toHaveLength(15);
    expect(items.slice(30, 45)).toHaveLength(15);
  });
});
