import { vi } from "vitest";

export const mockAdminUser = { id: "admin-user-1", email: "admin@patientbio.app" };
export const mockDoctorUser = { id: "doctor-user-1", email: "doctor@hospital.com" };
export const mockPatientUser = { id: "patient-user-1", email: "patient@email.com" };

export const mockTeamMember = {
  id: "tm-1",
  name: "John Doe",
  role: "CTO",
  bio: "Tech lead",
  profile_image_url: "https://example.com/photo.jpg",
  linkedin_url: "https://linkedin.com/in/johndoe",
  twitter_url: null,
  email: "john@example.com",
  github_url: null,
  website_url: null,
  phone: null,
  is_advisor: false,
  display_order: 1,
  gradient: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockVerification = {
  id: "ver-1",
  user_id: "doctor-user-1",
  provider_type: "doctor" as const,
  license_number: "DOC-12345",
  issuing_authority: "Medical Board",
  issuing_country: "US",
  license_expiry_date: "2027-12-31",
  document_url: "doctor-user-1/doc.pdf",
  additional_documents: null,
  status: "pending" as const,
  submitted_at: new Date().toISOString(),
  reviewed_by: null,
  reviewed_at: null,
  rejection_reason: null,
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockComplianceReport = {
  id: "report-1",
  report_type: "hipaa_audit",
  generated_by: "admin-user-1",
  report_period_start: "2026-01-01",
  report_period_end: "2026-01-31",
  report_data: { access_logs_count: 42 },
  file_url: null,
  status: "completed",
  created_at: new Date().toISOString(),
};

export const mockContactMessage = {
  id: "msg-1",
  name: "Jane Smith",
  email: "jane@example.com",
  subject: "Question about data",
  message: "How do I export?",
  status: "new",
  read_at: null,
  created_at: new Date().toISOString(),
};

export const mockDistribution = {
  id: "dist-1",
  admin_id: "admin-user-1",
  recipient_type: "researcher",
  recipient_id: "researcher-1",
  disease_categories: ["diabetes", "cancer"],
  date_range_start: "2026-01-01",
  date_range_end: "2026-01-31",
  purpose: "Research study",
  record_count: 150,
  status: "completed",
  created_at: new Date().toISOString(),
};

export const mockHospital = {
  id: "hosp-1",
  name: "City Hospital",
  city: "Dhaka",
  phone: "+8801234567",
  email: "info@cityhospital.com",
  address: "123 Main St",
  description: "General hospital",
  is_active: true,
  created_at: new Date().toISOString(),
};

// Chainable mock builder for supabase queries
export function createMockSupabase() {
  const createChain = (resolveValue: unknown = { data: [], error: null }) => {
    const chain: any = {};
    const methods = [
      "select", "insert", "update", "delete", "upsert",
      "eq", "neq", "in", "is", "or", "gt", "gte", "lt", "lte", "like", "ilike",
      "order", "limit", "single", "maybeSingle", "filter", "head",
    ];
    methods.forEach((m) => {
      chain[m] = vi.fn().mockReturnValue(chain);
    });
    chain.single = vi.fn().mockResolvedValue(resolveValue);
    chain.maybeSingle = vi.fn().mockResolvedValue(resolveValue);
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
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://public.url/test" } }),
    }),
  };
  const authMock = {
    getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "test-token" } } }),
    getUser: vi.fn().mockResolvedValue({ data: { user: mockAdminUser } }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: mockAdminUser }, error: null }),
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
