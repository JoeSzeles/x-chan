
/**
 * Utility functions to handle common error scenarios and cleanup
 */

// Global variable to hold React once it's available
let reactInstance = null;

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
 * Ensures the global object is properly set up
 */
const ensureGlobalObject = () => {
  if (typeof window.g === 'undefined') {
    // Create a non-configurable global object that can't be deleted
    Object.defineProperty(window, 'g', {
      value: {},
      writable: true,
      enumerable: true,
      configurable: false // Make it non-deletable
    });
    console.log('Created permanent global object g');
  }
  return window.g;
};

/**
 * Emergency React injector with multiple fallback approaches
 */
export const injectReactGlobally = () => {
  try {
    ensureGlobalObject();
    
    // Get React from known sources
    const possibleReactSources = [
      window.React,
      reactInstance,
      window.ReactModule,
      window._React,
      require('react')
    ];
    
    // Use the first valid React source
    const reactSource = possibleReactSources.find(source => 
      source && typeof source === 'object' && typeof source.createElement === 'function'
    );
    
    if (!reactSource) {
      console.error('No valid React source found for injection');
      return false;
    }
    
    // Store it in our module variable
    reactInstance = reactSource;
    
    // Set React on window with full descriptor to prevent deletion
    Object.defineProperty(window, 'React', {
      value: reactSource,
      writable: true,
      enumerable: true,
      configurable: false // Make it non-deletable
    });
    
    // Set on global object with full descriptor
    Object.defineProperty(window.g, 'React', {
      value: reactSource,
      writable: true,
      enumerable: true,
      configurable: false // Make it non-deletable
    });
    
    // Also store as _React for backup
    window._React = reactSource;
    
    console.log('React injected globally with enhanced protection');
    
    // Verify our setup
    if (window.React && window.g.React) {
      console.log('React verification successful');
      return true;
    } else {
      console.error('React verification failed after injection');
      return false;
    }
  } catch (error) {
    console.error('Failed to inject React globally:', error);
    return false;
  }
};

/**
 * Initializes React globally - robust approach that works with bundled code
 */
export const initializeReactGlobally = () => {
  ensureGlobalObject();
  
  console.log('Initializing React globally...');
  
  // Find React in the global scope or try to require it
  try {
    // First, check if React is already available in window
    if (window.React && typeof window.React.createElement === 'function') {
      reactInstance = window.React;
      console.log('React found on window');
    } 
    // If we got here from ESModule imports, it might be in ReactModule
    else if (window.ReactModule && typeof window.ReactModule.createElement === 'function') {
      reactInstance = window.ReactModule;
      console.log('React loaded from ReactModule');
    }
    // Last resort - try CommonJS require if available
    else {
      try {
        // This will only work in certain environments
        const requiredReact = require('react');
        if (requiredReact && typeof requiredReact.createElement === 'function') {
          reactInstance = requiredReact;
          console.log('React loaded via require');
        }
      } catch (err) {
        console.warn('Could not require React:', err);
      }
    }
    
    // If we have React, define it globally with non-configurable descriptors
    if (reactInstance) {
      // Define on window as non-configurable
      Object.defineProperty(window, 'React', {
        value: reactInstance,
        writable: true,
        enumerable: true,
        configurable: false // Make it non-deletable
      });
      
      // Define on global object as non-configurable
      Object.defineProperty(window.g, 'React', {
        value: reactInstance,
        writable: true, 
        enumerable: true,
        configurable: false // Make it non-deletable
      });
      
      // Also create backup copies
      window._React = reactInstance;
      window.g._React = reactInstance;
      
      console.log('React defined globally on window and g');
      return true;
    }
    
    console.warn('Could not initialize React globally - no valid React instance found');
    return false;
  } catch (error) {
    console.error('Error initializing React globally:', error);
    return false;
  }
};

/**
 * Creates a ReactProxy that forwards all calls to the real React
 * This helps deal with timing issues where React might be loaded later
 */
const createReactProxy = () => {
  const handler = {
    get: function(target, prop) {
      // Always get the latest React instance
      const latestReact = window.React || reactInstance || window.g?.React || window._React;
      
      if (!latestReact) {
        console.error(`React not found when accessing property: ${String(prop)}`);
        return undefined;
      }
      
      // Return the property from the latest React
      return latestReact[prop];
    }
  };
  
  return new Proxy({}, handler);
};

/**
 * Sets up global error handlers to manage common errors
 */
export const setupGlobalErrorHandlers = () => {
  // Create global object first
  ensureGlobalObject();
  
  // Handle SES warnings
  fixSESWarnings();
  
  // Initialize React globally first thing
  initializeReactGlobally();
  
  // Create a React proxy for insurance
  const reactProxy = createReactProxy();
  
  // Add as a fallback if direct access fails
  if (!window.g.React) {
    window.g.React = reactProxy;
  }
  
  // Set up a MutationObserver to watch for React in the DOM
  try {
    const observer = new MutationObserver(() => {
      // If React appears in the document, grab it
      if (window.React && !reactInstance) {
        reactInstance = window.React;
        injectReactGlobally();
      }
    });
    
    // Start observing
    observer.observe(document.documentElement, { 
      childList: true, 
      subtree: true 
    });
  } catch (e) {
    console.error('Error setting up MutationObserver:', e);
  }
  
  // Monkey patch createElement to ensure React is available
  try {
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName, options) {
      const element = originalCreateElement.call(document, tagName, options);
      
      // When creating script tags, inject React
      if (tagName.toLowerCase() === 'script') {
        setTimeout(injectReactGlobally, 0); // Schedule React injection
      }
      
      return element;
    };
  } catch (e) {
    console.error('Error patching createElement:', e);
  }
  
  // Proactively set React on window object after slight delay 
  // (handles race conditions)
  setTimeout(() => {
    injectReactGlobally();
  }, 50);
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    
    // Handle React is undefined errors
    if (event.reason && event.reason.message && 
        (event.reason.message.includes('React is undefined') || 
         event.reason.message.includes('g.React is undefined'))) {
      console.warn('React undefined error in promise, injecting React...');
      injectReactGlobally();
    }
    
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
    // Handle React undefined errors
    if (event.error && event.error.message && 
        (event.error.message.includes('React is undefined') || 
         event.error.message.includes('g.React is undefined'))) {
      console.warn('React undefined error, injecting React...');
      injectReactGlobally();
      
      // Try to prevent default error handling
      event.preventDefault();
      return false;
    }
    
    // Check for specific JSON parse errors
    if (event.error instanceof SyntaxError && 
        event.error.message.includes('JSON.parse')) {
      console.warn('Caught JSON parsing error, attempting recovery...');
      fixJsonParsingErrors();
    }
  }, true);
  
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

// Add a safeguard function to check/fix g.React periodically
export const monitorReactAvailability = () => {
  const checkInterval = setInterval(() => {
    // If g.React is missing but window.React exists, restore it
    if (!window.g?.React && window.React) {
      console.warn("g.React missing but window.React exists - restoring");
      injectReactGlobally();
    }
  }, 1000); // Check every second
  
  // Clean up after 30 seconds (once app is stable)
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 30000);
};

// Auto-initialization - Run immediately when this file is imported
initializeReactGlobally();
monitorReactAvailability();

// Expose a function to get the React instance
export const getReactInstance = () => {
  return window.React || reactInstance || window.g?.React || window._React;
};
