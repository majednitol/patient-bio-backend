/**
 * Snapshot Tests: Doctor Portal Components
 * Captures rendered HTML for critical doctor-facing components.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ConsultationTimerBadge } from "@/components/doctor/ConsultationTimerBadge";
import { PatientRiskBadge } from "@/components/doctor/PatientRiskBadge";
import { NoShowRiskBadge } from "@/components/doctor/NoShowRiskBadge";
import type { RiskFlag } from "@/hooks/usePatientRiskFlags";
import type { NoShowRisk } from "@/hooks/useNoShowPrediction";

describe("Doctor Portal Snapshots", () => {
  describe("ConsultationTimerBadge", () => {
    it("renders null when not started", () => {
      const { container } = render(<ConsultationTimerBadge startedAt={null} />);
      expect(container).toMatchSnapshot();
    });

    it("renders completed consultation", () => {
      const { container } = render(
        <ConsultationTimerBadge
          startedAt="2025-01-15T10:00:00Z"
          endedAt="2025-01-15T10:14:30Z"
        />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders with average duration (green phase)", () => {
      const { container } = render(
        <ConsultationTimerBadge
          startedAt={new Date(Date.now() - 5 * 60 * 1000).toISOString()}
          averageDurationMinutes={15}
        />
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe("PatientRiskBadge", () => {
    it("renders null for no flags", () => {
      const { container } = render(
        <PatientRiskBadge flags={[]} highestLevel={null} />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders critical risk", () => {
      const flags: RiskFlag[] = [
        { id: "f1", level: "critical", label: "Drug Allergy", detail: "Penicillin allergy on record", metric: "allergies" },
        { id: "f2", level: "warning", label: "Missed Follow-up", detail: "2 missed appointments", metric: "appointments" },
      ];
      const { container } = render(
        <PatientRiskBadge flags={flags} highestLevel="critical" />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders warning level compact", () => {
      const flags: RiskFlag[] = [
        { id: "f1", level: "warning", label: "Overdue Labs", detail: "Last labs 6 months ago", metric: "labs" },
      ];
      const { container } = render(
        <PatientRiskBadge flags={flags} highestLevel="warning" compact />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders info level expanded", () => {
      const flags: RiskFlag[] = [
        { id: "f1", level: "info", label: "New Patient", detail: "First visit", metric: "visits" },
      ];
      const { container } = render(
        <PatientRiskBadge flags={flags} highestLevel="info" compact={false} />
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe("NoShowRiskBadge", () => {
    it("renders null for low risk", () => {
      const risk: NoShowRisk = { patientId: "p1", riskLevel: "low", riskScore: 10, factors: [] };
      const { container } = render(<NoShowRiskBadge risk={risk} />);
      expect(container).toMatchSnapshot();
    });

    it("renders medium risk", () => {
      const risk: NoShowRisk = {
        patientId: "p1",
        riskLevel: "medium",
        riskScore: 45,
        factors: ["2 past no-shows", "Afternoon slot"],
      };
      const { container } = render(<NoShowRiskBadge risk={risk} />);
      expect(container).toMatchSnapshot();
    });

    it("renders high risk", () => {
      const risk: NoShowRisk = {
        patientId: "p1",
        riskLevel: "high",
        riskScore: 78,
        factors: ["4 past no-shows", "Monday morning", "No phone confirmed"],
      };
      const { container } = render(<NoShowRiskBadge risk={risk} />);
      expect(container).toMatchSnapshot();
    });

    it("renders undefined risk", () => {
      const { container } = render(<NoShowRiskBadge risk={undefined} />);
      expect(container).toMatchSnapshot();
    });
  });
});
