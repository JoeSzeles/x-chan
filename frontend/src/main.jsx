
// Import React and ReactDOM directly with namespace imports
import * as ReactModule from "react";
import * as ReactDOMModule from "react-dom/client";

// Import error boundary early
import ErrorBoundary from "./components/common/ErrorBoundary";

// Import utility functions
import { 
  getReactInstance,
  cacheReactInstance,
  initializeReactGlobally,
  injectReactGlobally,
  monitorReactAvailability,
  clearSESLocalStorage,
  setupGlobalErrorHandlers
} from './utils/cleanupUtils';

// Import new React error recovery utilities
import {
  cacheReactReference,
  injectReactGlobally as forceReactGlobal,
  setupReactReferenceProtection
} from './utils/reactErrorRecovery';

// Cache and make React globally available immediately 
const React = cacheReactInstance(ReactModule);
cacheReactReference(ReactModule);
const ReactDOM = ReactDOMModule;

// Store modules globally as a fallback
window.ReactModule = ReactModule;
window.ReactDOMModule = ReactDOMModule;

// Make sure window.g exists first thing
if (!window.g) {
  Object.defineProperty(window, 'g', {
    value: {},
    writable: true,
    enumerable: true,
    configurable: false
  });
}

// Force React global availability on both window and g
try {
  // Using Object.defineProperty for more robust definitions
  Object.defineProperty(window, 'React', {
    value: React,
    writable: true,
    enumerable: true,
    configurable: true
  });
  
  Object.defineProperty(window.g, 'React', {
    value: React,
    writable: true,
    enumerable: true,
    configurable: true
  });
  
  // Backup references
  window._React = React;
  window.g._React = React;
  
  console.log("React successfully defined with Object.defineProperty");
} catch (e) {
  console.warn("Fallback to direct assignment for React global", e);
  // Direct assignment as fallback
  window.React = React;
  window.g.React = React;
  window._React = React; 
  window.g._React = React;
}

// Initialize React globally with robust property definitions
initializeReactGlobally();

// Double-check initialization was successful
if (!window.g.React) {
  console.error("React initialization failed on g object!");
  // Last resort direct assignment
  window.g.React = React;
}

// Now we can import the rest of the application
import App from "./App";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

// Clear any problematic localStorage items
clearSESLocalStorage();

// Create a React-aware render function that verifies React is available
const renderWithReactCheck = () => {
  try {
    // Check React availability again just before rendering with multiple recovery methods
    if (!window.React) {
      console.warn("React not available on window, reinjecting...");
      window.React = React;
      forceReactGlobal(); // Use the new more robust method
    }
    
    if (!window.g.React) {
      console.warn("React not available on g, reinjecting...");
      window.g.React = React;
      forceReactGlobal(); // Use the new more robust method
    }
    
    // Apply additional protection
    setupReactReferenceProtection();
    
    // Log React availability
    console.log(`React global status:`, {
      'window.React exists': !!window.React,
      'window.g.React exists': !!(window.g && window.g.React),
      'cached React exists': !!getReactInstance()
    });
    
    // Configure React Query with better error handling
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          retry: (failureCount, error) => {
            // Don't retry on 401/403 auth errors
            if (error?.response?.status === 401 || error?.response?.status === 403) {
              return false;
            }
            // Retry other errors up to 3 times
            return failureCount < 3;
          },
          onError: (error) => {
            console.error("Query error:", error);
          }
        },
      },
    });
    
    const root = document.getElementById("root");
    
    if (!root) {
      console.error("Root element not found");
      return false;
    }
    
    // Render with direct explicit references to React and ReactDOM
    const reactRoot = ReactDOM.createRoot(root);
    
    reactRoot.render(
      React.createElement(React.StrictMode, null,
        React.createElement(ErrorBoundary, null,
          React.createElement(QueryClientProvider, { client: queryClient },
            React.createElement(BrowserRouter, null,
              React.createElement(App, null),
              React.createElement(Toaster, { position: "top-center" })
            )
          )
        )
      )
    );
    
    console.log("Application successfully rendered");
    return true;
  } catch (e) {
    console.error("Error in renderWithReactCheck:", e);
    
    // Do a last resort direct render using imported modules
    try {
      console.log("Attempting last-resort render");
      
      const root = document.getElementById("root");
      if (!root) return false;
      
      const reactRoot = ReactDOMModule.createRoot(root);
      
      reactRoot.render(
        ReactModule.createElement(ReactModule.StrictMode, null,
          ReactModule.createElement(ErrorBoundary, null,
            ReactModule.createElement("div", { className: "p-8 max-w-lg mx-auto bg-gray-800 text-white rounded-lg" },
              ReactModule.createElement("h1", { className: "text-xl font-bold mb-4" }, "Emergency Fallback Rendering"),
              ReactModule.createElement("p", { className: "mb-4" }, "The application encountered an error during initialization."),
              ReactModule.createElement("button", { 
                className: "px-4 py-2 bg-blue-600 rounded", 
                onClick: () => window.location.reload() 
              }, "Reload Application")
            )
          )
        )
      );
      
      return true;
    } catch (lastError) {
      console.error("Even last-resort render failed:", lastError);
      return false;
    }
  }
};

// Set up global error handlers before rendering
setupGlobalErrorHandlers();

// Start monitoring React availability
monitorReactAvailability();

// Only render once the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderWithReactCheck);
} else {
  // DOM already ready, render immediately
  renderWithReactCheck();
}
