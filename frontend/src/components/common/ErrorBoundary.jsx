import React, { Component } from "react";
import { injectReactGlobally } from '../../utils/reactErrorRecovery';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      recoveryAttempts: 0
    };

    // Immediately expose React to the global scope
    try {
      window.g = window.g || {};
      window.g.React = React;
      window.React = React;
      console.log("React exposed to g from ErrorBoundary");
    } catch (e) {
      console.error("Failed to expose React from ErrorBoundary:", e);
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Update state with error details
    this.setState({
      error,
      errorInfo,
      recoveryAttempts: this.state.recoveryAttempts + 1
    });

    console.log("React Error Boundary caught an error:", error, errorInfo);

    // Attempt to restore React global references
    try {
      window.g = window.g || {};
      window.g.React = React;
      window.React = React;

      // Use the more robust recovery method
      injectReactGlobally();

      console.log("React reference restored in error handler");
    } catch (e) {
      console.error("Failed to restore React reference:", e);
    }

    // Force reload the page if we've had too many errors
    if (this.state.recoveryAttempts >= 5) {
      console.error("Too many errors, forcing page reload");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Expose React again in render method
      try {
        window.g = window.g || {};
        window.g.React = React;
        window.React = React;
      } catch (e) {
        console.error("Failed to expose React in error render:", e);
      }

      // Error fallback UI
      return (
        <div className="p-8 max-w-lg mx-auto bg-gray-800 text-white rounded-lg shadow-lg">
          <h1 className="text-xl font-bold mb-4">Something went wrong</h1>
          <p className="mb-4">
            The application encountered an error. We're trying to recover...
          </p>
          <div className="bg-gray-900 p-4 rounded overflow-auto mb-4 max-h-40">
            <p className="text-red-400 font-mono text-sm whitespace-pre-wrap">
              {this.state.error?.toString()}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={this.resetError}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;