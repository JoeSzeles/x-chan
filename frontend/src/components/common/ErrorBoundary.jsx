
import React from 'react';
import { toast } from 'react-hot-toast';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
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
    
    // Log to analytics/monitoring service if available
    if (process.env.NODE_ENV === 'production') {
      // Example to log error to server (implement this endpoint)
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
        });
      } catch (e) {
        console.error('Failed to log error to server:', e);
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Force refresh the page content
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-gray-900 rounded-lg border border-gray-800">
          <div className="text-center max-w-lg">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h2>
            <p className="text-gray-300 mb-6">
              We encountered an error loading this content. This might be due to a network issue or a problem with the application.
            </p>
            
            {process.env.NODE_ENV !== 'production' && this.state.error && (
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
