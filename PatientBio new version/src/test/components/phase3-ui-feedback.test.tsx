import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Toast, ToastTitle, ToastDescription, ToastClose, ToastAction, ToastViewport } from "@/components/ui/toast";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary, ErrorFallback, SectionErrorBoundary } from "@/components/ui/error-boundary";

// Mock lucide-react
vi.mock("lucide-react", () => ({
  X: (props: any) => <span data-testid="x-icon" {...props} />,
  AlertTriangle: (props: any) => <span data-testid="alert-triangle" {...props} />,
  RefreshCw: (props: any) => <span data-testid="refresh" {...props} />,
  Home: (props: any) => <span data-testid="home" {...props} />,
  Bug: (props: any) => <span data-testid="bug" {...props} />,
  ChevronDown: (props: any) => <span data-testid="chevron-down" {...props} />,
  ChevronUp: (props: any) => <span data-testid="chevron-up" {...props} />,
  WifiOff: (props: any) => <span data-testid="wifi-off" {...props} />,
}));

// ─── Dialog ───────────────────────────────────────────────
describe("Dialog", () => {
  it("renders trigger but not content when closed", () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.queryByText("Title")).not.toBeInTheDocument();
  });

  it("opens on trigger click", () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>My Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByText("My Dialog")).toBeInTheDocument();
  });

  it("renders controlled open state", () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogTitle>Visible</DialogTitle>
          <DialogDescription>Description text</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText("Visible")).toBeInTheDocument();
    expect(screen.getByText("Description text")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders header and footer", () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader><DialogTitle>Header</DialogTitle></DialogHeader>
          <DialogFooter>Footer content</DialogFooter>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Footer content")).toBeInTheDocument();
  });

  it("calls onOpenChange when close button clicked", () => {
    const fn = vi.fn();
    render(
      <Dialog open={true} onOpenChange={fn}>
        <DialogContent>
          <DialogTitle>Test</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    // Close button is the X in top-right
    const closeBtn = screen.getByText("Close");
    fireEvent.click(closeBtn);
    expect(fn).toHaveBeenCalledWith(false);
  });
});

// ─── AlertDialog ──────────────────────────────────────────
describe("AlertDialog", () => {
  it("renders trigger but hides content when closed", () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Delete</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();
  });

  it("opens on trigger click", () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Delete</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
    fireEvent.click(screen.getByText("Delete"));
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("closes on Cancel click", () => {
    const fn = vi.fn();
    render(
      <AlertDialog open={true} onOpenChange={fn}>
        <AlertDialogContent>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(fn).toHaveBeenCalledWith(false);
  });

  it("closes on Action click", () => {
    const fn = vi.fn();
    render(
      <AlertDialog open={true} onOpenChange={fn}>
        <AlertDialogContent>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
    fireEvent.click(screen.getByText("OK"));
    expect(fn).toHaveBeenCalledWith(false);
  });
});

// ─── Toast ────────────────────────────────────────────────
describe("Toast Components", () => {
  it("renders Toast with role=alert", () => {
    render(<Toast id="1">Toast message</Toast>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Toast message")).toBeInTheDocument();
  });

  it("renders ToastTitle and ToastDescription", () => {
    render(
      <Toast id="1">
        <div>
          <ToastTitle>Title</ToastTitle>
          <ToastDescription>Description</ToastDescription>
        </div>
      </Toast>
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
  });

  it("applies destructive variant", () => {
    render(<Toast id="1" variant="destructive">Error</Toast>);
    const toast = screen.getByRole("alert");
    expect(toast.className).toContain("destructive");
  });

  it("renders ToastClose button", () => {
    const fn = vi.fn();
    render(
      <Toast id="1">
        <ToastClose onClick={fn} />
      </Toast>
    );
    const closeBtn = screen.getByRole("alert").querySelector("button");
    expect(closeBtn).not.toBeNull();
  });

  it("renders ToastViewport", () => {
    const { container } = render(<ToastViewport />);
    expect(container.firstChild).toHaveClass("fixed");
  });
});

// ─── ErrorBoundary ────────────────────────────────────────
describe("ErrorBoundary", () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  beforeEach(() => consoleSpy.mockClear());

  const ThrowingComponent = () => {
    throw new Error("Test error");
  };

  it("catches errors and displays fallback UI", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom error UI")).toBeInTheDocument();
  });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Everything fine</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Everything fine")).toBeInTheDocument();
  });
});

// ─── ErrorFallback ────────────────────────────────────────
describe("ErrorFallback", () => {
  it("renders default message", () => {
    render(<ErrorFallback />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders custom message", () => {
    render(<ErrorFallback message="Custom error" />);
    expect(screen.getByText("Custom error")).toBeInTheDocument();
  });

  it("shows error details", () => {
    render(<ErrorFallback error={new Error("Detailed error")} />);
    expect(screen.getByText("Detailed error")).toBeInTheDocument();
  });

  it("calls resetError on Try Again click", () => {
    const fn = vi.fn();
    render(<ErrorFallback resetError={fn} />);
    fireEvent.click(screen.getByText("Try Again"));
    expect(fn).toHaveBeenCalled();
  });
});

// ─── SectionErrorBoundary ─────────────────────────────────
describe("SectionErrorBoundary", () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  beforeEach(() => consoleSpy.mockClear());

  const ThrowingComponent = () => {
    throw new Error("Test error");
  };

  it("shows section-specific error message", () => {
    render(
      <SectionErrorBoundary sectionName="Dashboard">
        <ThrowingComponent />
      </SectionErrorBoundary>
    );
    expect(screen.getByText("Unable to load Dashboard")).toBeInTheDocument();
  });

  it("shows generic message when no sectionName", () => {
    render(
      <SectionErrorBoundary>
        <ThrowingComponent />
      </SectionErrorBoundary>
    );
    expect(screen.getByText("This section failed to load")).toBeInTheDocument();
  });
});
