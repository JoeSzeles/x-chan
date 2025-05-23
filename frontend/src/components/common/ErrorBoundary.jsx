
import React, { Component } from "react";
import { injectReactGlobally, logReactGlobalState } from '../../utils/reactErrorRecovery';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      recoveryAttempts: 0,
      lastErrorTime: 0
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
    // Get current time for throttling frequent errors
    const now = Date.now();
    const timeSinceLastError = now - this.state.lastErrorTime;
    
    // Update state with error details
    this.setState({
      error,
      errorInfo,
      recoveryAttempts: this.state.recoveryAttempts + 1,
      lastErrorTime: now
    });

    // Log detailed information about the error
    console.log("React Error Boundary caught an error:", error, errorInfo);
    
    // Log the current state of React in global scope
    logReactGlobalState();
    
    // Log component stack trace
    if (errorInfo && errorInfo.componentStack) {
      console.error("Component stack trace:", errorInfo.componentStack);
    }

    // Attempt to restore React global references
    try {
      console.log("Attempting to restore React global references...");
      window.g = window.g || {};
      window.g.React = React;
      window.React = React;

      // Use the more robust recovery method
      const recovered = injectReactGlobally();
      console.log("React reference restored in error handler:", recovered ? "success" : "failed");
      
      // Log additional diagnostics
      console.log("Current React version:", React.version);
      console.log("Component props:", this.props);
      
      // Check for specific error patterns
      if (error && error.message) {
        if (error.message.includes("undefined is not an object")) {
          console.error("Null/undefined object access error - common in React render failures");
        } else if (error.message.includes("is not a function")) {
          console.error("Function reference error - likely a lost method or callback");
        } else if (error.message.includes("Cannot read property")) {
          console.error("Property access error - undefined object access");
        }
      }
    } catch (e) {
      console.error("Failed to restore React reference:", e);
    }

    // Force reload the page if we've had too many errors in a short time
    if (this.state.recoveryAttempts >= 5 && timeSinceLastError < 10000) {
      console.error("Too many errors in a short time, forcing page reload");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
    
    // Report error to console in a structured way
    console.error("==== REACT ERROR REPORT ====");
    console.error(`Time: ${new Date().toISOString()}`);
    console.error(`Error: ${error?.message || 'Unknown error'}`);
    console.error(`Recovery attempts: ${this.state.recoveryAttempts}`);
    console.error(`User Agent: ${navigator.userAgent}`);
    console.error("==== ERROR REPORT END ====");
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
            {this.state.errorInfo && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-gray-400">Technical Details</summary>
                <pre className="mt-2 text-xs text-gray-400 overflow-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
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
          <p className="mt-4 text-sm text-gray-400">
            Recovery attempt {this.state.recoveryAttempts} of 5
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
