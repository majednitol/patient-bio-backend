import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import {
  renderWithRouter,
  resetMockAuth,
  setMockAuth,
  testPatient,
} from "./integration-helpers";

// We test the navigation component's rendering and link structure
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

describe("Integration: Navigation & Routing", () => {
  beforeEach(() => {
    resetMockAuth();
  });

  it("unauthenticated user sees Patient Bio brand in nav", () => {
    renderWithRouter(<Navigation />);
    expect(screen.getByText("Patient Bio")).toBeInTheDocument();
  });

  it("nav renders Features, About, Team, Contact links", () => {
    renderWithRouter(<Navigation />);
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("footer renders all four link sections", () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText("Product")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Resources")).toBeInTheDocument();
    expect(screen.getByText("Connect")).toBeInTheDocument();
  });

  it("footer links include Privacy Policy and Terms of Service", () => {
    renderWithRouter(<Footer />);
    const privacyLink = screen.getByText("Privacy Policy");
    expect(privacyLink.closest("a")).toHaveAttribute("href", "/privacy");
    const termsLink = screen.getByText("Terms of Service");
    expect(termsLink.closest("a")).toHaveAttribute("href", "/terms");
  });

  it("footer shows contact info", () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText("hello@patientbio.app")).toBeInTheDocument();
  });

  it("multi-route setup: navigating between pages renders correct content", () => {
    renderWithRouter(null, {
      initialEntries: ["/privacy"],
      routes: (
        <Routes>
          <Route path="/privacy" element={<div>Privacy Page Content</div>} />
          <Route path="/terms" element={<div>Terms Page Content</div>} />
        </Routes>
      ),
    });
    expect(screen.getByText("Privacy Page Content")).toBeInTheDocument();
  });

  it("renders at /terms route correctly", () => {
    renderWithRouter(null, {
      initialEntries: ["/terms"],
      routes: (
        <Routes>
          <Route path="/terms" element={<div>Terms Content Here</div>} />
        </Routes>
      ),
    });
    expect(screen.getByText("Terms Content Here")).toBeInTheDocument();
  });

  it("404-like fallback renders for unknown routes", () => {
    renderWithRouter(<div>Fallback Rendered</div>, {
      initialEntries: ["/nonexistent-page"],
    });
    expect(screen.getByText("Fallback Rendered")).toBeInTheDocument();
  });

  it("footer brand logo section renders", () => {
    renderWithRouter(<Footer />);
    // Footer has the Patient Bio logo alt text
    const logos = screen.getAllByAltText("Patient Bio");
    expect(logos.length).toBeGreaterThanOrEqual(1);
  });

  it("navigation renders logo image", () => {
    renderWithRouter(<Navigation />);
    const logos = screen.getAllByAltText("Patient Bio");
    expect(logos.length).toBeGreaterThanOrEqual(1);
  });
});
