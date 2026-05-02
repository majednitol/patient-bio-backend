/**
 * Snapshot Tests: Researcher Portal Components
 * Captures rendered HTML for critical researcher-facing components.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import DataQualityBadge, { computeQualityScore } from "@/components/researcher/DataQualityBadge";

describe("Researcher Portal Snapshots", () => {
  describe("DataQualityBadge", () => {
    it("renders high quality share", () => {
      const { container } = render(
        <DataQualityBadge
          share={{
            disease_category: "cardiology",
            research_purpose: "Longitudinal heart failure study",
            is_anonymized: true,
            status: "completed",
            viewed_at: "2025-01-15T10:00:00Z",
            completed_at: "2025-01-16T10:00:00Z",
            expires_at: "2026-01-15T10:00:00Z",
          }}
        />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders medium quality share", () => {
      const { container } = render(
        <DataQualityBadge
          share={{
            disease_category: "general",
            research_purpose: "Screening study",
            is_anonymized: false,
            status: "viewed",
            viewed_at: "2025-01-15T10:00:00Z",
            completed_at: null,
            expires_at: "2026-06-01T00:00:00Z",
          }}
        />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders low quality share", () => {
      const { container } = render(
        <DataQualityBadge
          share={{
            disease_category: null,
            research_purpose: null,
            is_anonymized: false,
            status: "pending",
            viewed_at: null,
            completed_at: null,
            expires_at: "2024-01-01T00:00:00Z", // expired
          }}
        />
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe("computeQualityScore (pure function)", () => {
    const mockT = (key: string) => key;

    it("snapshot of high quality computation", () => {
      const result = computeQualityScore({
        disease_category: "oncology",
        research_purpose: "Biomarker study",
        is_anonymized: true,
        status: "completed",
        viewed_at: "2025-01-10T00:00:00Z",
        completed_at: "2025-01-12T00:00:00Z",
        expires_at: "2027-01-01T00:00:00Z",
      }, mockT);
      expect(result).toMatchSnapshot();
    });

    it("snapshot of minimal quality computation", () => {
      const result = computeQualityScore({
        disease_category: null,
        research_purpose: null,
        is_anonymized: false,
        status: "pending",
        viewed_at: null,
        completed_at: null,
        expires_at: "2020-01-01T00:00:00Z",
      }, mockT);
      expect(result).toMatchSnapshot();
    });
  });
});
