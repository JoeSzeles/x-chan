
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
 * Global variable to hold React once it's available
 */
let reactInstance = null;

/**
 * Emergency React injector
 * This will inject React globally using multiple approaches
 */
export const injectReactGlobally = () => {
  try {
    // If we already have React, use that
    if (reactInstance) {
      // Emergency patching of global objects
      window.React = reactInstance;
      
      // Create g if it doesn't exist
      if (typeof window.g === 'undefined') {
        window.g = {};
      }
      
      // Direct assignment to g.React
      window.g.React = reactInstance;
      
      console.log('React globally injected from cached instance');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to inject React globally:', error);
    return false;
  }
};

/**
 * Initializes React globally - new approach that works with bundled code
 */
export const initializeReactGlobally = () => {
  // Only do this once
  if (reactInstance) return;
  
  console.log('Initializing React globally...');
  
  // Find React in the global scope or try to require it
  try {
    // First, check if React is already loaded through window
    if (window.React) {
      reactInstance = window.React;
      console.log('React found on window');
    } 
    // Fall back to getting from require
    else {
      try {
        const requiredReact = require('react');
        reactInstance = requiredReact;
        console.log('React loaded via require');
      } catch (err) {
        console.warn('Could not require React:', err);
      }
    }
    
    // If we have React, define it globally
    if (reactInstance) {
      // Define on window
      Object.defineProperty(window, 'React', {
        configurable: true,
        writable: true,
        value: reactInstance
      });
      
      // Create g object if it doesn't exist
      if (typeof window.g === 'undefined') {
        window.g = {};
      }
      
      // Define on g
      Object.defineProperty(window.g, 'React', {
        configurable: true,
        writable: true,
        value: reactInstance
      });
      
      console.log('React defined globally on window and g');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error initializing React globally:', error);
    return false;
  }
};

/**
 * Sets up global error handlers to manage common errors
 */
export const setupGlobalErrorHandlers = () => {
  // Handle SES warnings
  fixSESWarnings();
  
  // Initialize React globally first thing
  initializeReactGlobally();
  
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
        injectReactGlobally();
      }
      
      return element;
    };
  } catch (e) {
    console.error('Error patching createElement:', e);
  }
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    
    // Handle React is undefined errors
    if (event.reason && event.reason.message && 
        event.reason.message.includes('React is undefined')) {
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

// Auto-initialization - Run immediately when this file is imported
initializeReactGlobally();

// Expose a function to get the React instance
export const getReactInstance = () => reactInstance;
