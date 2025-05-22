
import { useState, useRef, useEffect } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';

const ImageScaleEditor = ({ image, onSave, onCancel }) => {
  console.log("ImageScaleEditor mounted", { image });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const imageContainerLoaded = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const imageRef = useRef(null);
  const dragStart = useRef({ x: 0, y: 0 });

  // Center the image when it first loads
  useEffect(() => {
    if (image && containerRef.current && !imageContainerLoaded.current) {
      const preloadImage = new Image();
      preloadImage.onload = () => {
        // Center the image when first loaded
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        // Calculate proper initial scale to fit image within container
        const scaleX = containerWidth / preloadImage.width;
        const scaleY = containerHeight / preloadImage.height;
        const initialScale = Math.min(scaleX, scaleY);
        
        // Set initial scale between 0.8 and 1.2 for better visibility
        setScale(Math.max(0.8, Math.min(1.2, initialScale)));
        
        // Center the image
        setPosition({
          x: (containerWidth - preloadImage.width) / 2,
          y: (containerHeight - preloadImage.height) / 2
        });
        
        imageContainerLoaded.current = true;
      };
      preloadImage.src = image;
    }
  }, [image]);

  useEffect(() => {
    console.log("ImageScaleEditor props received:", { image, scale, position });
  }, [image, scale, position]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY
    };
  };

  const handleMouseMove = (e) => {
    if (isDragging && imageRef.current) {
      // Calculate movement since last position
      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;
      
      // Update position with the delta
      const newX = position.x + deltaX;
      const newY = position.y + deltaY;
      
      setPosition({
        x: newX,
        y: newY
      });
      
      // Update drag start position for next movement
      dragStart.current = {
        x: e.clientX,
        y: e.clientY
      };

      // Prevent default to avoid text selection while dragging
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    
    // More controlled scaling factor
    const scaleFactor = 0.05;
    const delta = e.deltaY < 0 ? scaleFactor : -scaleFactor;
    
    // Get mouse position relative to the image container
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate new scale with limits
    const newScale = Math.min(Math.max(0.5, scale + delta), 3);
    
    // Adjust position to zoom toward mouse position
    if (imageRef.current) {
      const scaleChange = newScale / scale;
      
      // Calculate new position based on mouse position
      const newPosition = {
        x: mouseX - (mouseX - position.x) * scaleChange,
        y: mouseY - (mouseY - position.y) * scaleChange
      };
      
      setPosition(newPosition);
    }
    
    setScale(newScale);
  };
  
  // Add touch support for mobile
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      // Single touch - prepare for drag
      setIsDragging(true);
      dragStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  };
  
  const handleTouchMove = (e) => {
    if (isDragging && e.touches.length === 1) {
      // Handle dragging
      const deltaX = e.touches[0].clientX - dragStart.current.x;
      const deltaY = e.touches[0].clientY - dragStart.current.y;
      
      setPosition({
        x: position.x + deltaX,
        y: position.y + deltaY
      });
      
      dragStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
      
      e.preventDefault();
    }
  };
  
  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, position, scale]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1e1e1e] p-6 rounded-lg shadow-xl">
        <h3 className="text-xl font-semibold text-center mb-4">Adjust Profile Picture</h3>

        <div 
          ref={containerRef}
          className="w-80 h-80 rounded-full overflow-hidden relative border-4 border-[#2e2e2e] mb-4"
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
        >
          <img
            ref={imageRef}
            src={image}
            alt="Profile"
            className="absolute cursor-move select-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center',
              transition: isDragging ? 'none' : 'transform 0.1s',
              touchAction: 'none' // Prevent browser handling of touch events
            }}
            onMouseDown={handleMouseDown}
            onDragStart={(e) => e.preventDefault()} // Prevent ghost drag image
            draggable="false"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Zoom: {Math.round(scale * 100)}%</label>
          <input
            type="range"
            min="50"
            max="300"
            value={scale * 100}
            onChange={(e) => setScale(e.target.value / 100)}
            className="w-full accent-blue-500"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700 transition flex items-center gap-2"
          >
            <FaTimes /> Cancel
          </button>
          <button
            onClick={() => onSave({ scale, position })}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 transition flex items-center gap-2"
          >
            <FaCheck /> Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageScaleEditor;
