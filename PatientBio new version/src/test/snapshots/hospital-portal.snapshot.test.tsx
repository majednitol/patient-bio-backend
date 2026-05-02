/**
 * Snapshot Tests: Hospital Portal Components
 * Captures rendered HTML for critical hospital-facing components.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import PatientIdentityBadge from "@/components/hospital/PatientIdentityBadge";
import { TableSkeleton } from "@/components/admin/TableSkeleton";

describe("Hospital Portal Snapshots", () => {
  describe("PatientIdentityBadge", () => {
    it("renders GHPID verified", () => {
      const { container } = render(
        <PatientIdentityBadge hasGhpid={true} hasPhone={true} />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders phone verified", () => {
      const { container } = render(
        <PatientIdentityBadge hasGhpid={false} hasPhone={true} />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders name only (low confidence)", () => {
      const { container } = render(
        <PatientIdentityBadge hasGhpid={false} hasPhone={false} />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders with custom className", () => {
      const { container } = render(
        <PatientIdentityBadge hasGhpid={true} hasPhone={true} className="ml-2" />
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe("TableSkeleton (shared with Admin)", () => {
    it("renders default 5 rows 4 columns", () => {
      // TableSkeleton renders <tr> elements, needs <table><tbody> wrapper
      const { container } = render(
        <table><tbody><TableSkeleton columns={4} /></tbody></table>
      );
      expect(container).toMatchSnapshot();
    });

    it("renders custom 3 rows 6 columns", () => {
      const { container } = render(
        <table><tbody><TableSkeleton columns={6} rows={3} /></tbody></table>
      );
      expect(container).toMatchSnapshot();
    });
  });
});
