// Import React and ReactDOM directly with namespace imports
import * as ReactModule from "react";
import * as ReactDOMModule from "react-dom/client";

// Import App component
import App from "./App";

// Import styles
import "./index.css";

// Import error boundary early
import ErrorBoundary from "./components/common/ErrorBoundary";

// Import React error recovery utilities
import {
  cacheReactReference,
  injectReactGlobally,
  setupReactReferenceProtection,
  fixSESEnvironmentIssues
} from './utils/reactErrorRecovery';

// Cache React immediately
console.log("Caching React reference...");
cacheReactReference(ReactModule);

// Force React to be available globally
console.log("Making React globally available...");
injectReactGlobally();

// Create an initialization function to ensure React is available
const initializeApp = () => {
  try {
    console.log("Initializing application...");

    // Check React availability
    if (!window.React) {
      console.error("React not available on window! Attempting recovery...");
      if (!injectReactGlobally()) {
        console.error("Failed to recover React! Will try one more time...");
        // Last attempt with direct assignment
        window.React = ReactModule;
        window.g = window.g || {};
        window.g.React = ReactModule;
      }
    }

    // Log detailed React status to help debug
    console.log("React global status:", {
      "window.React exists": !!window.React,
      "window.g.React exists": !!(window.g && window.g.React),
      "cached React exists": !!ReactModule
    });

    // Mount the application with error boundary
    const root = ReactDOMModule.createRoot(document.getElementById("root"));

    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );

    console.log("Application successfully rendered");

    // Setup global error handlers to catch React-specific issues
    window.addEventListener('error', (event) => {
      if (event.error && event.error.message && 
          (event.error.message.includes('React') || 
           event.error.message.includes('react'))) {
        console.error("React-related error caught:", event.error);
        injectReactGlobally();
      }
    });

    // Monitor for React availability issues
    setInterval(() => {
      if (!window.React || !window.g?.React) {
        console.warn("React reference lost! Attempting recovery...");
        injectReactGlobally();
      }
    }, 10000);

  } catch (error) {
    console.error("Fatal error during initialization:", error);

    // Try to render a basic error message
    document.getElementById("root").innerHTML = `
      <div style="padding: 20px; background: #f8d7da; color: #842029; border-radius: 5px;">
        <h2>Application Failed to Initialize</h2>
        <p>We encountered a problem starting the application. Please try refreshing the page.</p>
        <pre style="background: #f1f1f1; padding: 10px; border-radius: 5px; margin-top: 10px; overflow: auto;">${error.toString()}</pre>
        <button onclick="window.location.reload()" style="margin-top: 15px; padding: 8px 16px; background: #0d6efd; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
};

// Apply immediate fixes for SES environment
fixSESEnvironmentIssues();

// Add the application initialization to the load event to ensure DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM already loaded, initialize immediately
  initializeApp();
}

// Add fallback initialization in case DOMContentLoaded doesn't fire
setTimeout(() => {
  if (!document.getElementById("root")?.childElementCount) {
    console.warn("Application not initialized after timeout, forcing initialization");
    initializeApp();
  }
}, 2000);