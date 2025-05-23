
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

// Force React to be available globally
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
      return false;
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
      
      // Extra backup references
      window._React = reactInstance;
      window.g._React = reactInstance;
      
      _recoveryAttempts = 0;
      console.log("React successfully injected globally");
      return true;
    } catch (e) {
      console.warn("Failed to inject React with Object.defineProperty, falling back to direct assignment");
      
      // Direct assignment fallback
      window.React = reactInstance;
      window.g.React = reactInstance;
      window._React = reactInstance;
      window.g._React = reactInstance;
      
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
