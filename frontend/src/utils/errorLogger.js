
// Error logging utility
const logError = (error, context = {}) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    type: error.name,
    context,
    timestamp: new Date().toISOString(),
    url: window.location.href
  };
  
  console.error('[Error Logger]', errorLog);
  
  // Log to analytics or error tracking service if needed
  try {
    // Send to backend for logging
    fetch('/api/logs/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorLog)
    }).catch(console.error);
  } catch (e) {
    console.error('[Error Logger] Failed to send error log:', e);
  }
};

// CSP violation logger
const logCSPViolation = (event) => {
  const violation = {
    blockedURI: event.blockedURI,
    violatedDirective: event.violatedDirective,
    originalPolicy: event.originalPolicy,
    timestamp: new Date().toISOString(),
    url: window.location.href
  };
  
  console.warn('[CSP Violation]', violation);
};

export { logError, logCSPViolation };
