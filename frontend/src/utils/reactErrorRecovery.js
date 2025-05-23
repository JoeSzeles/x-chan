
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
const DEBUG_LEVEL = 2; // 0=none, 1=errors only, 2=all logs

// Debug logger with levels
const debug = (message, level = 2, ...args) => {
  if (DEBUG_LEVEL >= level) {
    if (level === 1) {
      console.error(`[ReactRecovery] ${message}`, ...args);
    } else {
      console.log(`[ReactRecovery] ${message}`, ...args);
    }
  }
};

// Detailed object inspection for debugging
const inspectReactObject = (obj) => {
  if (!obj) return "null or undefined";
  try {
    return {
      exists: !!obj,
      type: typeof obj,
      hasCreateElement: typeof obj.createElement === 'function',
      hasUseState: typeof obj.useState === 'function',
      hasUseEffect: typeof obj.useEffect === 'function',
      version: obj.version || 'unknown',
      keys: Object.keys(obj).slice(0, 10).join(', ') + (Object.keys(obj).length > 10 ? '...' : '')
    };
  } catch (e) {
    return `Error inspecting: ${e.message}`;
  }
};

// Store the React reference when available
export const cacheReactReference = (reactInstance) => {
  if (reactInstance && typeof reactInstance === 'object') {
    const reactInfo = inspectReactObject(reactInstance);
    debug(`Caching React reference: ${JSON.stringify(reactInfo)}`, 2);
    _cachedReact = reactInstance;
    return true;
  }
  debug("Failed to cache React reference - invalid instance", 1);
  return false;
};

// Get the cached React reference
export const getCachedReact = () => {
  if (_cachedReact) {
    debug("Retrieved cached React reference", 2);
    return _cachedReact;
  }
  debug("No cached React reference available", 1);
  return null;
};

// Log the global React state
export const logReactGlobalState = () => {
  debug("Current React global state:", 2, {
    windowReact: inspectReactObject(window.React),
    gReact: inspectReactObject(window.g?.React),
    cachedReact: inspectReactObject(_cachedReact),
    recoveryAttempts: _recoveryAttempts
  });
};

