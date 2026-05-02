import React from "react";
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    if (this.isChunkError()) {
      // For chunk errors, do a hard reload clearing caches
      sessionStorage.removeItem('chunk_reload_done');
      if ('caches' in window) {
        caches.keys().then(names => Promise.all(names.map(n => caches.delete(n)))).catch(() => {});
      }
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  handleGoHome = () => {
    sessionStorage.removeItem('chunk_reload_done');
    window.location.href = "/";
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  isChunkError = () => {
    const msg = this.state.error?.message || "";
    return (
      msg.includes("dynamically imported module") ||
      msg.includes("Loading chunk") ||
      msg.includes("Loading CSS chunk") ||
      msg.includes("Failed to fetch dynamically")
    );
  };

  isNetworkError = () => {
    if (this.isChunkError()) return false;
    const errorMessage = this.state.error?.message?.toLowerCase() || "";
    return (
      errorMessage.includes("network") ||
      errorMessage.includes("failed to load") ||
      errorMessage.includes("connection")
    );
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetwork = this.isNetworkError();
      const isChunk = this.isChunkError();

      const title = isChunk
        ? "App Update Available"
        : isNetwork
          ? "Connection Problem"
          : "Something went wrong";

      const description = isChunk
        ? "A new version of Patient Bio is available. Please refresh to load the latest version."
        : isNetwork
          ? "Unable to connect. Please check your internet connection and try again."
          : this.state.error?.message || "An unexpected error occurred. Please try again.";

      return (
        <Card className="border-destructive/50 bg-destructive/5 max-w-lg mx-auto mt-8">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                {isChunk ? (
                  <RefreshCw className="h-6 w-6 text-primary" />
                ) : isNetwork ? (
                  <WifiOff className="h-6 w-6 text-destructive" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                )}
              </div>
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">{description}</p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={this.handleRetry} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                {isChunk ? "Refresh Now" : "Try Again"}
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>

            {/* Error details (collapsible) */}
            {this.state.error && (
              <Collapsible open={this.state.showDetails} onOpenChange={this.toggleDetails}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Bug className="h-3 w-3" />
                      Technical Details
                    </span>
                    {this.state.showDetails ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-3 bg-muted/50 rounded-md text-xs font-mono overflow-auto max-h-40">
                    <p className="text-destructive font-medium mb-2">
                      {this.state.error.name}: {this.state.error.message}
                    </p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-muted-foreground whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack.slice(0, 500)}
                      </pre>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use with hooks
interface ErrorFallbackProps {
  error?: Error | null;
  resetError?: () => void;
  message?: string;
  icon?: React.ReactNode;
  showHomeButton?: boolean;
}

export function ErrorFallback({ 
  error, 
  resetError, 
  message = "Something went wrong",
  icon,
  showHomeButton = true
}: ErrorFallbackProps) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {icon || <AlertTriangle className="h-12 w-12 text-destructive mb-4" />}
        <h3 className="font-semibold text-lg mb-2">{message}</h3>
        {error && (
          <p className="text-muted-foreground text-sm max-w-md mb-4">
            {error.message}
          </p>
        )}
        <div className="flex gap-2">
          {resetError && (
            <Button onClick={resetError} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          {showHomeButton && (
            <Button onClick={() => window.location.href = "/"} variant="ghost">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Route-level error boundary with automatic retry
interface RouteErrorBoundaryProps {
  children: React.ReactNode;
}

export function RouteErrorBoundary({ children }: RouteErrorBoundaryProps) {
  return (
    <ErrorBoundary
      onError={(error) => {
        // Could send to error tracking service here
        console.error("[RouteErrorBoundary]", error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// Section-level error boundary with minimal UI
interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  sectionName?: string;
}

export function SectionErrorBoundary({ children, sectionName }: SectionErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5 text-center">
          <p className="text-sm text-muted-foreground">
            {sectionName ? `Unable to load ${sectionName}` : "This section failed to load"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="mt-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reload
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
