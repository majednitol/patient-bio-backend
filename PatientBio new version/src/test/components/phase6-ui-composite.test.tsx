import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import { EmptyState, InlineEmptyState } from "@/components/ui/empty-state";

// Mock lucide-react
vi.mock("lucide-react", () => {
  const MockIcon = (props: any) => <span data-testid="mock-icon" {...props} />;
  return {
    X: MockIcon,
    Search: MockIcon,
    Plus: MockIcon,
    ChevronDown: MockIcon,
    ChevronUp: MockIcon,
    AlertTriangle: MockIcon,
    RefreshCw: MockIcon,
    Home: MockIcon,
    Bug: MockIcon,
    WifiOff: MockIcon,
    FileText: MockIcon,
  };
});

// ─── Sheet ────────────────────────────────────────────────
describe("Sheet", () => {
  it("renders trigger, hides content when closed", () => {
    render(
      <Sheet>
        <SheetTrigger>Open Sheet</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
            <SheetDescription>Sheet description</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByText("Open Sheet")).toBeInTheDocument();
    expect(screen.queryByText("Sheet Title")).not.toBeInTheDocument();
  });

  it("opens on trigger click", () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Opened</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByText("Opened")).toBeInTheDocument();
  });

  it("renders controlled open state", () => {
    render(
      <Sheet open={true}>
        <SheetContent>
          <SheetTitle>Visible</SheetTitle>
          <SheetDescription>Desc</SheetDescription>
          <SheetFooter>Footer</SheetFooter>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByText("Visible")).toBeInTheDocument();
    expect(screen.getByText("Desc")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("calls onOpenChange when close button clicked", () => {
    const fn = vi.fn();
    render(
      <Sheet open={true} onOpenChange={fn}>
        <SheetContent>
          <SheetTitle>Test</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    // Click the sr-only "Close" button
    const closeBtn = screen.getByText("Close");
    fireEvent.click(closeBtn);
    expect(fn).toHaveBeenCalledWith(false);
  });

  it("applies side styles", () => {
    const { container } = render(
      <Sheet open={true}>
        <SheetContent side="left">
          <SheetTitle>Left</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    // Should contain left-side animation class
    const content = screen.getByText("Left").closest("[class*='slide-in-from-left']");
    expect(content).not.toBeNull();
  });
});

// ─── Popover ──────────────────────────────────────────────
describe("Popover", () => {
  it("renders trigger, hides content when closed", () => {
    render(
      <Popover>
        <PopoverTrigger>Open Popover</PopoverTrigger>
        <PopoverContent>Popover content</PopoverContent>
      </Popover>
    );
    expect(screen.getByText("Open Popover")).toBeInTheDocument();
    expect(screen.queryByText("Popover content")).not.toBeInTheDocument();
  });

  it("opens on trigger click", () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Content here</PopoverContent>
      </Popover>
    );
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByText("Content here")).toBeInTheDocument();
  });

  it("closes on second trigger click", () => {
    render(
      <Popover>
        <PopoverTrigger>Toggle</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>
    );
    const trigger = screen.getByText("Toggle");
    fireEvent.click(trigger); // open
    expect(screen.getByText("Content")).toBeInTheDocument();
    fireEvent.click(trigger); // close
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders controlled open state", () => {
    render(
      <Popover open={true}>
        <PopoverTrigger>Trigger</PopoverTrigger>
        <PopoverContent>Controlled content</PopoverContent>
      </Popover>
    );
    expect(screen.getByText("Controlled content")).toBeInTheDocument();
  });
});

// ─── EmptyState ───────────────────────────────────────────
describe("EmptyState", () => {
  // Use a simple mock for LucideIcon
  const MockIcon = (props: any) => <span data-testid="empty-icon" {...props} />;

  it("renders title and description", () => {
    render(
      <EmptyState
        icon={MockIcon as any}
        title="No patients found"
        description="Try adjusting your search filters"
      />
    );
    expect(screen.getByText("No patients found")).toBeInTheDocument();
    expect(screen.getByText("Try adjusting your search filters")).toBeInTheDocument();
  });

  it("renders action button", () => {
    const fn = vi.fn();
    render(
      <EmptyState
        icon={MockIcon as any}
        title="No data"
        description="Get started"
        action={{ label: "Add New", onClick: fn }}
      />
    );
    const btn = screen.getByText("Add New");
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(fn).toHaveBeenCalled();
  });

  it("renders secondary action", () => {
    const primary = vi.fn();
    const secondary = vi.fn();
    render(
      <EmptyState
        icon={MockIcon as any}
        title="Empty"
        description="Desc"
        action={{ label: "Primary", onClick: primary }}
        secondaryAction={{ label: "Secondary", onClick: secondary }}
      />
    );
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByText("Secondary")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Secondary"));
    expect(secondary).toHaveBeenCalled();
  });
});

// ─── InlineEmptyState ─────────────────────────────────────
describe("InlineEmptyState", () => {
  const MockIcon = (props: any) => <span data-testid="inline-icon" {...props} />;

  it("renders title and description", () => {
    render(
      <InlineEmptyState
        icon={MockIcon as any}
        title="No results"
        description="Try a different query"
      />
    );
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByText("Try a different query")).toBeInTheDocument();
  });

  it("renders optional action button", () => {
    const fn = vi.fn();
    render(
      <InlineEmptyState
        icon={MockIcon as any}
        title="Empty"
        description="Desc"
        action={{ label: "Add", onClick: fn }}
      />
    );
    fireEvent.click(screen.getByText("Add"));
    expect(fn).toHaveBeenCalled();
  });
});
