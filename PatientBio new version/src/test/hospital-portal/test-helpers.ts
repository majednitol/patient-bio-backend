import { vi } from "vitest";

export const portalRoleMap: Record<string, string[]> = {
  patient: ["user"],
  doctor: ["doctor", "doctor_staff"],
  hospital: ["hospital_admin"],
  pathologist: ["pathologist"],
  researcher: ["researcher"],
  admin: ["admin"],
};

export const getPortalNameFromRole = (role: string): string => {
  const map: Record<string, string> = {
    user: "Patient",
    doctor: "Doctor",
    hospital_admin: "Hospital",
  };
  return map[role] || "Unknown";
};

export const mockUser = { id: "test-hospital-user-1", email: "admin@hospital.com" };

export const mockHospital = {
  id: "hospital-1",
  name: "Test Hospital",
  type: "hospital",
  city: "Test City",
  phone: "+1234567890",
  email: "info@testhospital.com",
  address: "123 Test St",
  description: "A test hospital",
  logo_url: "https://example.com/logo.png",
  website: "https://testhospital.com",
  is_active: true,
  created_by: "test-hospital-user-1",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
