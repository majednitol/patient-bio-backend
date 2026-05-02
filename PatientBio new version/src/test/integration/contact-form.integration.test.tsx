import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  renderWithRouter,
  resetMockAuth,
  mockSupabaseFrom,
} from "./integration-helpers";
import Contact from "@/components/Contact";

describe("Integration: Contact Form Workflow", () => {
  beforeEach(() => {
    resetMockAuth();
    mockSupabaseFrom.mockClear();
  });

  it("renders contact form with all required fields", () => {
    renderWithRouter(<Contact />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });

  it("renders contact info cards (email, phone, address)", () => {
    renderWithRouter(<Contact />);
    expect(screen.getByText("Email Us")).toBeInTheDocument();
    expect(screen.getByText("Call Us")).toBeInTheDocument();
    expect(screen.getByText("Visit Us")).toBeInTheDocument();
  });

  it("renders Quick Answers FAQ section", () => {
    renderWithRouter(<Contact />);
    expect(screen.getByText("Quick Answers")).toBeInTheDocument();
    expect(screen.getByText("Is it free?")).toBeInTheDocument();
  });

  it("submit button shows Send Message", () => {
    renderWithRouter(<Contact />);
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
  });

  it("allows filling out all form fields", async () => {
    renderWithRouter(<Contact />);
    
    await userEvent.type(screen.getByLabelText("Name"), "Jane Doe");
    await userEvent.type(screen.getByLabelText("Email"), "jane@test.com");
    await userEvent.type(screen.getByLabelText("Subject"), "Data Export");
    await userEvent.type(screen.getByLabelText("Message"), "How do I export my records?");

    expect(screen.getByLabelText("Name")).toHaveValue("Jane Doe");
    expect(screen.getByLabelText("Email")).toHaveValue("jane@test.com");
    expect(screen.getByLabelText("Subject")).toHaveValue("Data Export");
    expect(screen.getByLabelText("Message")).toHaveValue("How do I export my records?");
  });

  it("displays default contact email from mock", () => {
    renderWithRouter(<Contact />);
    expect(screen.getByText("hello@patientbio.app")).toBeInTheDocument();
  });

  it("renders section heading", () => {
    renderWithRouter(<Contact />);
    // "💬 Get In Touch" includes emoji prefix
    expect(screen.getByText(/Get In Touch/)).toBeInTheDocument();
  });

  it("renders 'Send us a message' heading", () => {
    renderWithRouter(<Contact />);
    expect(screen.getByText("Send us a message")).toBeInTheDocument();
  });
});
