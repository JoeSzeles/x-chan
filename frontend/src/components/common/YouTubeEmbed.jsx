
import React, { useState, useEffect, useRef } from 'react';

const YouTubeEmbed = ({ url }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [videoId, setVideoId] = useState(null);
    const [thumbnailUrl, setThumbnailUrl] = useState(null);
    const [thumbnailError, setThumbnailError] = useState(false);
    const iframeRef = useRef(null);

    useEffect(() => {
        console.log('[YouTubeEmbed] Processing URL:', url);
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

            console.log('[YouTubeEmbed] Extracted video ID:', id);
            if (!id) {
                throw new Error('Could not extract video ID');
            }
            setVideoId(id);
            
            // Try different thumbnail resolutions
            const qualities = [
                'maxresdefault.jpg',
                'sddefault.jpg',
                'hqdefault.jpg',
                'mqdefault.jpg',
                'default.jpg'
            ];
            setThumbnailUrl(`https://img.youtube.com/vi/${id}/${qualities[2]}`);
            setError(null);
        } catch (err) {
            console.error('[YouTubeEmbed] Error processing URL:', err);
            setError('Invalid YouTube URL');
            setVideoId(null);
        }
    }, [url]);

    const handleIframeLoad = () => {
        console.log('[YouTubeEmbed] Iframe loaded successfully');
        setIsLoading(false);
        setError(null);
    };

    const handleIframeError = (e) => {
        console.error('[YouTubeEmbed] Iframe error:', e);
        setError('Failed to load video - please try refreshing');
        setIsLoading(false);
    };

    const handleThumbnailError = () => {
        console.error('[YouTubeEmbed] Thumbnail failed to load');
        setThumbnailError(true);
        
        // Try another thumbnail format if current one fails
        if (videoId && thumbnailUrl?.includes('hqdefault.jpg')) {
            setThumbnailUrl(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
        } else if (videoId && thumbnailUrl?.includes('mqdefault.jpg')) {
            setThumbnailUrl(`https://img.youtube.com/vi/${videoId}/default.jpg`);
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

    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;
    console.log('[YouTubeEmbed] Using embed URL:', embedUrl);

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
