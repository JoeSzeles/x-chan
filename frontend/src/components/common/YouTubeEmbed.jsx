import React, { useState, useEffect, useRef } from 'react';

const YouTubeEmbed = ({ url }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [videoId, setVideoId] = useState(null);
    const iframeRef = useRef(null);

    useEffect(() => {
        console.log('[YouTubeEmbed] Initializing with URL:', url);

        if (!url) {
            console.error('[YouTubeEmbed] No URL provided');
            setError('No URL provided');
            setIsLoading(false);
            return;
        }

        try {
            const cleanUrl = url.trim();
            let id = null;

            // Parse URL to get video ID
            if (cleanUrl.includes('youtu.be/')) {
                id = cleanUrl.split('youtu.be/')[1]?.split(/[?#]/)[0];
                console.log('[YouTubeEmbed] Extracted ID from youtu.be URL:', id);
            } else if (cleanUrl.includes('youtube.com/watch')) {
                const urlParams = new URL(cleanUrl).searchParams;
                id = urlParams.get('v');
                console.log('[YouTubeEmbed] Extracted ID from watch URL:', id);
            } else if (cleanUrl.includes('youtube.com/embed/')) {
                id = cleanUrl.split('embed/')[1]?.split(/[?#]/)[0];
                console.log('[YouTubeEmbed] Extracted ID from embed URL:', id);
            } else if (cleanUrl.includes('youtube.com/shorts/')) {
              id = cleanUrl.split('shorts/')[1]?.split(/[?#]/)[0];
              console.log('[YouTubeEmbed] Extracted ID from shorts URL:', id);
            }

            if (!id) {
                throw new Error('Could not extract video ID from URL');
            }

            if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
                throw new Error('Invalid video ID format');
            }

            setVideoId(id);
            setError(null);
        } catch (err) {
            console.error('[YouTubeEmbed] Error parsing URL:', err);
            setError(`Failed to load video: ${err.message}`);
            setIsLoading(false);
        }
    }, [url]);

    const handleIframeError = (e) => {
        console.error('[YouTubeEmbed] Iframe error:', e);
        setError('Failed to load video player');
        setIsLoading(false);
    };

    const handleIframeLoad = () => {
        console.log('[YouTubeEmbed] Iframe loaded successfully');
        setIsLoading(false);
    };

    if (error) {
        return (
            <div className="youtube-embed my-2">
                <div className="bg-red-500/10 rounded-lg border border-red-500/20 p-3">
                    <div className="text-red-500 mb-2">{error}</div>
                    <a 
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600"
                    >
                        View on YouTube
                    </a>
                </div>
            </div>
        );
    }

    if (!videoId || isLoading) {
        return (
            <div className="youtube-embed my-2">
                <div className="bg-gray-500/10 rounded-lg border border-gray-500/20 p-3">
                    <div className="text-gray-500">Loading video...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="youtube-embed my-2">
            <div className="bg-red-500/10 rounded-lg border border-red-500/20 overflow-hidden">
                <div className="p-3 flex items-center justify-between border-b border-red-500/20">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                        <a 
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-500 hover:text-red-600"
                        >
                            View on YouTube
                        </a>
                    </div>
                </div>
                <div className="relative pt-[56.25%] w-full">
                    <iframe
                        ref={iframeRef}
                        className="absolute top-0 left-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&playsinline=1`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        onError={handleIframeError}
                        onLoad={handleIframeLoad}
                    />
                </div>
            </div>
        </div>
    );
};

export default YouTubeEmbed;