import { vi } from "vitest";

export const mockUser = { id: "test-researcher-user-1", email: "researcher@university.edu" };

export const mockResearcherProfile = {
  id: "profile-1",
  user_id: "test-researcher-user-1",
  full_name: "Dr. Research Expert",
  email: "researcher@university.edu",
  phone: "+1234567890",
  institution_name: "University Research Center",
  institution_type: "university",
  department: "Biomedical Sciences",
  research_focus: "Genomics",
  license_number: "RES-12345",
  avatar_url: "https://example.com/avatar.png",
  is_verified: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockBroadcastRequest = {
  id: "broadcast-1",
  researcher_id: "test-researcher-user-1",
  disease_category: "diabetes",
  research_purpose: "Study on Type 2 Diabetes",
  status: "active" as const,
  patients_notified: 10,
  patients_approved: 3,
  patients_rejected: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockPatientResearcherShare = {
  id: "share-1",
  patient_id: "patient-1",
  researcher_id: "test-researcher-user-1",
  access_token_id: null,
  disease_category: "diabetes",
  research_purpose: "Research study",
  is_anonymized: true,
  status: "pending" as const,
  shared_at: new Date().toISOString(),
  expires_at: null,
  viewed_at: null,
  completed_at: null,
};

export const mockDoctorResearcherShare = {
  id: "dr-share-1",
  doctor_id: "doctor-1",
  researcher_id: "test-researcher-user-1",
  patient_id: "patient-1",
  prescription_id: null,
  disease_category: "cardiology",
  research_purpose: "Heart study",
  notes: null,
  status: "pending",
  is_anonymized: true,
  shared_at: new Date().toISOString(),
  completed_at: null,
};

export const mockDataAccessRequest = {
  id: "request-1",
  patient_id: "patient-1",
  requester_id: "test-researcher-user-1",
  requester_type: "researcher" as const,
  disease_category: "diabetes",
  reason: "Research purpose",
  status: "pending" as const,
  requested_at: new Date().toISOString(),
  responded_at: null,
  created_at: new Date().toISOString(),
  broadcast_request_id: "broadcast-1",
  token_offer: 15,
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