// Force React to be available globally with enhanced recovery
export const injectReactGlobally = () => {
  debug(`Attempting to inject React globally (attempt ${_recoveryAttempts + 1}/${MAX_RECOVERY_ATTEMPTS})`, 2);
  
  try {
    // Log initial state
    debug("Initial global state:", 2, {
      windowReactExists: !!window.React,
      gExists: !!window.g,
      gReactExists: !!(window.g && window.g.React)
    });
    
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
    
    if (reactInstance) {
      debug("Found valid React instance to use for recovery", 2, inspectReactObject(reactInstance));
    } else {
      debug("No valid React instance found for recovery", 1);
      
      // Try to get React from any React component on the page
      try {
        const reactComponents = Array.from(document.querySelectorAll('[data-reactroot]'));
        debug(`Found ${reactComponents.length} React components in DOM`, 2);
        
        // Last ditch effort - try to dynamically import React if in development
        debug("Attempting last-resort React recovery...", 1);
        
        const mockReact = {
          createElement: (...args) => {
            debug("Mock React createElement called", 2);
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
        
        debug("Used fallback method to inject React globally:", 1, inspectReactObject(mockReact));
        
        // Assign the mock React to avoid total failure
        window.React = mockReact;
        if (window.g) window.g.React = mockReact;
        
        // Try to dynamically import React in modern browsers
        if (typeof window.importScripts === 'function') {
          debug("Attempting dynamic import of React via importScripts", 2);
          try {
            window.importScripts('https://unpkg.com/react@17/umd/react.development.js');
            debug("Successfully imported React from CDN", 2);
          } catch (importErr) {
            debug("Failed to import React from CDN", 1, importErr);
          }
        }
        
        _recoveryAttempts++;
        return false; // Return false to indicate we didn't find a real React
      } catch (fallbackError) {
        debug("Even last-resort React recovery failed:", 1, fallbackError);
        _recoveryAttempts++;
        return false;
      }
    }
    
    // Force non-configurable properties for better persistence
    try {
      // Create window.g if it doesn't exist
      if (!window.g) {
        debug("Creating window.g object", 2);
        Object.defineProperty(window, 'g', {
          value: {},
          writable: true,
          enumerable: true,
          configurable: false
        });
      }
      
      // Basic direct assignment first for immediate recovery
      debug("Performing direct React assignments", 2);
      window.React = reactInstance;
      window.g.React = reactInstance;
      
      // Clean up any existing React references to avoid conflicts
      try {
        debug("Cleaning existing React references to avoid conflicts", 2);
        // Store temporary references to avoid loss during cleanup
        const tempReact = reactInstance;
        
        if (window.React && window.React !== reactInstance) {
          debug("Removing inconsistent window.React reference", 2);
          delete window.React;
        }
        
        if (window.g && window.g.React && window.g.React !== reactInstance) {
          debug("Removing inconsistent window.g.React reference", 2);
          delete window.g.React;
        }
      } catch (cleanupError) {
        debug("Could not clean existing React references:", 1, cleanupError);
      }
      
      // Then try to make it more robust with defineProperty
      try {
        // Define React as non-configurable on both window and g
        debug("Defining React with Object.defineProperty", 2);
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
        
        debug("Successfully defined React with Object.defineProperty", 2);
      } catch (propError) {
        debug("defineProperty failed, but direct assignment succeeded:", 1, propError);
      }
      
      // Extra backup references
      window._React = reactInstance;
      window.g._React = reactInstance;
      window.ReactBackup = reactInstance;
      window.g.ReactBackup = reactInstance;
      
      // Add special getters to always return React
      try {
        // These getters will dynamically attempt to return React
        debug("Adding React getter functions", 2);
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
        
        // Add a special recovery function that can be called from anywhere
        window.__recoverReact = () => {
          debug("Manual React recovery triggered", 2);
          return injectReactGlobally();
        };
      } catch (getterError) {
        debug("Failed to add React getters:", 1, getterError);
      }
      
      // Log the result
      logReactGlobalState();
      
      _recoveryAttempts = 0;
      debug("React successfully injected globally", 2);
      return true;
    } catch (e) {
      debug("Failed to inject React with Object.defineProperty, falling back to direct assignment", 1, e);
      
      // Direct assignment fallback
      window.React = reactInstance;
      if (window.g) window.g.React = reactInstance;
      window._React = reactInstance;
      if (window.g) window.g._React = reactInstance;
      
      logReactGlobalState();
      
      _recoveryAttempts = 0;
      debug("React injected with fallback method", 2);
      return true;
    }
  } catch (e) {
    debug("Error injecting React globally:", 1, e);
    _recoveryAttempts++;
    
    if (_recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
      debug("Max recovery attempts reached", 1);
      return false;
    }
    
    return false;
  }
};

// Function to detect React reference loss and attempt recovery
export const monitorAndRecoverReact = () => {
  // Check if React is missing from expected locations
  const reactMissing = !window.React || !window.g?.React;
  
  if (reactMissing) {
    debug("React reference loss detected", 1);
    
    if (_cachedReact) {
      debug("Attempting recovery using cached React", 2);
      return injectReactGlobally();
    } else {
      debug("No cached React available for recovery", 1);
    }
  }
  
  return !reactMissing;
};

// Setup MutationObserver to detect when React is lost during DOM updates
export const setupReactReferenceProtection = () => {
  try {
    debug("Setting up React reference protection", 2);
    
    // Create a MutationObserver to watch for DOM changes
    const observer = new MutationObserver(() => {
      // Check for React reference loss during DOM updates
      if (!window.React || !window.g?.React) {
        debug("React reference lost during DOM update", 1);
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
      if (!monitorAndRecoverReact()) {
        debug("Scheduled check found React reference missing", 1);
      }
    }, 2000);
    
    // Add a one-time check after initial load
    setTimeout(() => {
      debug("Performing initial stability check", 2);
      monitorAndRecoverReact();
      logReactGlobalState();
    }, 5000);
    
    // Clean up after 5 minutes (app should be stable by then)
    setTimeout(() => {
      debug("Cleaning up monitoring interval", 2);
      clearInterval(interval);
      // Add one final check
      monitorAndRecoverReact();
    }, 300000);
    
    // Detect Vite HMR events which can cause React reference loss
    if (window.__vite_hmr) {
      debug("Vite HMR detected, adding protection", 2);
      const originalHMR = window.__vite_hmr;
      window.__vite_hmr = (...args) => {
        debug("Vite HMR event triggered, checking React", 2);
        monitorAndRecoverReact();
        return originalHMR(...args);
      };
    }
    
    // Protect against iframe sandbox issues that may cause React loss
    if (window.top !== window.self) {
      debug("Application running in iframe, adding extra protection", 2);
      // Additional iframe-specific protections
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'react-check') {
          debug("Received react-check message, verifying React", 2);
          monitorAndRecoverReact();
        }
      });
    }
    
    debug("React reference protection setup complete", 2);
    return true;
  } catch (e) {
    debug("Failed to setup React reference protection:", 1, e);
    return false;
  }
};

