
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      reactAvailable: true
    };
    
    // Store React reference for recovery
    this._React = React;
    
    // Ensure React is globally available in case of errors
    this.exposeReactGlobally();
  }
  
  // Define this method outside the constructor to ensure it's properly bound
  exposeReactGlobally() {
    // Use non-configurable property to prevent deletion
    try {
      if (!window.g) {
        Object.defineProperty(window, 'g', {
          value: {},
          writable: true,
          enumerable: true,
          configurable: false
        });
      }
      
      // Set React on global object as non-configurable property
      Object.defineProperty(window, 'React', {
        value: this._React,
        writable: true,
        enumerable: true,
        configurable: false
      });
      
      Object.defineProperty(window.g, 'React', {
        value: this._React,
        writable: true,
        enumerable: true,
        configurable: false
      });
      
      // Create backup
      window._React = this._React;
      window.g._React = this._React;
      
      console.log('React exposed to g from ErrorBoundary');
      this.setState({ reactAvailable: true });
    } catch (e) {
      console.error('Failed to expose React in ErrorBoundary:', e);
      this.setState({ reactAvailable: false });
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Fix potential React reference issues
    if (error && error.message && (
        error.message.includes('React is undefined') || 
        error.message.includes('g.React is undefined'))) {
      try {
        // Restore React reference
        window.React = this._React;
        window.g.React = this._React;
        
        // Force re-expose to make sure
        this.exposeReactGlobally();
        
        console.log('React reference restored in error handler');
      } catch (e) {
        console.error('Failed to fix React reference in error handler:', e);
      }
    }
    
    // Log to analytics/monitoring service if available
    if (process.env.NODE_ENV === 'production') {
      try {
        fetch('/api/log-error', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: error.toString(),
            componentStack: errorInfo.componentStack,
            url: window.location.href,
            timestamp: new Date().toISOString()
          }),
        }).catch(e => console.error('Failed to send error log:', e));
      } catch (e) {
        console.error('Failed to log error to server:', e);
      }
    }
  }

  handleRetry = () => {
    try {
      // First restore React references
      this.exposeReactGlobally();
      
      console.log("Error boundary attempting recovery");
      
      // Explicitly ensure React is available globally
      if (!window.g) window.g = {};
      if (window.React && !window.g.React) {
        window.g.React = window.React;
      } else if (window.ReactModule) {
        window.React = window.ReactModule;
        window.g.React = window.ReactModule;
      }
      
      // Then clear error state
      this.setState({ hasError: false, error: null, errorInfo: null });
      
      // Force refresh the page content if we couldn't recover
      if (!window.g.React) {
        console.warn("Could not recover React instance, reloading page");
        window.location.reload();
      }
    } catch (e) {
      console.error("Error in recovery process:", e);
      window.location.reload();
    }
  }
  
  // Add a new method to attempt React recovery
  exposeReactGlobally = () => {
    try {
      // Try to find React from any available source
      const possibleReact = window.React || window.ReactModule || window._React;
      
      if (possibleReact) {
        window.React = possibleReact;
        if (!window.g) window.g = {};
        window.g.React = possibleReact;
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to expose React globally:", e);
      return false;
    }
  }

  render() {
    // Check if React is still accessible
    const reactLost = !window.React || !window.g.React;
    
    // If we lost React references but our internal copy is still good, restore it
    if (reactLost && this._React) {
      this.exposeReactGlobally();
    }
    
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-gray-900 rounded-lg border border-gray-800">
          <div className="text-center max-w-lg">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h2>
            <p className="text-gray-300 mb-6">
              We encountered an error loading this content. This might be due to a network issue or a problem with the application.
            </p>
            
            {this.state.error && (
              <div className="mb-6 text-left">
                <p className="text-red-400 font-mono text-sm p-3 bg-gray-800 rounded overflow-auto mb-2">
                  {this.state.error.toString()}
                </p>
                <details className="text-gray-400">
                  <summary className="cursor-pointer text-blue-400 hover:text-blue-300 mb-2">Component Stack Trace</summary>
                  <pre className="text-xs bg-gray-800 p-3 rounded overflow-auto">
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </details>
              </div>
            )}
            
            <div className="flex justify-center gap-4">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
