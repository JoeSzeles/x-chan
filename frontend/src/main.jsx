
// Import React without assuming it's globally available
import * as ReactModule from "react";
import * as ReactDOMModule from "react-dom/client";

// Create global object first thing if it doesn't exist
if (!window.g) {
  Object.defineProperty(window, 'g', {
    value: {},
    writable: true,
    enumerable: true,
    configurable: false // Make it non-deletable
  });
}

// Store the modules globally first thing
window.ReactModule = ReactModule;
window.ReactDOMModule = ReactDOMModule;

// Set React globally using more stable approach
const React = ReactModule;
const ReactDOM = ReactDOMModule;

// Make React globally available in multiple ways with robust property definitions
Object.defineProperty(window, 'React', {
  value: React,
  writable: true,
  enumerable: true,
  configurable: false
});

Object.defineProperty(window, '_React', {
  value: React,
  writable: true,
  enumerable: true,
  configurable: false
});

// Set React on global object with non-configurable property
Object.defineProperty(window.g, 'React', {
  value: React,
  writable: true,
  enumerable: true,
  configurable: false
});

Object.defineProperty(window.g, '_React', {
  value: React,
  writable: true,
  enumerable: true,
  configurable: false
});

// Now import other components
import App from "./App";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./components/common/ErrorBoundary";

// Import utilities
import { 
  setupGlobalErrorHandlers, 
  initializeReactGlobally, 
  getReactInstance,
  monitorReactAvailability
} from './utils/cleanupUtils';

// Initialize and check React availability immediately
initializeReactGlobally();

// Start monitoring React availability
monitorReactAvailability();

// Log React availability status
console.log(`React global status:`, {
  'window.React exists': !!window.React,
  'window.g.React exists': !!(window.g && window.g.React),
  'window._React exists': !!window._React,
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

// Set up global error handlers after everything else
setupGlobalErrorHandlers();

// Double-check React is available before rendering
if (!window.g.React && window.React) {
  console.log("Emergency React copy to g.React");
  window.g.React = window.React;
}

// Ensure React is definitely available before rendering
if ((window.React || window.g.React) && window.ReactDOM && document.getElementById("root")) {
  try {
    ReactDOM.createRoot(document.getElementById("root")).render(
      <React.StrictMode>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <App />
              <Toaster position="top-center" />
            </BrowserRouter>
          </QueryClientProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log("Application successfully rendered");
  } catch (e) {
    console.error("Error rendering application:", e);
    
    // Last resort attempt
    if (e.message && e.message.includes('React is undefined')) {
      try {
        console.log("Attempting last-resort render with direct ReactDOM access");
        const root = ReactDOMModule.createRoot(document.getElementById("root"));
        root.render(
          ReactModule.createElement(ReactModule.StrictMode, null,
            ReactModule.createElement(ErrorBoundary, null,
              ReactModule.createElement(QueryClientProvider, { client: queryClient },
                ReactModule.createElement(BrowserRouter, null,
                  ReactModule.createElement(App, null),
                  ReactModule.createElement(Toaster, { position: "top-center" })
                )
              )
            )
          )
        );
      } catch (lastError) {
        console.error("Last resort render failed:", lastError);
      }
    }
  }
} else {
  console.error("Critical error: React or DOM root not available for rendering", {
    reactAvailable: !!window.React,
    reactGlobalAvailable: !!(window.g && window.g.React),
    reactDOMAvailable: !!window.ReactDOM,
    rootElement: !!document.getElementById("root")
  });
}
