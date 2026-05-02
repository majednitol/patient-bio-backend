import { vi } from "vitest";

export const mockUser = { id: "test-pathologist-user-1", email: "path@lab.com" };

export const mockPathologistProfile = {
  id: "profile-1",
  user_id: "test-pathologist-user-1",
  full_name: "Dr. Lab Expert",
  license_number: "PATH-12345",
  specialization_area: "Hematology",
  total_experience: 10,
  phone: "+1234567890",
  email: "path@lab.com",
  avatar_url: "https://example.com/avatar.png",
  lab_name: "Expert Diagnostics",
  lab_address: "456 Lab Street",
  lab_hours: { monday: { open: "09:00", close: "17:00", closed: false } },
  certifications: "Board Certified Pathologist",
  is_verified: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockReport = {
  id: "report-1",
  pathologist_id: "test-pathologist-user-1",
  patient_id: "patient-1",
  doctor_id: "doctor-1",
  report_type: "blood_test",
  report_name: "CBC Report",
  findings: "Normal values",
  file_url: "test-pathologist-user-1/test.pdf",
  disease_category: "general",
  is_shared_with_doctor: false,
  is_shared_with_patient: false,
  has_abnormal_values: false,
  abnormal_flags: [],
  addenda: [],
  doctor_notified_at: null,
  doctor_viewed_at: null,
  hospital_lab_order_id: null,
  hospital_order: null,
  ai_analysis: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Chainable mock builder for supabase queries
export function createMockSupabase() {
  const chainMethods: Record<string, ReturnType<typeof vi.fn>> = {};

  const createChain = (resolveValue: unknown = { data: [], error: null }) => {
    const chain: any = {};
    const methods = [
      "select", "insert", "update", "delete", "upsert",
      "eq", "neq", "in", "is", "or", "gt", "gte", "lt", "lte", "like", "ilike",
      "order", "limit", "single", "maybeSingle", "filter",
    ];
    methods.forEach((m) => {
      chain[m] = vi.fn().mockReturnValue(chain);
    });
    // Terminal methods resolve
    chain.single = vi.fn().mockResolvedValue(resolveValue);
    chain.maybeSingle = vi.fn().mockResolvedValue(resolveValue);
    chain.then = vi.fn((cb: any) => cb(resolveValue));
    // Make the chain itself thenable
    Object.defineProperty(chain, "then", {
      value: (resolve: any) => Promise.resolve(resolveValue).then(resolve),
      writable: true,
    });
    return chain;
  };

  const fromMock = vi.fn().mockImplementation(() => createChain());
  const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
  const functionsMock = { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) };
  const storageMock = {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.url/test" }, error: null }),
    }),
  };
  const authMock = {
    getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "test-token" } } }),
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };

  return {
    from: fromMock,
    rpc: rpcMock,
    functions: functionsMock,
    storage: storageMock,
    auth: authMock,
    createChain,
  };
}
