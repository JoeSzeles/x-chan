
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
export const setupGlobalErrorHandlers = () => {
  // Handle SES warnings
  fixSESWarnings();
  
  // Ensure React is properly exposed globally to prevent "g.React is undefined" errors
  try {
    // Import React dynamically to ensure it's available
    import('react').then(React => {
      // Make React available on window/global for libraries that might look for it there
      window.React = React;
      
      // Also ensure it's available on 'g' which appears in the error message
      if (typeof window.g === 'object') {
        window.g.React = React;
      } else {
        window.g = { React };
      }
      
      console.log('React exposed globally to prevent reference errors');
    }).catch(err => {
      console.error('Failed to expose React globally:', err);
    });
  } catch (error) {
    console.error('Error setting up global React reference:', error);
  }
  
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
