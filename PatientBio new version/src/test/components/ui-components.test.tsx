import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AsyncButton, LoadingButton } from "@/components/ui/async-button";
import { ErrorBoundary, ErrorFallback, SectionErrorBoundary } from "@/components/ui/error-boundary";

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Loader2: () => <span data-testid="loader">Loading...</span>,
  AlertTriangle: () => <span data-testid="alert">Alert</span>,
  RefreshCw: () => <span data-testid="refresh">Refresh</span>,
  Home: () => <span data-testid="home">Home</span>,
  Bug: () => <span data-testid="bug">Bug</span>,
  ChevronDown: () => <span data-testid="chevron-down">Down</span>,
  ChevronUp: () => <span data-testid="chevron-up">Up</span>,
  WifiOff: () => <span data-testid="wifi-off">Offline</span>,
}));

describe("AsyncButton", () => {
  it("renders children correctly", () => {
    render(<AsyncButton>Click me</AsyncButton>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("shows loading state during async operation", async () => {
    const asyncFn = vi.fn(async () => {
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    });
    
    render(<AsyncButton onClick={asyncFn}>Submit</AsyncButton>);
    
    const button = screen.getByRole("button");
    fireEvent.click(button);
    
    // Should show loader
    await waitFor(() => {
      expect(screen.getByTestId("loader")).toBeInTheDocument();
    });
    
    // Button should be disabled
    expect(button).toBeDisabled();
  });

  it("does not show loader for sync operations", () => {
    const syncFn = vi.fn();
    
    render(<AsyncButton onClick={syncFn}>Submit</AsyncButton>);
    fireEvent.click(screen.getByRole("button"));
    
    expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
  });
});

describe("LoadingButton", () => {
  it("shows loader when isLoading is true", () => {
    render(<LoadingButton isLoading>Submit</LoadingButton>);
    
    expect(screen.getByTestId("loader")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows children when not loading", () => {
    render(<LoadingButton isLoading={false}>Submit</LoadingButton>);
    
    expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
    expect(screen.getByText("Submit")).toBeInTheDocument();
  });

  it("shows custom loading text", () => {
    render(<LoadingButton isLoading loadingText="Saving...">Submit</LoadingButton>);
    
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });
});

describe("ErrorFallback", () => {
  it("renders error message", () => {
    render(<ErrorFallback message="Something went wrong" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows error details when provided", () => {
    const error = new Error("Test error message");
    render(<ErrorFallback error={error} />);
    expect(screen.getByText("Test error message")).toBeInTheDocument();
  });

  it("calls resetError when Try Again is clicked", () => {
    const resetFn = vi.fn();
    render(<ErrorFallback resetError={resetFn} />);
    
    fireEvent.click(screen.getByText("Try Again"));
    expect(resetFn).toHaveBeenCalled();
  });
});

describe("ErrorBoundary", () => {
  const ThrowingComponent = () => {
    throw new Error("Test error");
  };

  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  
  beforeEach(() => {
    consoleSpy.mockClear();
  });

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
      <ErrorBoundary fallback={<div>Custom error</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByText("Custom error")).toBeInTheDocument();
  });
});

describe("SectionErrorBoundary", () => {
  const ThrowingComponent = () => {
    throw new Error("Test error");
  };

  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  
  beforeEach(() => {
    consoleSpy.mockClear();
  });

  it("shows section-specific error message", () => {
    render(
      <SectionErrorBoundary sectionName="Dashboard">
        <ThrowingComponent />
      </SectionErrorBoundary>
    );
    
    expect(screen.getByText("Unable to load Dashboard")).toBeInTheDocument();
  });
});
