import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import {
  renderWithRouter,
  resetMockAuth,
  setMockAuth,
} from "./integration-helpers";
import Index from "@/pages/Index";

// Mock lazy-loaded sections so they render synchronously
vi.mock("@/components/LazySection", () => ({
  default: ({ loader }: { loader: () => Promise<{ default: React.ComponentType }> }) => {
    // Just render a placeholder – we test structure, not lazy loading
    return <div data-testid="lazy-section" />;
  },
}));

describe("Integration: Landing Page Workflow", () => {
  beforeEach(() => {
    resetMockAuth();
  });

  it("renders hero headline and CTA buttons for unauthenticated visitors", () => {
    renderWithRouter(<Index />);
    expect(screen.getByText("Your Health Data.")).toBeInTheDocument();
    expect(screen.getByText("Your Control.")).toBeInTheDocument();
    expect(screen.getByText("Get Started Free")).toBeInTheDocument();
    expect(screen.getByText("Register Your Hospital")).toBeInTheDocument();
  });

  it("Get Started Free links to /auth", () => {
    renderWithRouter(<Index />);
    const link = screen.getByText("Get Started Free").closest("a");
    expect(link).toHaveAttribute("href", "/auth");
  });

  it("Register Your Hospital links to /hospitals/register", () => {
    renderWithRouter(<Index />);
    const link = screen.getByText("Register Your Hospital").closest("a");
    expect(link).toHaveAttribute("href", "/hospitals/register");
  });

  it("renders hero stats from default data", () => {
    renderWithRouter(<Index />);
    expect(screen.getByText("195+")).toBeInTheDocument();
    expect(screen.getByText("Countries")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("Patient Owned")).toBeInTheDocument();
    expect(screen.getByText("24/7")).toBeInTheDocument();
    expect(screen.getByText("Instant Access")).toBeInTheDocument();
  });

  it("shows loading spinner when auth is loading", () => {
    setMockAuth({ loading: true });
    renderWithRouter(<Index />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders navigation with menu items", () => {
    renderWithRouter(<Index />);
    // Nav + Footer both have these links, so use getAllByText
    expect(screen.getAllByText("Features").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("About").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Contact").length).toBeGreaterThanOrEqual(1);
  });

  it("renders footer with product links", () => {
    renderWithRouter(<Index />);
    // Footer has Privacy Policy and Terms of Service links
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
  });

  it("renders footer company section", () => {
    renderWithRouter(<Index />);
    // Footer shows "Company" heading with About, Team, Investors
    expect(screen.getAllByText("About").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Team").length).toBeGreaterThanOrEqual(1);
  });

  it("unauthenticated visitor sees Patient Bio branding", () => {
    renderWithRouter(<Index />);
    // Nav + Footer both show "Patient Bio"
    expect(screen.getAllByText("Patient Bio").length).toBeGreaterThanOrEqual(1);
  });

  it("renders lazy sections as placeholders", () => {
    renderWithRouter(<Index />);
    const lazySections = screen.getAllByTestId("lazy-section");
    // ProblemSolution, Features, About, Contact, CTA = 5 lazy sections
    expect(lazySections.length).toBe(5);
  });
});
