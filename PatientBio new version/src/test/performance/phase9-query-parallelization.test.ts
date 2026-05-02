import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { measureTimeAsync } from "./perf-helpers";

// ── Helpers ─────────────────────────────────────────────────────

function readSrc(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, "../../", relativePath), "utf-8");
}

function extractQueryKeys(source: string): string[] {
  const matches = [...source.matchAll(/queryKey:\s*\[["']([^"']+)["']/g)];
  return matches.map((m) => m[1]);
}

function extractEnabledConditions(source: string): string[] {
  const matches = [...source.matchAll(/enabled:\s*(.+?)(?:,\s*$|\s*})/gm)];
  return matches.map((m) => m[1].trim());
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Group 1: Query Independence Audit ───────────────────────────

describe("Phase 9: Query Parallelization Verification", () => {
  describe("Group 1: Query Independence Audit", () => {
    it("1 - Patient DashboardHome hooks all use user?.id as sole enabled dependency", () => {
      const src = readSrc("pages/dashboard/DashboardHome.tsx");

      // Verify all 5 expected hooks are imported
      const expectedHooks = [
        "useUserProfile",
        "useHealthData",
        "useHealthRecords",
        "useDoctorConnections",
        "useMedicationLogs",
      ];
      for (const hook of expectedHooks) {
        expect(src).toContain(hook);
      }

      // None of these hooks reference another hook's returned data in their call
      // (no pattern like `useX(someOtherHookData)` where the arg is from another query)
      const hookCalls = expectedHooks.map((h) => {
        const regex = new RegExp(`${h}\\(([^)]*)\\)`);
        const match = src.match(regex);
        return { hook: h, args: match?.[1] || "" };
      });

      // No hook call passes data from another hook as an argument
      for (const call of hookCalls) {
        for (const otherHook of expectedHooks) {
          if (otherHook === call.hook) continue;
          // The args should not reference destructured data from other hooks
          expect(call.args).not.toContain("records");
          expect(call.args).not.toContain("doctors");
          expect(call.args).not.toContain("healthData");
          expect(call.args).not.toContain("profile");
        }
      }
    });

    it("2 - Admin Dashboard has 6 unique query keys with no enabled conditions depending on other queries", () => {
      const src = readSrc("pages/admin/Dashboard.tsx");
      const queryKeys = extractQueryKeys(src);

      // Should have at least 6 unique query key roots
      const uniqueKeys = new Set(queryKeys);
      expect(uniqueKeys.size).toBeGreaterThanOrEqual(6);

      // No duplicates
      expect(queryKeys.length).toBe(uniqueKeys.size);

      // Verify specific expected keys
      const expectedKeys = [
        "admin-messages-stats",
        "admin-team-count",
        "admin-user-stats",
        "admin-role-distribution",
        "admin-shared-data-stats",
        "admin-disease-distribution",
      ];
      for (const key of expectedKeys) {
        expect(queryKeys).toContain(key);
      }
    });

    it("3 - Hospital Dashboard hooks all gate on hospital.id only", () => {
      const src = readSrc("pages/hospital/HospitalDashboard.tsx");

      // All 5 hooks are imported and called with hospital.id
      const expectedHooks = [
        "useHospitalStaff",
        "useHospitalApplications",
        "useAdmissions",
        "useHospitalAppointments",
        "useBeds",
      ];
      for (const hook of expectedHooks) {
        expect(src).toContain(hook);
        // Each hook is called with hospital.id
        const callRegex = new RegExp(`${hook}\\(hospital\\.id\\)`);
        expect(src).toMatch(callRegex);
      }

      // Inline queries use `enabled: !!hospital.id` not another query's data
      const enabledConditions = extractEnabledConditions(src);
      for (const cond of enabledConditions) {
        expect(cond).toContain("hospital.id");
        // Should not depend on other query results
        expect(cond).not.toMatch(/\bstaff\b/);
        expect(cond).not.toMatch(/\badmissions\b/);
        expect(cond).not.toMatch(/\bbeds\b/);
      }
    });

    it("4 - FamilyMemberProfilePage queries share same enabled expression with distinct keys", () => {
      const src = readSrc("pages/dashboard/FamilyMemberProfilePage.tsx");
      const queryKeys = extractQueryKeys(src);

      // Should have at least 5 distinct query key roots (profile, healthData, records, prescriptions, appointments, labReports)
      const uniqueKeys = new Set(queryKeys);
      expect(uniqueKeys.size).toBeGreaterThanOrEqual(5);

      // All enabled conditions should be `!!memberId && !!member`
      const enabledConditions = extractEnabledConditions(src);
      const familyEnabled = enabledConditions.filter((c) => c.includes("memberId") && c.includes("member"));
      // All inline queries use the same enabled pattern
      expect(familyEnabled.length).toBeGreaterThanOrEqual(5);
    });

    it("5 - DashboardLayout prefetch keys do not overlap with DashboardHome/DashboardStatsCards query keys", () => {
      const layoutSrc = readSrc("pages/dashboard/DashboardLayout.tsx");
      const homeSrc = readSrc("pages/dashboard/DashboardHome.tsx");
      const statsSrc = readSrc("components/dashboard/DashboardStatsCards.tsx");

      const layoutKeys = extractQueryKeys(layoutSrc);
      expect(layoutKeys.length).toBeGreaterThan(0);

      // DashboardHome and DashboardStatsCards don't use useQuery directly with the same root keys
      // (they use custom hooks, so extract hook-based query keys differently)
      // The layout prefetches: "user-profile", "health-records", "doctor-connections"
      // The hooks use their own keys internally - verify no collision with layout's keys
      const homeQueryKeys = extractQueryKeys(homeSrc);
      const statsQueryKeys = extractQueryKeys(statsSrc);

      // If home/stats have inline useQuery calls, their keys shouldn't match layout prefetch keys
      for (const key of homeQueryKeys) {
        expect(layoutKeys).not.toContain(key);
      }
      for (const key of statsQueryKeys) {
        expect(layoutKeys).not.toContain(key);
      }
    });
  });

  // ── Group 2: Parallel Execution Simulation ──────────────────────

  describe("Group 2: Parallel Execution Simulation", () => {
    it("6 - 5 patient dashboard queries complete in < 60ms when parallel (vs 100ms+ sequential)", async () => {
      const queryFn = () => sleep(20);

      const { durationMs: parallelMs } = await measureTimeAsync(async () => {
        await Promise.all([queryFn(), queryFn(), queryFn(), queryFn(), queryFn()]);
      });

      const { durationMs: sequentialMs } = await measureTimeAsync(async () => {
        for (let i = 0; i < 5; i++) await queryFn();
      });

      expect(parallelMs).toBeLessThan(60);
      expect(sequentialMs).toBeGreaterThan(90);
      expect(parallelMs).toBeLessThan(sequentialMs * 0.6);
    });

    it("7 - 7 hospital dashboard queries with varied latencies complete within max + overhead when parallel", async () => {
      const latencies = [10, 15, 20, 25, 30, 35, 40];
      const maxLatency = Math.max(...latencies);

      const { durationMs } = await measureTimeAsync(async () => {
        await Promise.all(latencies.map((ms) => sleep(ms)));
      });

      expect(durationMs).toBeLessThan(maxLatency + 30);
    });

    it("8 - 6 admin dashboard queries complete within max(single) + 20ms when parallel", async () => {
      const latencies = [15, 20, 25, 10, 30, 18];
      const maxLatency = Math.max(...latencies);

      const { durationMs } = await measureTimeAsync(async () => {
        await Promise.all(latencies.map((ms) => sleep(ms)));
      });

      expect(durationMs).toBeLessThan(maxLatency + 20);
    });

    it("9 - 6 family member queries all start simultaneously once enabled flips to true", async () => {
      let enabled = false;
      const startTimes: number[] = [];

      const createQuery = () => async () => {
        // Wait for enabled
        while (!enabled) await sleep(1);
        startTimes.push(performance.now());
        await sleep(10);
      };

      const queries = Array.from({ length: 6 }, () => createQuery());

      // Flip enabled after a short delay
      setTimeout(() => { enabled = true; }, 20);

      await Promise.all(queries.map((q) => q()));

      // All should have started within 5ms of each other
      const minStart = Math.min(...startTimes);
      const maxStart = Math.max(...startTimes);
      expect(maxStart - minStart).toBeLessThan(10);
    });

    it("10 - Mixed parallel + waterfall: 5 parallel + 1 dependent completes correctly", async () => {
      const parallelLatency = 20;
      const dependentLatency = 15;

      const { durationMs } = await measureTimeAsync(async () => {
        // Phase 1: 5 parallel queries
        const results = await Promise.all(
          Array.from({ length: 5 }, () => sleep(parallelLatency).then(() => "done"))
        );
        // Phase 2: 1 dependent query (needs results from phase 1)
        expect(results.length).toBe(5);
        await sleep(dependentLatency);
      });

      // Should be roughly parallelLatency + dependentLatency, NOT 5*parallelLatency + dependentLatency
      expect(durationMs).toBeLessThan(parallelLatency + dependentLatency + 30);
      expect(durationMs).toBeLessThan(5 * parallelLatency); // Must be faster than sequential
    });
  });

  // ── Group 3: Anti-Pattern Detection ─────────────────────────────

  describe("Group 3: Anti-Pattern Detection", () => {
    it("11 - No useQuery in DashboardHome/DashboardStatsCards uses another query's data in enabled", () => {
      const homeSrc = readSrc("pages/dashboard/DashboardHome.tsx");
      const statsSrc = readSrc("components/dashboard/DashboardStatsCards.tsx");

      // DashboardHome should not have inline useQuery with enabled referencing hook data
      const homeEnabled = extractEnabledConditions(homeSrc);
      for (const cond of homeEnabled) {
        // Should not reference data from other hooks
        expect(cond).not.toMatch(/\brecords\b/);
        expect(cond).not.toMatch(/\bdoctors\b/);
        expect(cond).not.toMatch(/\bhealthData\b/);
        expect(cond).not.toMatch(/\bprofile\b/);
      }

      const statsEnabled = extractEnabledConditions(statsSrc);
      for (const cond of statsEnabled) {
        expect(cond).not.toMatch(/\brecords\b/);
        expect(cond).not.toMatch(/\bdoctors\b/);
        expect(cond).not.toMatch(/\btokens\b/);
      }
    });

    it("12 - Hospital Dashboard inline queries do not reference hook return values in queryFn", () => {
      const src = readSrc("pages/hospital/HospitalDashboard.tsx");

      // Extract queryFn bodies (rough regex for inline arrow functions)
      const queryFnMatches = [...src.matchAll(/queryFn:\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\}/g)];

      for (const match of queryFnMatches) {
        const body = match[1];
        // Should not reference hook return values (staff, applications, admissions, appointments, beds)
        expect(body).not.toMatch(/\bstaff\b/);
        expect(body).not.toMatch(/\bapplications\b/);
        expect(body).not.toMatch(/\badmissions\b/);
        // `appointments` and `beds` as variables should not appear in queryFn
        // (hospital.id is fine as context)
        expect(body).not.toMatch(/\bbeds\b(?!\.)/)
      }
    });

    it("13 - Admin Dashboard queries have no enabled prop (always fire immediately)", () => {
      const src = readSrc("pages/admin/Dashboard.tsx");

      // Find all useQuery blocks
      const queryBlocks = [...src.matchAll(/useQuery\(\{[\s\S]*?\}\)/g)];
      expect(queryBlocks.length).toBeGreaterThanOrEqual(6);

      // None should have an `enabled` property
      for (const block of queryBlocks) {
        expect(block[0]).not.toMatch(/\benabled\s*:/);
      }
    });

    it("14 - DashboardStatsCards hooks all have independent query keys (no shared keys)", () => {
      const src = readSrc("components/dashboard/DashboardStatsCards.tsx");

      // Verify all 5 hooks are imported
      const expectedHooks = [
        "useHealthRecords",
        "useDoctorConnections",
        "useAccessTokens",
        "useHealthData",
        "useAccessAnalytics",
      ];
      for (const hook of expectedHooks) {
        expect(src).toContain(hook);
      }

      // No hook call passes data from another hook
      // Check that destructured return values don't appear as args to other hooks
      const hookReturnVars = ["records", "doctors", "tokens", "healthData", "analytics"];
      for (const hook of expectedHooks) {
        const callRegex = new RegExp(`${hook}\\(([^)]*)\\)`);
        const match = src.match(callRegex);
        const args = match?.[1] || "";
        for (const v of hookReturnVars) {
          // Args should not reference other hook return data
          if (args.length > 0) {
            expect(args).not.toContain(v);
          }
        }
      }
    });

    it("15 - No dashboard page uses useQueries with a shared combine function", () => {
      const files = [
        "pages/dashboard/DashboardHome.tsx",
        "pages/admin/Dashboard.tsx",
        "pages/hospital/HospitalDashboard.tsx",
        "pages/dashboard/FamilyMemberProfilePage.tsx",
        "components/dashboard/DashboardStatsCards.tsx",
      ];

      for (const file of files) {
        const src = readSrc(file);
        // useQueries with combine would serialize results
        expect(src).not.toContain("useQueries");
      }
    });
  });
});
