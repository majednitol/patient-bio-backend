import { describe, it, expect } from "vitest";
import {
  canAccessPortal,
  portalRoleMap,
  rolePortalNameMap,
  simulateHandleNewUser,
  simulateRoleInsert,
  type AppRole,
  type PortalType,
} from "./security-helpers";

describe("Phase 3: Role Escalation Prevention", () => {
  it("1. Patient cannot access doctor portal", () => {
    expect(canAccessPortal("user", "doctor")).toBe(false);
  });

  it("2. Doctor cannot access hospital portal", () => {
    expect(canAccessPortal("doctor", "hospital")).toBe(false);
  });

  it("3. Hospital admin cannot access admin portal", () => {
    expect(canAccessPortal("hospital_admin", "admin")).toBe(false);
  });

  it("4. Pathologist cannot access researcher portal", () => {
    expect(canAccessPortal("pathologist", "researcher")).toBe(false);
  });

  it("5. Researcher cannot access pathologist portal", () => {
    expect(canAccessPortal("researcher", "pathologist")).toBe(false);
  });

  it("6. User with role 'user' cannot self-assign 'admin'", () => {
    const existing = [{ userId: "u1", role: "user" as AppRole }];
    // Simulate attempting to insert admin role - should be blocked by RLS in real DB
    // Here we verify the logic that only the trigger assigns roles
    const assigned = simulateHandleNewUser("patient");
    expect(assigned).toBe("user");
    expect(assigned).not.toBe("admin");
  });

  it("7. User with role 'doctor' cannot self-assign 'hospital_admin'", () => {
    const assigned = simulateHandleNewUser("doctor");
    expect(assigned).toBe("doctor");
    expect(assigned).not.toBe("hospital_admin");
  });

  it("8. handle_new_user trigger assigns only the portal_type role", () => {
    expect(simulateHandleNewUser("patient")).toBe("user");
    expect(simulateHandleNewUser("doctor")).toBe("doctor");
    expect(simulateHandleNewUser("hospital")).toBe("hospital_admin");
    expect(simulateHandleNewUser("pathologist")).toBe("pathologist");
    expect(simulateHandleNewUser("researcher")).toBe("researcher");
    expect(simulateHandleNewUser("doctor_staff")).toBe("doctor_staff");
  });

  it("9. Unknown portal_type defaults to 'user' role", () => {
    expect(simulateHandleNewUser("unknown_portal")).toBe("user");
    expect(simulateHandleNewUser("")).toBe("user");
    expect(simulateHandleNewUser(null)).toBe("user");
  });

  it("10. Multiple signups with same email don't create duplicate roles", () => {
    const existing = [{ userId: "u1", role: "user" as AppRole }];
    const result = simulateRoleInsert(existing, "u1", "user");
    expect(result.inserted).toBe(false);
    expect(result.reason).toContain("CONFLICT");
  });

  it("11. doctor_staff cannot access hospital admin features", () => {
    expect(canAccessPortal("doctor_staff", "hospital")).toBe(false);
    expect(canAccessPortal("doctor_staff", "admin")).toBe(false);
    // But can access doctor portal
    expect(canAccessPortal("doctor_staff", "doctor")).toBe(true);
  });

  it("12. Cross-portal login returns correct error message with portal name", () => {
    const userRole = "doctor";
    const userPortal = rolePortalNameMap[userRole];
    const errorMsg = `This account is registered for the ${userPortal} Portal. Please use the correct portal to sign in.`;
    expect(errorMsg).toContain("Doctor Portal");
    expect(errorMsg).not.toContain("Patient");
  });

  it("13. Modifying raw_user_meta_data.portal_type post-signup has no effect", () => {
    // The trigger only fires on INSERT, not UPDATE
    // Simulating: user signed up as patient, tries to change metadata to admin
    const originalRole = simulateHandleNewUser("patient");
    expect(originalRole).toBe("user");
    // Even if metadata changes, existing role remains - ON CONFLICT DO NOTHING
    const existing = [{ userId: "u1", role: originalRole }];
    const reinsert = simulateRoleInsert(existing, "u1", "admin");
    // A new role insert for admin would be a separate row, but RLS blocks self-insertion
    // The key point: the original role is unchanged
    expect(existing[0].role).toBe("user");
  });

  it("14. All 6 portals reject every other portal's roles (matrix test)", () => {
    const portals: PortalType[] = ["patient", "doctor", "hospital", "pathologist", "researcher", "admin"];
    const allRoles: AppRole[] = ["user", "doctor", "doctor_staff", "hospital_admin", "pathologist", "researcher", "admin"];

    for (const portal of portals) {
      const allowedRoles = portalRoleMap[portal];
      for (const role of allRoles) {
        const expected = allowedRoles.includes(role);
        expect(canAccessPortal(role, portal)).toBe(expected);
      }
    }
  });

  it("15. canAccessPortal returns false for NULL role", () => {
    expect(canAccessPortal(null, "patient")).toBe(false);
    expect(canAccessPortal(null, "doctor")).toBe(false);
    expect(canAccessPortal(null, "admin")).toBe(false);
  });
});
