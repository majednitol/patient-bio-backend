/**
 * Snapshot Tests: Patient Portal Components
 * Captures rendered HTML for critical patient-facing components.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TokenBalance } from "@/components/dashboard/TokenBalance";

// Wrapper for components needing router
const withRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter>);

describe("Patient Portal Snapshots", () => {
  describe("TokenBalance", () => {
    it("renders default state", () => {
      const { container } = withRouter(
        <TokenBalance
          balance={125.5}
          totalEarned={350.75}
          thisMonthEarnings={42.0}
          totalShares={12}
          walletAddress="0x1234...abcd"
        />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders loading state", () => {
      const { container } = withRouter(
        <TokenBalance
          balance={0}
          totalEarned={0}
          thisMonthEarnings={0}
          totalShares={0}
          isLoading
        />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders zero balance", () => {
      const { container } = withRouter(
        <TokenBalance
          balance={0}
          totalEarned={0}
          thisMonthEarnings={0}
          totalShares={0}
        />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders large numbers", () => {
      const { container } = withRouter(
        <TokenBalance
          balance={999999.99}
          totalEarned={1500000}
          thisMonthEarnings={50000}
          totalShares={5000}
        />
      );
      expect(container).toMatchSnapshot();
    });
  });
});