// Special fix for SES (Secure EcmaScript) environment issues in Replit
export const fixSESEnvironmentIssues = () => {
  try {
    debug("Applying SES environment fixes", 2);
    
    // Remove problematic localStorage items that can interfere with React
    if (window.localStorage) {
      const sesItems = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('SES') || key.includes('harden'))) {
          sesItems.push(key);
        }
      }
      
      if (sesItems.length > 0) {
        debug(`Removing ${sesItems.length} SES-related localStorage items`, 2);
        sesItems.forEach(key => localStorage.removeItem(key));
      }
    }
    
    // Fix object prototype issues that SES might create
    try {
      debug("Checking for SES-modified prototypes", 2);
      const originalCreateElement = document.createElement;
      
      // Restore any tampered DOM methods
      if (originalCreateElement.toString().includes('SES') || 
          originalCreateElement.toString().includes('frozen')) {
        debug("Detected SES-modified createElement, attempting fix", 1);
        // This is a last resort that might not work in all cases
        // but worth trying in desperate situations
        try {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
          const cleanDocument = iframe.contentDocument;
          const cleanCreateElement = cleanDocument.createElement.bind(document);
          document.createElement = cleanCreateElement;
          document.body.removeChild(iframe);
          debug("Applied fix for modified createElement", 2);
        } catch (iframeError) {
          debug("Failed to fix createElement via iframe", 1, iframeError);
        }
      }
    } catch (prototypeError) {
      debug("Error checking for SES prototype modifications", 1, prototypeError);
    }
    
    debug("SES environment fixes applied", 2);
    return true;
  } catch (e) {
    debug("Failed to apply SES environment fixes:", 1, e);
    return false;
  }
};

// Function to check for and fix React-related window/global pollution
export const cleanupGlobalReactPollution = () => {
  try {
    debug("Checking for global React pollution", 2);
    
    // List of problematic global variables that might interfere with React
    const problematicGlobals = [
      '__REACT_DEVTOOLS_GLOBAL_HOOK__', 
      '__REACT_DEVTOOLS_APPEND_COMPONENT_STACK__',
      '__REACT_DEVTOOLS_BREAK_ON_CONSOLE_ERRORS__',
      '__REACT_DEVTOOLS_COMPONENT_FILTERS__'
    ];
    
    let fixedItems = 0;
    
    problematicGlobals.forEach(key => {
      if (window[key] && typeof window[key] === 'object') {
        debug(`Found potentially problematic global: ${key}`, 2);
        
        // Don't delete, just clean up any error-causing properties
        if (key === '__REACT_DEVTOOLS_GLOBAL_HOOK__') {
          try {
            if (window[key].renderers && window[key].renderers.size > 0) {
              debug("Cleaning up React DevTools hook renderers", 2);
              window[key].renderers = new Map();
              fixedItems++;
            }
          } catch (hookError) {
            debug(`Error cleaning ${key}:`, 1, hookError);
          }
        }
      }
    });
    
    debug(`Finished checking for global pollution, fixed ${fixedItems} items`, 2);
    return true;
  } catch (e) {
    debug("Error during global pollution cleanup:", 1, e);
    return false;
  }
};

// Initialize everything on import
fixSESEnvironmentIssues();
cleanupGlobalReactPollution();
setupReactReferenceProtection();
