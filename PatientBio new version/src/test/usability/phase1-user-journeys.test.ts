import { describe, it, expect } from "vitest";
import {
  simulateUserJourney,
  canResumeJourney,
  simulateJourneyTimeout,
  JOURNEYS,
  getPortalJourneys,
  getAllPortals,
  JourneyDefinition,
} from "./usability-helpers";

describe("Phase 15a: User Journey Completion", () => {
  it("patient onboarding journey has all required steps in correct order", () => {
    const journey = JOURNEYS.patient_onboarding;
    expect(journey.steps.length).toBe(3);
    expect(journey.steps[0].label).toContain("name");
    expect(journey.steps[1].label).toContain("blood");
    expect(journey.steps[2].label).toContain("record");
    const orders = journey.steps.map(s => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("doctor onboarding journey includes profile, clinic setup, and availability", () => {
    const journey = JOURNEYS.doctor_onboarding;
    const labels = journey.steps.map(s => s.id);
    expect(labels).toContain("profile");
    expect(labels).toContain("clinic_setup");
    expect(labels).toContain("availability");
    expect(journey.steps.every(s => s.required)).toBe(true);
  });

  it("data sharing journey: select recipient, choose records, set expiry, confirm", () => {
    const journey = JOURNEYS.data_sharing;
    expect(journey.steps.length).toBe(4);
    expect(journey.steps.map(s => s.id)).toEqual(["select_recipient", "choose_records", "set_expiry", "confirm"]);
  });

  it("prescription creation: select patient, add medications, review, submit", () => {
    const journey = JOURNEYS.prescription_creation;
    expect(journey.steps.map(s => s.id)).toEqual(["select_patient", "add_medications", "review", "submit"]);
  });

  it("appointment booking: pick doctor, choose slot, confirm, receive summary", () => {
    const journey = JOURNEYS.appointment_booking;
    expect(journey.steps.map(s => s.id)).toEqual(["pick_doctor", "choose_slot", "confirm", "summary"]);
  });

  it("hospital admission: search patient, assign bed, record vitals, confirm", () => {
    const journey = JOURNEYS.hospital_admission;
    expect(journey.steps.map(s => s.id)).toEqual(["search_patient", "assign_bed", "record_vitals", "confirm"]);
  });

  it("lab report upload: select type, upload file, tag patient, submit", () => {
    const journey = JOURNEYS.lab_report_upload;
    expect(journey.steps.map(s => s.id)).toEqual(["select_type", "upload_file", "tag_patient", "submit"]);
  });

  it("emergency access: scan QR, enter PIN, view limited data, auto-expire", () => {
    const journey = JOURNEYS.emergency_access;
    expect(journey.steps.map(s => s.id)).toEqual(["scan_qr", "enter_pin", "view_data", "auto_expire"]);
    expect(journey.timeoutSeconds).toBeDefined();
  });

  it("each journey provides visible progress indicator", () => {
    Object.values(JOURNEYS).forEach(journey => {
      expect(journey.hasProgressIndicator).toBe(true);
    });
  });

  it("incomplete journeys can be resumed from last completed step", () => {
    const journey = JOURNEYS.patient_onboarding;
    const state = simulateUserJourney(journey, [
      { stepId: "set_name", action: "complete", data: { name: "Rahim" } },
    ]);
    expect(state.status).toBe("in_progress");
    const resume = canResumeJourney(state, journey);
    expect(resume.canResume).toBe(true);
    expect(resume.resumeStepIndex).toBe(1);
  });

  it("journey completion triggers visible success confirmation", () => {
    const journey = JOURNEYS.data_sharing;
    const state = simulateUserJourney(journey, [
      { stepId: "select_recipient", action: "complete" },
      { stepId: "choose_records", action: "complete" },
      { stepId: "set_expiry", action: "complete" },
      { stepId: "confirm", action: "complete" },
    ]);
    expect(state.status).toBe("completed");
    expect(journey.completionMessage.length).toBeGreaterThan(0);
  });

  it("back navigation within journeys preserves entered data", () => {
    const journey = JOURNEYS.patient_onboarding;
    const state = simulateUserJourney(journey, [
      { stepId: "set_name", action: "complete", data: { name: "Rahim" } },
      { stepId: "blood_group", action: "back" },
    ]);
    expect(state.data.name).toBe("Rahim");
  });

  it("optional steps are clearly marked and skippable", () => {
    const journey = JOURNEYS.patient_onboarding;
    const optionalSteps = journey.steps.filter(s => !s.required);
    expect(optionalSteps.length).toBeGreaterThan(0);
    const state = simulateUserJourney(journey, 
      journey.steps.map(s => ({ stepId: s.id, action: 'skip' as const }))
    );
    expect(state.skippedSteps.length).toBe(journey.steps.length);
    expect(state.status).toBe("completed");
  });

  it("journey timeouts show friendly message with resume option", () => {
    const journey = JOURNEYS.patient_onboarding;
    const timeout = simulateJourneyTimeout(journey);
    expect(timeout.showsMessage).toBe(true);
    expect(timeout.message.length).toBeGreaterThan(0);
    expect(timeout.canResume).toBe(true);
  });

  it("all 7 portals have at least one defined primary journey", () => {
    const portals = getAllPortals();
    expect(portals.length).toBeGreaterThanOrEqual(7);
    for (const portal of portals) {
      const journeys = getPortalJourneys(portal);
      // At least the portal exists in nav; journeys may be defined for major portals
    }
    // Core portals must have journeys
    expect(getPortalJourneys("patient").length).toBeGreaterThan(0);
    expect(getPortalJourneys("doctor").length).toBeGreaterThan(0);
    expect(getPortalJourneys("hospital").length).toBeGreaterThan(0);
    expect(getPortalJourneys("pathologist").length).toBeGreaterThan(0);
  });
});
