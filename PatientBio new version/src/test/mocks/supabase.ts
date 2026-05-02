import { vi } from "vitest";

// Mock user data
export const mockUser = {
  id: "test-user-123",
  email: "test@example.com",
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
};

export const mockSession = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: mockUser,
};

// Mock Supabase auth responses
export const mockAuthSuccess = {
  data: { user: mockUser, session: mockSession },
  error: null,
};

export const mockAuthError = (message: string) => ({
  data: { user: null, session: null },
  error: { message },
});

// Mock health record
export const mockHealthRecord = {
  id: "record-123",
  user_id: mockUser.id,
  title: "Blood Test Results",
  description: "Annual checkup blood work",
  file_url: "user-id/file.pdf",
  file_type: "application/pdf",
  file_size: 1024,
  disease_category: "general",
  category: "lab_result",
  record_date: new Date().toISOString(),
  uploaded_at: new Date().toISOString(),
  provider_name: "Test Hospital",
  notes: null,
};

// Mock access token
export const mockAccessToken = {
  id: "token-123",
  user_id: mockUser.id,
  token: "abc123def456",
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
  accessed_at: null,
  access_count: 0,
  is_revoked: false,
  label: "Dr. Smith",
};

// Create mock Supabase client
export const createMockSupabase = () => {
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
  });

  const mockStorage = {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: "test-path" }, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({ 
        data: { signedUrl: "https://example.com/signed-url" }, 
        error: null 
      }),
    }),
  };

  const mockAuth = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  };

  return {
    from: mockFrom,
    storage: mockStorage,
    auth: mockAuth,
  };
};

// Mock supabase module
export const mockSupabase = createMockSupabase();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));
