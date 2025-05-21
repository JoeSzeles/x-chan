import React, { useState, useEffect } from 'react';

const YouTubeEmbed = ({ url, width = '100%', height = '315', className = '' }) => {
  const [videoId, setVideoId] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setError(true);
      setLoading(false);
      return;
    }

    // Extract video ID from various YouTube URL formats
    try {
      let extractedId = '';

      if (url.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        extractedId = urlObj.searchParams.get('v');
      } else if (url.includes('youtu.be/')) {
        extractedId = url.split('youtu.be/')[1];
        // Remove any parameters
        if (extractedId.includes('?')) {
          extractedId = extractedId.split('?')[0];
        }
      } else if (url.includes('youtube.com/embed/')) {
        extractedId = url.split('embed/')[1];
        // Remove any parameters
        if (extractedId.includes('?')) {
          extractedId = extractedId.split('?')[0];
        }
      }

      // Check for mock data urls and replace with a valid video ID
      if (extractedId && extractedId.includes('mock')) {
        console.log('Detected mock video ID, replacing with fallback video');
        extractedId = 'dQw4w9WgXcQ'; // Use a fallback video ID
      }

      if (extractedId) {
        setVideoId(extractedId);
        setError(false);
      } else {
        console.error('Could not extract video ID from URL:', url);
        setError(true);
      }
    } catch (err) {
      console.error('Error parsing YouTube URL:', err);
      setError(true);
    }

    setLoading(false);
  }, [url]);

  // Function to check if the YouTube thumbnail exists
  const checkThumbnailExists = (id, callback) => {
    if (!id) return callback(false);

    const img = new Image();
    img.onload = () => callback(true);
    img.onerror = () => callback(false);
    img.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  };

  // Component to display the thumbnail with play button
  const ThumbnailWithPlayButton = ({ id }) => {
    const [thumbnailExists, setThumbnailExists] = useState(true);

    useEffect(() => {
      checkThumbnailExists(id, (exists) => {
        setThumbnailExists(exists);
      });
    }, [id]);

    if (!thumbnailExists) {
      return (
        <div className="bg-gray-300 flex items-center justify-center" style={{ width, height }}>
          <span>Video unavailable</span>
        </div>
      );
    }

    return (
      <div className="relative" style={{ width, height: typeof height === 'number' ? `${height}px` : height }}>
        <img 
          src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} 
          alt="YouTube Thumbnail"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-red-600 rounded-full p-3 opacity-80 hover:opacity-100 transition-opacity">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
    );
  };

  // Function to create embed URL with parameters
  const createEmbedUrl = (id) => {
    return `https://www.youtube.com/embed/${id}?autoplay=0&origin=${window.location.origin}`;
  };

  if (loading) {
    return <div className="bg-gray-200 animate-pulse" style={{ width, height }}></div>;
  }

  if (error || !videoId) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`} style={{ width, height }}>
        <span className="text-gray-500">Video unavailable</span>
      </div>
    );
  }

  return (
    <div className={`youtube-embed ${className}`}>
      <iframe
        width={width}
        height={height}
        src={createEmbedUrl(videoId)}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  );
};

export default YouTubeEmbed;