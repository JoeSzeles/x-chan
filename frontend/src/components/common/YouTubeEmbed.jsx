
import React, { useState, useEffect, useRef } from 'react';

const YouTubeEmbed = ({ url }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [videoId, setVideoId] = useState(null);
    const [thumbnailUrl, setThumbnailUrl] = useState(null);
    const [thumbnailError, setThumbnailError] = useState(false);
    const iframeRef = useRef(null);

    useEffect(() => {
        try {
            let id = null;
            if (url.includes('youtube.com/watch')) {
                const urlParams = new URLSearchParams(new URL(url).search);
                id = urlParams.get('v');
            } else if (url.includes('youtu.be/')) {
                id = url.split('youtu.be/')[1]?.split(/[?#]/)[0];
            } else if (url.includes('youtube.com/embed/')) {
                id = url.split('embed/')[1]?.split(/[?#]/)[0];
            } else if (url.includes('youtube.com/shorts/')) {
                id = url.split('shorts/')[1]?.split(/[?#]/)[0];
            }

            if (!id) {
                throw new Error('Could not extract video ID');
            }
            setVideoId(id);
            
            // Set thumbnail URL immediately - try hqdefault first
            setThumbnailUrl(`https://img.youtube.com/vi/${id}/hqdefault.jpg`);
            setError(null);
        } catch (err) {
            console.error('[YouTubeEmbed] Error processing URL:', err);
            setError('Invalid YouTube URL');
            setVideoId(null);
        }
    }, [url]);

    const handleIframeLoad = () => {
        setIsLoading(false);
        setError(null);
    };

    const handleIframeError = (e) => {
        console.error('[YouTubeEmbed] Iframe error:', e);
        setError('Failed to load video - please try refreshing');
        setIsLoading(false);
    };

    const handleThumbnailError = () => {
        console.log('[YouTubeEmbed] Thumbnail failed to load, trying alternate format');
        setThumbnailError(true);
        
        // Try another thumbnail format if current one fails
        if (videoId && thumbnailUrl?.includes('hqdefault.jpg')) {
            setThumbnailUrl(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
        } else if (videoId && thumbnailUrl?.includes('mqdefault.jpg')) {
            setThumbnailUrl(`https://img.youtube.com/vi/${videoId}/default.jpg`);
        } else if (videoId && thumbnailUrl?.includes('default.jpg')) {
            // If even default fails, try sddefault as last resort
            setThumbnailUrl(`https://img.youtube.com/vi/${videoId}/sddefault.jpg`);
        }
    };

    if (!videoId) {
        return (
            <div className="youtube-embed my-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                <div className="text-red-600">Invalid YouTube URL</div>
                <div className="text-gray-600 text-sm mt-2">URL: {url}</div>
            </div>
        );
    }

    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;

    return (
        <div className="youtube-embed my-4">
            {isLoading && !error && (
                <div className="flex items-center justify-center bg-gray-100 relative pt-[56.25%] rounded-lg">
                    {thumbnailUrl && !thumbnailError && (
                        <img 
                            src={thumbnailUrl}
                            alt="Video thumbnail"
                            className="absolute top-0 left-0 w-full h-full object-cover rounded-lg"
                            onError={handleThumbnailError}
                        />
                    )}
                    {thumbnailError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                            <div className="flex flex-col items-center text-white">
                                <svg className="w-16 h-16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/>
                                </svg>
                                <div className="mt-2">YouTube Video</div>
                            </div>
                        </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="text-white flex flex-col items-center">
                            <svg className="w-16 h-16 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                            </svg>
                            <div className="mt-2">Loading video...</div>
                        </div>
                    </div>
                </div>
            )}
            
            {error && (
                <div className="p-4 bg-red-100 border border-red-300 rounded-lg">
                    <div className="text-red-600 mb-2">{error}</div>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        View on YouTube
                    </a>
                </div>
            )}

            {!error && (
                <div className="relative pt-[56.25%] bg-black rounded-lg overflow-hidden">
                    <iframe
                        ref={iframeRef}
                        className="absolute top-0 left-0 w-full h-full"
                        src={embedUrl}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        onLoad={handleIframeLoad}
                        onError={handleIframeError}
                    />
                </div>
            )}
        </div>
    );
};

export default YouTubeEmbed;
