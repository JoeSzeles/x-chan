// React caching mechanism
let reactInstance = null;

// Cache React reference
export const cacheReactInstance = (instance) => {
  reactInstance = instance;
  return instance;
};

// Get cached React instance
export const getReactInstance = () => {
  // Try multiple sources in order of preference
  return window.React || 
         reactInstance || 
         (window.g && window.g.React) || 
         window._React || 
         window.ReactModule;
};

// Make React available globally with robust property definitions
export const initializeReactGlobally = () => {
  console.log("Initializing React globally...");

  try {
    // Import React directly if we can
    const React = getReactInstance();

    if (!React) {
      console.warn("React not found in any global location");
      return false;
    }

    // Create global object if it doesn't exist
    if (!window.g) {
      try {
        Object.defineProperty(window, 'g', {
          value: {},
          writable: true,
          enumerable: true,
          configurable: false // Make it non-deletable
        });
      } catch (e) {
        console.error("Failed to create window.g:", e);
        // Fallback
        window.g = window.g || {};
      }
    }

    // Clear existing definitions to prevent conflicts
    try {
      if (window.g.React) delete window.g.React;
      if (window.React) delete window.React;
    } catch (e) {
      console.warn("Could not clean existing React references:", e);
    }

    // Apply React to all possible locations with robust definitions
    const applyReactTo = (obj, name) => {
      try {
        // First attempt: standard property assignment
        obj[name] = React;

        // Second attempt: define non-deletable property
        Object.defineProperty(obj, name, {
          value: React,
          writable: true,
          enumerable: true,
          configurable: false
        });

        return true;
      } catch (e) {
        console.error(`Failed to set ${name}:`, e);
        return false;
      }
    };

    // Apply React to multiple locations
    const windowSuccess = applyReactTo(window, 'React');
    const gSuccess = applyReactTo(window.g, 'React');

    // Create backup copies
    applyReactTo(window, '_React');
    applyReactTo(window.g, '_React');

    // Store the React module globally
    window.ReactModulePermanent = React;

    console.log("React defined globally on window and g");
    console.log("React availability:", {
      window: !!window.React,
      g: !!(window.g && window.g.React),
      backup: !!window._React
    });

    return windowSuccess && gSuccess;
  } catch (e) {
    console.error("Failed to initialize React globally:", e);
    return false;
  }
};

// Add safeguard to check/fix g.React periodically
export const monitorReactAvailability = () => {
  // First check immediately
  injectReactGlobally();

  // Then check periodically
  const checkInterval = setInterval(() => {
    // If g.React is missing but window.React exists, restore it
    if ((!window.g?.React || !window.React) && getReactInstance()) {
      console.warn("React references missing but instance exists - restoring");
      injectReactGlobally();
    }
  }, 500); // Check frequently at first

  // Continue monitoring but less frequently after initial load
  setTimeout(() => {
    clearInterval(checkInterval);

    // Set up a longer-term monitor
    const longTermInterval = setInterval(() => {
      if ((!window.g?.React || !window.React) && getReactInstance()) {
        console.warn("Long-term monitor: React references missing - restoring");
        injectReactGlobally();
      }
    }, 5000); // Check every 5 seconds

    // Clean up after 5 minutes (once app is definitely stable)
    setTimeout(() => {
      clearInterval(longTermInterval);
    }, 300000);
  }, 30000);
};

// Force React injection - use this as a recovery mechanism
export const injectReactGlobally = () => {
  try {
    // Get React from any available source
    const React = getReactInstance();

    if (!React) {
      console.error("No React instance available for injection");
      return false;
    }

    // Ensure g exists
    if (!window.g) window.g = {};

    // Set React on both window and g
    window.React = React;
    window.g.React = React;
    window._React = React;
    window.g._React = React;

    // Also make a permanent backup
    window.ReactBackup = React;

    console.log("React injected globally to all locations");
    return true;
  } catch (e) {
    console.error("Failed to inject React globally:", e);
    return false;
  }
};

// Clear SES-related localStorage items that might be causing issues
export const clearSESLocalStorage = () => {
  try {
    // List of known SES-related localStorage keys
    const sesKeys = [
      'lockdown',
      'ses-lockdown',
      'ses-*'
    ];

    // Clear specific keys
    sesKeys.forEach(keyPattern => {
      if (keyPattern.includes('*')) {
        // Handle wildcard pattern
        const prefix = keyPattern.replace('*', '');

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            localStorage.removeItem(key);
          }
        }
      } else if (localStorage.getItem(keyPattern) !== null) {
        localStorage.removeItem(keyPattern);
      }
    });

    console.log("Cleared SES-related localStorage items");
    return true;
  } catch (e) {
    console.error("Failed to clear SES localStorage:", e);
    return false;
  }
};

// Set up global error handlers for React-related errors
export const setupGlobalErrorHandlers = () => {
  try {
    // Add global error handler
    window.addEventListener('error', (event) => {
      if (event.error && event.error.message && 
          (event.error.message.includes('React is undefined') || 
           event.error.message.includes('g.React is undefined'))) {

        console.error("Caught React undefined error:", event.error);

        // Try to fix the issue
        const fixed = injectReactGlobally();

        if (fixed) {
          console.log("Attempted to fix React reference after error");
        }
      }
    });

    // Add unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && typeof event.reason.message === 'string' && 
          (event.reason.message.includes('React is undefined') || 
           event.reason.message.includes('g.React is undefined'))) {

        console.error("Caught unhandled React undefined promise rejection:", event.reason);

        // Try to fix the issue
        const fixed = injectReactGlobally();

        if (fixed) {
          console.log("Attempted to fix React reference after promise rejection");
        }
      }
    });

    console.log("Global error handlers set up successfully");
    return true;
  } catch (e) {
    console.error("Failed to set up global error handlers:", e);
    return false;
  }
};

// Initialize on import
clearSESLocalStorage();
setupGlobalErrorHandlers();
monitorReactAvailability();