
import React, { useEffect, useState } from 'react';

const LogoDebugger = () => {
  const [debugInfo, setDebugInfo] = useState({
    logoLoaded: false,
    attempts: 0,
    errors: [],
    paths: []
  });
  
  useEffect(() => {
    // Try to load the logo from different paths
    const paths = [
      '/xchan_small.png',
      '/images/xchan_small.png',
      '/images/xchan.png',
      '/avatar-placeholder.png'
    ];
    
    setDebugInfo(prev => ({...prev, paths}));
    
    paths.forEach(path => {
      const img = new Image();
      img.onload = () => {
        console.log(`LOGO DEBUG: Successfully loaded from ${path}`);
        setDebugInfo(prev => ({
          ...prev,
          logoLoaded: true,
          loadedPath: path,
          attempts: prev.attempts + 1
        }));
      };
      
      img.onerror = (e) => {
        console.error(`LOGO DEBUG: Failed to load from ${path}`, e);
        setDebugInfo(prev => ({
          ...prev,
          errors: [...prev.errors, path],
          attempts: prev.attempts + 1
        }));
      };
      
      img.src = path;
    });
  }, []);
  
  // Only render in development
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 9999,
      fontSize: '12px',
      maxWidth: '300px',
      maxHeight: '200px',
      overflow: 'auto'
    }}>
      <h3>Logo Debug Info</h3>
      <p>Loaded: {debugInfo.logoLoaded ? 'Yes' : 'No'}</p>
      {debugInfo.logoLoaded && <p>Path: {debugInfo.loadedPath}</p>}
      <p>Attempts: {debugInfo.attempts}</p>
      <p>Failed paths: {debugInfo.errors.join(', ') || 'None'}</p>
    </div>
  );
};

export default LogoDebugger;
