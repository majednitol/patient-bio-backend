import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";

// Mock hooks used by the dialogs
vi.mock("@/hooks/useAccessTokens", () => ({
  useAccessTokens: () => ({ createToken: vi.fn(), isCreating: false, tokens: [], revokeToken: vi.fn() }),
}));
vi.mock("@/hooks/usePatientPathologistShares", () => ({
  usePatientPathologistShares: () => ({ createShare: vi.fn(), isCreating: false, shares: [] }),
}));
vi.mock("@/hooks/useSearchPathologists", () => ({ useSearchPathologists: () => ({ data: [], isLoading: false }) }));
vi.mock("@/components/doctor/PathologistDirectoryPicker", () => ({
  PathologistDirectoryPicker: () => <div data-testid="pathologist-picker">Picker</div>,
}));

import ShareWithHospitalDialog from "@/components/dashboard/ShareWithHospitalDialog";
import ShareWithPharmacyDialog from "@/components/dashboard/ShareWithPharmacyDialog";
import ShareWithAdminDialog from "@/components/dashboard/ShareWithAdminDialog";
import ShareWithPathologistDialog from "@/components/dashboard/ShareWithPathologistDialog";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

describe("Share Dialogs - ResponsiveDialog migration", () => {
  it("Hospital dialog opens on button click", () => {
    render(<ShareWithHospitalDialog />, { wrapper });
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(screen.getByText(/hospital name/i)).toBeInTheDocument();
  });

  it("Pharmacy dialog opens on button click", () => {
    render(<ShareWithPharmacyDialog />, { wrapper });
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(screen.getByText(/generate/i)).toBeInTheDocument();
  });

  it("Admin dialog opens on button click", () => {
    render(<ShareWithAdminDialog />, { wrapper });
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(screen.getByText(/purpose/i)).toBeInTheDocument();
  });

  it("Pathologist dialog opens on button click", () => {
    render(<ShareWithPathologistDialog />, { wrapper });
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(screen.getByTestId("pathologist-picker")).toBeInTheDocument();
  });
});
