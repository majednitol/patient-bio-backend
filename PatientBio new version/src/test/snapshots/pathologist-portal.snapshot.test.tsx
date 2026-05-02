/**
 * Snapshot Tests: Pathologist Portal Components
 * Captures rendered HTML for critical pathologist-facing components.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CriticalValueAlertBanner, detectCriticalValues } from "@/components/pathologist/CriticalValueAlertBanner";
import type { AbnormalFlag } from "@/components/pathologist/AbnormalFlagEditor";

const flag = (name: string, value: string, unit: string, ref: string, severity: AbnormalFlag["severity"], direction: AbnormalFlag["direction"] = "high"): AbnormalFlag => ({
  name, value, unit, reference_range: ref, severity, direction,
});

describe("Pathologist Portal Snapshots", () => {
  describe("CriticalValueAlertBanner", () => {
    it("renders null when no critical values", () => {
      const flags = [flag("Hemoglobin", "12.5", "g/dL", "12-16", "low")];
      const { container } = render(<CriticalValueAlertBanner flags={flags} />);
      expect(container).toMatchSnapshot();
    });

    it("renders with single critical value", () => {
      const flags = [flag("Hemoglobin", "5.0", "g/dL", "12-16", "high", "low")];
      const { container } = render(<CriticalValueAlertBanner flags={flags} doctorId="doc-1" />);
      expect(container).toMatchSnapshot();
    });

    it("renders with multiple critical values", () => {
      const flags = [
        flag("Potassium", "7.0", "mEq/L", "3.5-5.0", "high"),
        flag("Glucose", "35", "mg/dL", "70-100", "critical", "low"),
        flag("Sodium", "115", "mEq/L", "136-145", "high", "low"),
      ];
      const { container } = render(<CriticalValueAlertBanner flags={flags} doctorId="doc-1" />);
      expect(container).toMatchSnapshot();
    });

    it("renders without doctor (no notify button)", () => {
      const flags = [flag("Potassium", "7.5", "mEq/L", "3.5-5.0", "high")];
      const { container } = render(<CriticalValueAlertBanner flags={flags} />);
      expect(container).toMatchSnapshot();
    });

    it("renders already-notified state", () => {
      const flags = [flag("Troponin", "0.8", "ng/mL", "0-0.04", "critical")];
      const { container } = render(
        <CriticalValueAlertBanner flags={flags} doctorId="doc-1" onNotifyDoctor={async () => {}} notified={true} />
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe("detectCriticalValues (pure function)", () => {
    it("snapshot of detection results for mixed flags", () => {
      const flags = [
        flag("Hemoglobin", "6.5", "g/dL", "12-16", "high", "low"),
        flag("WBC", "8.0", "×10³/µL", "4-11", "low", "normal"),
        flag("Potassium", "6.8", "mEq/L", "3.5-5.0", "critical"),
      ];
      const result = detectCriticalValues(flags);
      expect(result).toMatchSnapshot();
    });
  });
});
