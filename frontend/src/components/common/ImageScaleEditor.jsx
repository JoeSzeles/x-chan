import { useState, useRef, useEffect } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';

const ImageScaleEditor = ({ image, onSave, onCancel }) => {
  console.log("ImageScaleEditor mounted", { image });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const imageContainerLoaded = useRef(false);

  // Center the image when it first loads
  useEffect(() => {
    if (image && containerRef.current && !imageContainerLoaded.current) {
      const preloadImage = new Image();
      preloadImage.onload = () => {
        // Center the image when first loaded
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
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
  const [isDragging, setIsDragging] = useState(false);
  const imageRef = useRef(null);
  const dragStart = useRef({ x: 0, y: 0 });

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
      setPosition({
        x: position.x + deltaX,
        y: position.y + deltaY
      });
      
      // Update drag start position for next movement
      dragStart.current = {
        x: e.clientX,
        y: e.clientY
      };
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newScale = Math.min(Math.max(0.5, scale + delta), 3);
    setScale(newScale);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1e1e1e] p-6 rounded-lg shadow-xl">
        <h3 className="text-xl font-semibold text-center mb-4">Adjust Profile Picture</h3>

        <div 
          ref={containerRef}
          className="w-80 h-80 rounded-full overflow-hidden relative border-4 border-[#2e2e2e] mb-4"
          onWheel={handleWheel}
        >
          <img
            ref={imageRef}
            src={image}
            alt="Profile"
            className="absolute cursor-move select-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center',
              transition: isDragging ? 'none' : 'transform 0.1s'
            }}
            onMouseDown={handleMouseDown}
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
            onClick={onClose || onCancel}
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