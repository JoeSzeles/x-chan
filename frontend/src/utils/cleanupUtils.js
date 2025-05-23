
/**
 * Utility functions to handle common error scenarios and cleanup
 */

/**
 * Attempts to fix SES (Secure ECMAScript) related errors
 * The warnings about dateTaming and mathTaming are deprecation notices from Replit
 */
export const fixSESWarnings = () => {
  // Clear localStorage items that might contain problematic SES configurations
  try {
    // Remove any Replit-specific SES items if they exist
    const storageKeys = Object.keys(localStorage);
    const sesRelatedKeys = storageKeys.filter(key => 
      key.includes('ses') || key.includes('lockdown') || key.includes('harden')
    );
    
    sesRelatedKeys.forEach(key => localStorage.removeItem(key));
    console.log('Cleared SES-related localStorage items');
    
    // Suppress SES warnings in console
    const originalConsoleWarn = console.warn;
    console.warn = function(...args) {
      // Filter out SES deprecation warnings
      if (args.length > 0 && typeof args[0] === 'string' && 
         (args[0].includes('dateTaming') || args[0].includes('mathTaming'))) {
        return; // Don't log these warnings
      }
      originalConsoleWarn.apply(console, args);
    };
    
    return true;
  } catch (error) {
    console.error('Error clearing SES items:', error);
    return false;
  }
};

/**
 * Handles JSON parsing errors by clearing related caches
 */
export const fixJsonParsingErrors = () => {
  try {
    // Clear query cache that might contain malformed JSON
    if (window.__REACT_QUERY_GLOBAL_CACHE__) {
      window.__REACT_QUERY_GLOBAL_CACHE__.clear();
      console.log('Cleared React Query cache');
    }
    return true;
  } catch (error) {
    console.error('Error clearing caches:', error);
    return false;
  }
};

/**
 * Sets up global error handlers to manage common errors
 */
/**
 * Exposes React globally to prevent 'g.React is undefined' errors
 * This makes React available early and adds getter protection
 */
export const exposeReactGlobally = () => {
  try {
    // Import React synchronously if possible (for faster access)
    const React = window.React || require('react');
    
    // Set React on window
    window.React = React;
    
    // Set React on g (global) which appears in error messages
    if (!window.g) {
      // Define window.g with getter for React that ensures it's always available
      Object.defineProperty(window, 'g', {
        value: {},
        writable: true,
        configurable: true
      });
    }
    
    // Add React to g with a getter that always returns the current window.React
    Object.defineProperty(window.g, 'React', {
      get: function() {
        return window.React;
      },
      configurable: true
    });
    
    // Also define window.g.React directly to ensure it's immediately available
    window.g.React = React;
    
    console.log('React exposed globally with getter protection');
    return true;
  } catch (err) {
    console.error('Failed to expose React synchronously, trying async approach');
    
    // Define a proxy getter for g.React to handle asynchronous loading
    if (!window.g) {
      window.g = {};
    }
    
    // If synchronous approach fails, try dynamic import
    import('react').then(React => {
      window.React = React;
      window.g.React = React;
      console.log('React exposed globally via async import');
    }).catch(err => {
      console.error('Both sync and async React exposure failed:', err);
    });
    
    return false;
  }
};

export const setupGlobalErrorHandlers = () => {
  // Handle SES warnings
  fixSESWarnings();
  
  // Expose React globally - do this first before any other operations
  exposeReactGlobally();
  
  // Add a safety mechanism to catch React not found errors early and fix them
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    // Every time a script element is created, ensure React is globally available
    if (tagName.toLowerCase() === 'script') {
      exposeReactGlobally();
    }
    return originalCreateElement.apply(document, arguments);
  };
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    
    // Handle JSON parsing errors
    if (event.reason instanceof SyntaxError && 
        event.reason.message.includes('JSON.parse')) {
      console.log('Attempting to fix JSON parsing error...');
      fixJsonParsingErrors();
    }
    
    // Prevent the default browser behavior (console error)
    event.preventDefault();
  });
  
  // Handle general errors
  window.addEventListener('error', (event) => {
    // Check for specific JSON parse errors
    if (event.error instanceof SyntaxError && 
        event.error.message.includes('JSON.parse')) {
      console.warn('Caught JSON parsing error, attempting recovery...');
      fixJsonParsingErrors();
    }
    
    // Handle React undefined errors
    if (event.error instanceof TypeError && 
        event.error.message.includes('React is undefined')) {
      console.warn('React undefined error detected, attempting recovery...');
      // Try to re-expose React
      try {
        import('react').then(React => {
          window.React = React;
          if (typeof window.g === 'object') window.g.React = React;
          console.log('Re-exposed React globally after error');
        });
      } catch (e) {
        console.error('Failed to recover from React undefined error:', e);
      }
    }
  });
  
  // Override fetch to handle MIME type issues
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      return response;
    } catch (error) {
      // If there's a MIME type error, retry with no-cache
      if (error.message && error.message.includes('MIME type')) {
        console.log('MIME type error detected, retrying with no-cache...');
        const [resource, config] = args;
        const newConfig = { 
          ...config, 
          cache: 'no-cache',
          headers: { 
            ...config?.headers,
            'Cache-Control': 'no-cache'
          }
        };
        return originalFetch(resource, newConfig);
      }
      throw error;
    }
  };
  
  console.log('Global error handlers set up successfully');
};
