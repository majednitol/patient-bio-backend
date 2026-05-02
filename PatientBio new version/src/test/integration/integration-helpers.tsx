import { ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import enTranslations from "@/locales/en.json";

// ── Mock react-i18next ───────────────────────────────────────────────────────

function getNestedValue(obj: Record<string, any>, path: string): string {
  const keys = path.split(".");
  let current: any = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return path;
    current = current[key];
  }
  return typeof current === "string" ? current : path;
}

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => getNestedValue(enTranslations, key) || fallback || key,
    i18n: {
      language: "en",
      changeLanguage: vi.fn().mockResolvedValue(undefined),
    },
  }),
  Trans: ({ children }: { children: ReactNode }) => <>{children}</>,
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

// ── Mock Auth Context ────────────────────────────────────────────────────────

export interface MockUser {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
}

export interface MockAuthState {
  user: MockUser | null;
  session: { access_token: string; user: MockUser } | null;
  loading: boolean;
}

const defaultAuthState: MockAuthState = {
  user: null,
  session: null,
  loading: false,
};

export const mockSignIn = vi.fn().mockResolvedValue({ error: null });
export const mockSignUp = vi.fn().mockResolvedValue({ error: null, session: null });
export const mockSignOut = vi.fn().mockResolvedValue(undefined);
export const mockResetPassword = vi.fn().mockResolvedValue({ error: null });
export const mockUpdatePassword = vi.fn().mockResolvedValue({ error: null });

// We mock the AuthContext module so real components pick it up
vi.mock("@/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: () => currentAuthState,
}));

// Mutable auth state that tests can override
let currentAuthState: MockAuthState & {
  signIn: typeof mockSignIn;
  signUp: typeof mockSignUp;
  signOut: typeof mockSignOut;
  resetPassword: typeof mockResetPassword;
  updatePassword: typeof mockUpdatePassword;
} = {
  ...defaultAuthState,
  signIn: mockSignIn,
  signUp: mockSignUp,
  signOut: mockSignOut,
  resetPassword: mockResetPassword,
  updatePassword: mockUpdatePassword,
};

export function setMockAuth(overrides: Partial<MockAuthState>) {
  currentAuthState = {
    ...currentAuthState,
    ...overrides,
  };
}

export function resetMockAuth() {
  currentAuthState = {
    ...defaultAuthState,
    signIn: mockSignIn,
    signUp: mockSignUp,
    signOut: mockSignOut,
    resetPassword: mockResetPassword,
    updatePassword: mockUpdatePassword,
  };
  mockSignIn.mockReset().mockResolvedValue({ error: null });
  mockSignUp.mockReset().mockResolvedValue({ error: null, session: null });
  mockSignOut.mockReset().mockResolvedValue(undefined);
  mockResetPassword.mockReset().mockResolvedValue({ error: null });
  mockUpdatePassword.mockReset().mockResolvedValue({ error: null });
}

// ── Mock Supabase Client ─────────────────────────────────────────────────────

export const mockSupabaseFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  then: (resolve: (v: unknown) => void) => Promise.resolve({ data: [], error: null }).then(resolve),
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: "test" }, error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.url" }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://public.url" } }),
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

// Mock external hooks that hit the network
vi.mock("@/hooks/useSiteContent", () => ({
  useSiteContent: (_key: string, fallback: unknown) => ({ data: fallback, isLoading: false }),
  DEFAULT_HERO_STATS: { stats: [{ value: "195+", label: "Countries" }, { value: "100%", label: "Patient Owned" }, { value: "24/7", label: "Instant Access" }] },
  DEFAULT_CONTACT_INFO: { email: "hello@patientbio.app", emailDescription: "24h", phone: "+880", phoneDescription: "9-5", address: "Dhaka", addressDescription: "HQ" },
  DEFAULT_FAQ_CONTENT: { faqs: [{ question: "Is it free?", answer: "Yes" }] },
}));

vi.mock("@/hooks/usePortalAuth", () => ({
  usePortalAuth: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
  }),
}));

vi.mock("@/hooks/useResendVerification", () => ({
  useResendVerification: () => ({
    resendVerificationEmail: vi.fn().mockResolvedValue({ error: null }),
    isResending: false,
    canResend: true,
  }),
}));

vi.mock("@/hooks/useBiometricAuth", () => ({
  useBiometricAuth: () => ({
    isAvailable: false,
    isRegistered: false,
    register: vi.fn(),
    authenticate: vi.fn(),
  }),
  isWebAuthnSupported: () => false,
}));

vi.mock("@/hooks/useRoleBasedRedirect", () => ({
  getRoleBasedRedirectPath: vi.fn().mockResolvedValue("/dashboard"),
}));

vi.mock("@/hooks/useUserRole", () => ({
  useIsAdmin: () => ({ isAdmin: false }),
}));

vi.mock("@/integrations/lovable", () => ({
  lovable: {
    auth: { signInWithOAuth: vi.fn().mockResolvedValue({ error: null }) },
  },
}));

// ── Render Utilities ─────────────────────────────────────────────────────────

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface IntegrationRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialEntries?: string[];
  routes?: ReactNode;
}

/**
 * Renders a component tree inside MemoryRouter + QueryClientProvider.
 * If `routes` is provided, it renders those routes directly. Otherwise wraps children in a catch-all Route.
 */
export function renderWithRouter(
  ui: ReactNode,
  { initialEntries = ["/"], routes, ...options }: IntegrationRenderOptions = {}
) {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {routes ?? (
          <Routes>
            <Route path="*" element={children} />
          </Routes>
        )}
      </MemoryRouter>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}

// ── Predefined Users ─────────────────────────────────────────────────────────

export const testPatient: MockUser = {
  id: "patient-int-1",
  email: "patient@test.com",
  user_metadata: { portal_type: "patient" },
};

export const testDoctor: MockUser = {
  id: "doctor-int-1",
  email: "doctor@test.com",
  user_metadata: { portal_type: "doctor" },
};

export const testAdmin: MockUser = {
  id: "admin-int-1",
  email: "admin@test.com",
  user_metadata: { portal_type: "admin" },
};
