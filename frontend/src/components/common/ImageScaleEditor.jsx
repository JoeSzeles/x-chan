
import { useState, useEffect, useRef } from 'react';

const ImageScaleEditor = ({ image, onSave, onCancel }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const dragStart = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Fixed container size to match the final output size
  const CONTAINER_SIZE = 400;

  // Scale control with mouse wheel
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    // More controlled scaling with tighter min/max bounds
    const newScale = Math.max(0.8, Math.min(3, scale + delta));
    setScale(newScale);
  };

  // Start dragging
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY
    };
  };

  // Continue dragging
  const handleMouseMove = (e) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;
      
      // Apply movement relative to current scale
      setPosition({
        x: position.x + deltaX,
        y: position.y + deltaY
      });

      dragStart.current = {
        x: e.clientX,
        y: e.clientY
      };
    }
  };

  // End dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support
  const handleTouchStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchMove = (e) => {
    if (isDragging) {
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

  // Initialize image properly when loaded
  useEffect(() => {
    if (imageLoaded && imageRef.current) {
      const imgWidth = imageRef.current.naturalWidth;
      const imgHeight = imageRef.current.naturalHeight;
      
      // Calculate initial scale to ensure the image fills the circular container
      const initialScale = Math.max(
        CONTAINER_SIZE / imgWidth,
        CONTAINER_SIZE / imgHeight
      );
      
      // Set initial scale to ensure the image covers the circle
      setScale(initialScale);
      
      // Reset position to center
      setPosition({ x: 0, y: 0 });
    }
  }, [imageLoaded]);

  const handleSave = () => {
    // Directly pass the current scale and position to the parent component
    onSave({ scale, position });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#1e1e1e] p-6 rounded-lg shadow-xl max-w-[90vw]">
        <h3 className="text-xl font-semibold text-center mb-4">Adjust Profile Picture</h3>

        <div 
          ref={containerRef}
          className="w-[400px] h-[400px] rounded-full overflow-hidden relative border-4 border-[#2e2e2e] mb-4 mx-auto"
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
        >
          <img
            ref={imageRef}
            src={image}
            alt="Editable"
            className="absolute"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center',
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onLoad={() => setImageLoaded(true)}
            onMouseDown={handleMouseDown}
            draggable="false"
          />
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <label className="text-sm text-gray-300">Zoom: {scale.toFixed(2)}x</label>
          <input
            type="range"
            min="0.8"
            max="3"
            step="0.01"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageScaleEditor;
