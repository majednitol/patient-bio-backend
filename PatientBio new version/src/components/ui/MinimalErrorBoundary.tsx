import React from "react";

/**
 * Lightweight error boundary for the critical render path.
 * No external UI imports (no Card, Button, lucide icons).
 * Shows a simple inline fallback on error.
 */

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MinimalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "hsl(var(--background, 0 0% 100%))",
          color: "hsl(var(--foreground, 240 10% 4%))",
          padding: "2rem",
          textAlign: "center",
        }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", opacity: 0.6, marginBottom: "1.5rem", maxWidth: 400 }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                background: "hsl(var(--primary, 262 83% 58%))",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Refresh
            </button>
            <button
              onClick={() => { window.location.href = "/"; }}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                background: "transparent",
                border: "1px solid hsl(var(--border, 240 6% 90%))",
                color: "inherit",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
