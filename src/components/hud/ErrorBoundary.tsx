import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryState {
  error?: Error;
}

export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Franchise Ice panel error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <section className="panel-section panel-section--warning">
            <h3>Panel Recovery</h3>
            <p className="error-text">This panel hit a recoverable rendering issue. Close it and reopen, or save/export before continuing.</p>
          </section>
        )
      );
    }
    return this.props.children;
  }
}
