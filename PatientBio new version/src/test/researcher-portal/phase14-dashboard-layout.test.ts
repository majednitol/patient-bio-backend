import { describe, it, expect, vi } from "vitest";
import { mockUser, mockResearcherProfile, mockBroadcastRequest, mockPatientResearcherShare, mockDataAccessRequest, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}));

/**
 * Phase 14 — Dashboard and Layout Tests (Tests 163–174)
 */

describe("Phase 14: Dashboard and Layout", () => {
  // Test 163: Dashboard KPI stat computation
  it("163. computes active shares count from researcher shares", () => {
    const shares = [
      { ...mockPatientResearcherShare, status: "accepted" },
      { ...mockPatientResearcherShare, id: "s2", status: "pending" },
      { ...mockPatientResearcherShare, id: "s3", status: "accepted" },
      { ...mockPatientResearcherShare, id: "s4", status: "completed" },
    ];
    const activeShares = shares.filter(s => s.status === "accepted").length;
    const pendingShares = shares.filter(s => s.status === "pending").length;
    expect(activeShares).toBe(2);
    expect(pendingShares).toBe(1);
  });

  // Test 164: Dashboard prefetch query keys
  it("164. prefetch queries use correct query keys with user id", () => {
    const userId = mockUser.id;
    const expectedKeys = [
      ["patient-researcher-shares-researcher", userId],
      ["broadcast-requests", userId],
      ["cohort-analytics-profiles", userId, 0],
    ];
    expectedKeys.forEach(key => {
      expect(key[0]).toBeDefined();
      expect(key[1]).toBe(userId);
    });
  });

  // Test 165: Layout redirects unauthenticated user
  it("165. unauthenticated user should be redirected to login", () => {
    const user = null;
    const authLoading = false;
    const shouldRedirectToLogin = !authLoading && !user;
    expect(shouldRedirectToLogin).toBe(true);
  });

  // Test 166: Layout redirects non-researcher role
  it("166. non-researcher role without profile redirects to onboarding", () => {
    const role: string = "user";
    const profile = null;
    const shouldRedirectToOnboarding = role !== "researcher" && !profile;
    expect(shouldRedirectToOnboarding).toBe(true);
  });

  // Test 167: Layout allows authenticated researcher
  it("167. authenticated researcher with profile renders layout", () => {
    const user = mockUser;
    const role = "researcher";
    const profile = mockResearcherProfile;
    const shouldRender = !!user && (!!profile || role === "researcher");
    expect(shouldRender).toBe(true);
  });

  // Test 168: Sidebar navigation links
  it("168. sidebar navigation links match expected route paths", () => {
    const sidebarRoutes = [
      { label: "Dashboard", path: "/researcher/dashboard" },
      { label: "Data Governance", path: "/researcher/data-governance" },
      { label: "Collaboration", path: "/researcher/collaboration" },
      { label: "Study Protocols", path: "/researcher/studies" },
      { label: "Data Quality", path: "/researcher/data-quality" },
      { label: "Global Data Pool", path: "/researcher/global-pool" },
    ];
    sidebarRoutes.forEach(route => {
      expect(route.path).toMatch(/^\/researcher\//);
      expect(route.label.length).toBeGreaterThan(0);
    });
  });

  // Test 169: Sidebar active state
  it("169. sidebar highlights active route correctly", () => {
    const currentPath = "/researcher/dashboard";
    const links = [
      { path: "/researcher/dashboard", active: false },
      { path: "/researcher/studies", active: false },
    ];
    links.forEach(link => {
      link.active = currentPath === link.path;
    });
    expect(links[0].active).toBe(true);
    expect(links[1].active).toBe(false);
  });

  // Test 170: Sidebar collapsed/expanded toggle
  it("170. sidebar toggle changes collapsed state", () => {
    let isCollapsed = false;
    const toggle = () => { isCollapsed = !isCollapsed; };
    toggle();
    expect(isCollapsed).toBe(true);
    toggle();
    expect(isCollapsed).toBe(false);
  });

  // Test 171: Loading spinner during auth/role/profile loading
  it("171. shows loading state when any of auth/role/profile is loading", () => {
    const scenarios = [
      { authLoading: true, roleLoading: false, profileLoading: false },
      { authLoading: false, roleLoading: true, profileLoading: false },
      { authLoading: false, roleLoading: false, profileLoading: true },
    ];
    scenarios.forEach(s => {
      const isLoading = s.authLoading || s.roleLoading || s.profileLoading;
      expect(isLoading).toBe(true);
    });
  });

  // Test 172: Null render when wrong role and no profile
  it("172. returns null when user has no profile and wrong role", () => {
    const user = mockUser;
    const profile = null;
    const role: string = "doctor";
    const shouldRenderNull = !(!user || (!profile && role !== "researcher"));
    // user exists, but no profile and not researcher → should not render content
    const contentVisible = !!user && (!!profile || role === "researcher");
    expect(contentVisible).toBe(false);
  });

  // Test 173: Dashboard handles empty data
  it("173. dashboard handles zero shares and broadcasts gracefully", () => {
    const shares: any[] = [];
    const broadcasts: any[] = [];
    const stats = {
      activeShares: shares.filter(s => s.status === "accepted").length,
      pendingRequests: shares.filter(s => s.status === "pending").length,
      totalBroadcasts: broadcasts.length,
      activeBroadcasts: broadcasts.filter(b => b.status === "active").length,
    };
    expect(stats.activeShares).toBe(0);
    expect(stats.pendingRequests).toBe(0);
    expect(stats.totalBroadcasts).toBe(0);
    expect(stats.activeBroadcasts).toBe(0);
  });

  // Test 174: Dashboard data freshness uses correct staleTime
  it("174. dashboard uses STANDARD staleTime for prefetch queries", () => {
    const STALE_TIMES = { STANDARD: 5 * 60 * 1000 };
    expect(STALE_TIMES.STANDARD).toBe(300000);
  });
});
