
import React from "react";
import { Link } from "react-router-dom";

const Logo = ({ size = "small" }) => {
  // Set the size class based on the prop
  let sizeClass = "w-8 h-8"; // default small
  if (size === "medium") {
    sizeClass = "w-12 h-12";
  } else if (size === "large") {
    sizeClass = "w-16 h-16";
  }

  return (
    <Link to="/" className="flex items-center">
      <img 
        src="/xchan_small.png" 
        alt="XChan" 
        className={`${sizeClass} object-contain`}
        onError={(e) => {
          console.error("Logo image failed to load");
          e.target.onerror = null;
          e.target.src = "/vite.svg"; // Fallback image
        }}
      />
    </Link>
  );
};

export default Logo;
