
/**
 * React Error Recovery Utility
 * 
 * This utility provides tools to detect and recover from React reference loss issues
 * that can occur in the Replit environment.
 */

// Store a reference to React when it's available
let _cachedReact = null;
let _recoveryAttempts = 0;
const MAX_RECOVERY_ATTEMPTS = 5;

// Store the React reference when available
export const cacheReactReference = (reactInstance) => {
  if (reactInstance && typeof reactInstance === 'object') {
    _cachedReact = reactInstance;
    return true;
  }
  return false;
};

// Get the cached React reference
export const getCachedReact = () => _cachedReact;

// Force React to be available globally with enhanced recovery
export const injectReactGlobally = () => {
  try {
    // Try multiple sources to find React
    const reactSources = [
      _cachedReact,                 // Our cached instance
      window.React,                 // Direct window reference
      window.ReactModule,           // From main.jsx import
      window._React,                // Backup reference
      window.g?.React,              // From g object
      window.g?._React              // Backup on g
    ];
    
    // Find the first valid React instance
    const reactInstance = reactSources.find(r => r && typeof r === 'object' && r.createElement);
    
    if (!reactInstance) {
      console.error("No valid React instance found for recovery");
      
      // Last ditch effort - try to dynamically import React
      try {
        // This is a fallback technique that might work in some contexts
        console.log("Attempting last-resort React recovery...");
        
        const mockReact = {
          createElement: (...args) => {
            console.log("Mock React createElement called");
            return { type: args[0], props: args[1] || {}, children: args.slice(2) };
          },
          useState: (initial) => [initial, () => {}],
          useEffect: () => {},
          useMemo: (fn) => fn(),
          useCallback: (fn) => fn,
          useRef: (initial) => ({ current: initial }),
          Fragment: Symbol("Fragment"),
          version: "mock-16.14.0"
        };
        
        console.log("Used fallback method to inject React globally:", mockReact);
        
        // Assign the mock React to avoid total failure
        window.React = mockReact;
        if (window.g) window.g.React = mockReact;
        
        return false; // Return false to indicate we didn't find a real React
      } catch (fallbackError) {
        console.error("Even last-resort React recovery failed:", fallbackError);
        return false;
      }
    }
    
    // Force non-configurable properties for better persistence
    try {
      // Create window.g if it doesn't exist
      if (!window.g) {
        Object.defineProperty(window, 'g', {
          value: {},
          writable: true,
          enumerable: true,
          configurable: false
        });
      }
      
      // Basic direct assignment first for immediate recovery
      window.React = reactInstance;
      window.g.React = reactInstance;
      
      // Then try to make it more robust with defineProperty
      try {
        // Define React as non-configurable on both window and g
        Object.defineProperty(window, 'React', {
          value: reactInstance,
          writable: true,
          enumerable: true,
          configurable: false
        });
        
        Object.defineProperty(window.g, 'React', {
          value: reactInstance,
          writable: true,
          enumerable: true,
          configurable: false
        });
      } catch (propError) {
        console.warn("defineProperty failed, but direct assignment succeeded:", propError);
      }
      
      // Extra backup references
      window._React = reactInstance;
      window.g._React = reactInstance;
      
      // Add special getters to always return React
      try {
        // These getters will dynamically attempt to return React
        Object.defineProperty(window, '__getReact', {
          value: () => reactInstance,
          writable: false,
          enumerable: false,
          configurable: false
        });
        
        Object.defineProperty(window.g, '__getReact', { 
          value: () => reactInstance,
          writable: false,
          enumerable: false, 
          configurable: false
        });
      } catch (getterError) {
        console.warn("Failed to add React getters:", getterError);
      }
      
      _recoveryAttempts = 0;
      console.log("React successfully injected globally");
      return true;
    } catch (e) {
      console.warn("Failed to inject React with Object.defineProperty, falling back to direct assignment");
      
      // Direct assignment fallback
      window.React = reactInstance;
      if (window.g) window.g.React = reactInstance;
      window._React = reactInstance;
      if (window.g) window.g._React = reactInstance;
      
      _recoveryAttempts = 0;
      return true;
    }
  } catch (e) {
    console.error("Error injecting React globally:", e);
    _recoveryAttempts++;
    
    if (_recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
      console.error("Max recovery attempts reached");
      return false;
    }
    
    return false;
  }
};

// Function to detect React reference loss and attempt recovery
export const monitorAndRecoverReact = () => {
  // Check if React is missing from expected locations
  const reactMissing = !window.React || !window.g?.React;
  
  if (reactMissing && _cachedReact) {
    console.warn("React reference lost, attempting recovery");
    return injectReactGlobally();
  }
  
  return !reactMissing;
};

// Setup MutationObserver to detect when React is lost during DOM updates
export const setupReactReferenceProtection = () => {
  try {
    // Create a MutationObserver to watch for DOM changes
    const observer = new MutationObserver(() => {
      // Check for React reference loss during DOM updates
      if (!window.React || !window.g?.React) {
        console.warn("React reference lost during DOM update");
        injectReactGlobally();
      }
    });
    
    // Start observing the body for all changes
    observer.observe(document.body, { 
      childList: true, 
      subtree: true, 
      attributes: true 
    });
    
    // Set up interval check as a backup
    const interval = setInterval(() => {
      monitorAndRecoverReact();
    }, 2000);
    
    // Clean up after 5 minutes (app should be stable by then)
    setTimeout(() => {
      clearInterval(interval);
    }, 300000);
    
    return true;
  } catch (e) {
    console.error("Failed to setup React reference protection:", e);
    return false;
  }
};

// Initialize on import
setupReactReferenceProtection();
