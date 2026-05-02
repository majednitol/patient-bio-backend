import { vi } from "vitest";

// Mock user data
export const mockAdminUser = {
  id: "admin-user-123",
  email: "admin@example.com",
  role: "admin",
};

export const mockDoctorUser = {
  id: "doctor-user-456",
  email: "doctor@example.com",
  role: "doctor",
};

export const mockPatientUser = {
  id: "patient-user-789",
  email: "patient@example.com",
  role: "user",
};

export const mockResearcherUser = {
  id: "researcher-user-101",
  email: "researcher@example.com",
  role: "researcher",
};

export const mockPathologistUser = {
  id: "pathologist-user-202",
  email: "pathologist@example.com",
  role: "pathologist",
};

// Create a fresh mock for supabase.functions.invoke
export function createMockInvoke() {
  return vi.fn();
}

// Helper to set up invoke mock with a specific response
export function mockInvokeResponse(
  mockInvoke: ReturnType<typeof vi.fn>,
  response: { data?: any; error?: any }
) {
  mockInvoke.mockResolvedValueOnce(response);
}

// Helper to set up invoke mock for error
export function mockInvokeError(
  mockInvoke: ReturnType<typeof vi.fn>,
  errorMessage: string
) {
  mockInvoke.mockResolvedValueOnce({
    data: null,
    error: { message: errorMessage },
  });
}

// Assertion helpers
export function expectSuccessResponse(result: any) {
  expect(result.error).toBeNull();
  expect(result.data).toBeDefined();
}

export function expectErrorResponse(result: any, expectedMessage?: string) {
  if (result.error) {
    expect(result.error).toBeDefined();
    if (expectedMessage) {
      expect(result.error.message).toContain(expectedMessage);
    }
  } else if (result.data?.error) {
    expect(result.data.error).toBeDefined();
    if (expectedMessage) {
      expect(result.data.error).toContain(expectedMessage);
    }
  }
}

// Mock Supabase module for edge function client-side tests
export function createEdgeFunctionMock() {
  const mockInvoke = createMockInvoke();

  const mockSupabase = {
    functions: {
      invoke: mockInvoke,
    },
    auth: {
      getUser: vi.fn(),
      getClaims: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        }),
      }),
    },
    rpc: vi.fn(),
  };

  return { mockSupabase, mockInvoke };
}

// Commonly used test data factories
export function createMockAccessToken(overrides: Record<string, any> = {}) {
  return {
    id: "token-123",
    token: "abc123def456",
    user_id: mockPatientUser.id,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    is_revoked: false,
    access_count: 0,
    shared_scopes: { all: true },
    label: "Dr. Smith",
    ...overrides,
  };
}

export function createMockAppointment(overrides: Record<string, any> = {}) {
  return {
    id: "appointment-123",
    doctor_id: mockDoctorUser.id,
    patient_id: mockPatientUser.id,
    appointment_date: "2026-02-20",
    start_time: "10:00",
    end_time: "10:30",
    status: "scheduled",
    reason: "Follow-up consultation",
    ...overrides,
  };
}

export function createMockPrescription(overrides: Record<string, any> = {}) {
  return {
    id: "prescription-123",
    doctor_id: mockDoctorUser.id,
    patient_id: mockPatientUser.id,
    diagnosis: "Viral fever",
    medications: [
      { name: "Paracetamol", dosage: "500mg", frequency: "Twice daily" },
    ],
    general_instructions: "Rest and hydrate",
    ...overrides,
  };
}
