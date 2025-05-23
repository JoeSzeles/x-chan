
import React, { useState, useEffect } from 'react';

const Logo = ({ size = 'normal' }) => {
  const [logoSrc, setLogoSrc] = useState('/xchan_small.png');
  const [isError, setIsError] = useState(false);
  
  useEffect(() => {
    // Force reload the image with a timestamp to bypass cache
    setLogoSrc(`/xchan_small.png?v=${new Date().getTime()}`);
  }, []);

  const handleError = () => {
    console.error("Logo failed to load");
    setIsError(true);
    // Try loading with alternate URL
    setLogoSrc(`${window.location.origin}/xchan_small.png?fallback=true&t=${new Date().getTime()}`);
  };

  const dimensions = size === 'small' ? 'w-8 h-8' : 'w-10 h-10';

  if (isError) {
    // Fallback content when image fails
    return (
      <div className={`${dimensions} bg-blue-600 rounded-full flex items-center justify-center text-white font-bold`}>
        X
      </div>
    );
  }

  return (
    <img 
      src={logoSrc} 
      alt="XChan Logo" 
      className={`${dimensions} object-contain`}
      onError={handleError}
      style={{ imageRendering: "high-quality" }}
    />
  );
};

export default Logo;
