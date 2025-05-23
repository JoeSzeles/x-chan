
// Import React without assuming it's globally available
import * as ReactModule from "react";
import * as ReactDOMModule from "react-dom/client";

// Store the modules globally first thing
window.ReactModule = ReactModule;
window.ReactDOMModule = ReactDOMModule;

// Set React globally using more stable approach
const React = ReactModule;
const ReactDOM = ReactDOMModule;

// Make React globally available in multiple ways
window.React = React;
window.ReactDOM = ReactDOM;

// Create global object if it doesn't exist
if (!window.g) window.g = {};

// Set React on global object - using defineProperty to avoid errors
if (!window.g.React) {
  Object.defineProperty(window.g, 'React', {
    configurable: true,
    writable: true,
    value: React
  });
}

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
  getReactInstance 
} from './utils/cleanupUtils';

// Initialize and check React availability immediately
initializeReactGlobally();

// Log React availability status
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

// Set up global error handlers after everything else
setupGlobalErrorHandlers();

// Ensure React is definitely available before rendering
if (window.React && window.ReactDOM && document.getElementById("root")) {
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
  }
} else {
  console.error("Critical error: React or DOM root not available for rendering", {
    reactAvailable: !!window.React,
    reactDOMAvailable: !!window.ReactDOM,
    rootElement: !!document.getElementById("root")
  });
}
