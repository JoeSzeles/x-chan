
import React from 'react';
import { Link } from 'react-router-dom';

const Logo = ({ size = 'medium', className = '' }) => {
  const sizeClass = {
    small: 'h-6 w-6',
    medium: 'h-10 w-10',
    large: 'h-14 w-14',
  }[size] || 'h-10 w-10';

  return (
    <Link to="/" className={`block ${className}`}>
      <img 
        src="/xchan_small.png" 
        alt="XChan" 
        className={`${sizeClass} object-contain`}
      />
    </Link>
  );
};

export default Logo;
