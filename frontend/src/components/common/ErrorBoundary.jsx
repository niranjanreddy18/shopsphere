/**
 * ErrorBoundary — catches JavaScript errors thrown during rendering
 * anywhere in its child tree (React error boundaries can only be class
 * components; there's no Hooks equivalent for `componentDidCatch`).
 *
 * This is distinct from the inline `<ErrorMessage>` component: that one
 * handles *expected* API failures (a 404, a validation error) that a thunk
 * catches and stores in Redux; this one is the last-resort safety net for
 * *unexpected* render-time crashes (e.g. a null-reference bug), so a bug in
 * one part of the page doesn't take down the entire app with a blank
 * white screen.
 */

import { Component } from "react";

import Button from "../ui/Button";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // In a real deployment this would report to an error-tracking service
    // (Sentry, etc.) instead of console.error.
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="card mx-auto max-w-md text-center">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Something went wrong</h2>
          <p className="mb-4 text-sm text-gray-600">
            An unexpected error occurred while rendering this page.
          </p>
          <Button onClick={this.handleReset}>Try again</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
