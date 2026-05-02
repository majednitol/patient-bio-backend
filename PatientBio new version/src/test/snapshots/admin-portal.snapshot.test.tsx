/**
 * Snapshot Tests: Admin Portal Components
 * Captures rendered HTML for critical admin-facing components.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SearchInput } from "@/components/admin/SearchInput";

describe("Admin Portal Snapshots", () => {
  describe("SearchInput", () => {
    it("renders empty state", () => {
      const { container } = render(
        <SearchInput value="" onChange={() => {}} placeholder="Search users..." />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders with value (shows clear button)", () => {
      const { container } = render(
        <SearchInput value="test query" onChange={() => {}} placeholder="Search users..." />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders with custom className", () => {
      const { container } = render(
        <SearchInput value="" onChange={() => {}} className="max-w-md" />
      );
      expect(container).toMatchSnapshot();
    });

    it("renders with default placeholder", () => {
      const { container } = render(
        <SearchInput value="" onChange={() => {}} />
      );
      expect(container).toMatchSnapshot();
    });
  });
});
