/**
 * Snapshot Tests: Shared Components
 * Captures rendered HTML for cross-portal shared components.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SkeletonCard, SkeletonGrid, SkeletonTable, SkeletonTimeline } from "@/components/shared/SkeletonCard";
import { BaseProfileCompletionCard } from "@/components/shared/BaseProfileCompletionCard";
import { Stethoscope } from "lucide-react";
import type { ProfileField } from "@/types/profileCompletion";

const withRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter>);

describe("Shared Components Snapshots", () => {
  describe("SkeletonCard variants", () => {
    it("renders default variant", () => {
      const { container } = render(<SkeletonCard />);
      expect(container).toMatchSnapshot();
    });

    it("renders stat variant", () => {
      const { container } = render(<SkeletonCard variant="stat" showIcon />);
      expect(container).toMatchSnapshot();
    });

    it("renders chart variant", () => {
      const { container } = render(<SkeletonCard variant="chart" />);
      // Chart variant uses deterministic heights - verify structure not exact values
      expect(container.querySelector('.flex.items-end.gap-1.h-40')).toBeTruthy();
      expect(container.querySelectorAll('.flex-1.rounded-t')).toHaveLength(12);
    });

    it("renders list variant", () => {
      const { container } = render(<SkeletonCard variant="list" lines={4} />);
      expect(container).toMatchSnapshot();
    });

    it("renders compact variant", () => {
      const { container } = render(<SkeletonCard variant="compact" showIcon />);
      expect(container).toMatchSnapshot();
    });

    it("renders detailed variant with footer", () => {
      const { container } = render(
        <SkeletonCard variant="detailed" showIcon showFooter />
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe("SkeletonGrid", () => {
    it("renders 4-column grid", () => {
      const { container } = render(<SkeletonGrid count={4} columns={4} variant="stat" />);
      expect(container).toMatchSnapshot();
    });
  });

  describe("SkeletonTable", () => {
    it("renders default table skeleton", () => {
      const { container } = render(<SkeletonTable />);
      expect(container).toMatchSnapshot();
    });

    it("renders custom dimensions", () => {
      const { container } = render(<SkeletonTable rows={3} columns={6} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe("SkeletonTimeline", () => {
    it("renders timeline skeleton", () => {
      const { container } = render(<SkeletonTimeline items={3} />);
      expect(container).toMatchSnapshot();
    });
  });

  describe("BaseProfileCompletionCard", () => {
    const missingFields: ProfileField[] = [
      { key: "phone", label: "Phone Number", isComplete: false },
      { key: "specialty", label: "Specialty", isComplete: false },
      { key: "license", label: "License Number", isComplete: false },
      { key: "bio", label: "Biography", isComplete: false },
    ];

    it("renders with 60% completion", () => {
      const { container } = withRouter(
        <BaseProfileCompletionCard
          icon={Stethoscope}
          percentage={60}
          completedCount={6}
          totalCount={10}
          missingFields={missingFields}
          profileLink="/doctor/profile"
          colorScheme="teal"
        />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders with primary color scheme", () => {
      const { container } = withRouter(
        <BaseProfileCompletionCard
          icon={Stethoscope}
          percentage={30}
          completedCount={3}
          totalCount={10}
          missingFields={missingFields}
          profileLink="/settings"
          colorScheme="primary"
        />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders null at 100% completion", () => {
      const { container } = withRouter(
        <BaseProfileCompletionCard
          icon={Stethoscope}
          percentage={100}
          completedCount={10}
          totalCount={10}
          missingFields={[]}
          profileLink="/settings"
        />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders with more fields than max displayed", () => {
      const { container } = withRouter(
        <BaseProfileCompletionCard
          icon={Stethoscope}
          percentage={40}
          completedCount={4}
          totalCount={10}
          missingFields={missingFields}
          profileLink="/settings"
          maxDisplayedFields={2}
        />
      );
      expect(container).toMatchSnapshot();
    });
  });
});
