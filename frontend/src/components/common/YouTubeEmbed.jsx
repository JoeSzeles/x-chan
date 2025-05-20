import React, { useState, useEffect, useRef } from 'react';

const YouTubeEmbed = ({ url }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [videoId, setVideoId] = useState(null);
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
            }

            console.log('[YouTubeEmbed] Extracted video ID:', id);
            setVideoId(id);
            if (!id) {
                throw new Error('Could not extract video ID');
            }
        } catch (err) {
            console.error('[YouTubeEmbed] Error processing URL:', err);
            setError('Invalid YouTube URL');
        }
    }, [url]);

    const handleIframeLoad = () => {
        console.log('[YouTubeEmbed] Iframe loaded successfully');
        setIsLoading(false);
    };

    const handleIframeError = (e) => {
        console.error('[YouTubeEmbed] Iframe error:', e);
        setError('Failed to load video');
        setIsLoading(false);
    };

    if (error) {
        return (
            <div className="youtube-embed my-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                <div className="text-red-600 mb-2">{error}</div>
                <a 
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                >
                    View on YouTube
                </a>
            </div>
        );
    }

    if (!videoId || isLoading) {
        return (
            <div className="youtube-embed my-4 p-4 bg-gray-100 border border-gray-300 rounded-lg">
                <div className="text-gray-600">Loading video...</div>
            </div>
        );
    }

    return (
        <div className="youtube-embed my-4">
            <div className="relative pt-[56.25%] bg-black rounded-lg overflow-hidden">
                <iframe
                    ref={iframeRef}
                    className="absolute top-0 left-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                />
            </div>
        </div>
    );
};

export default YouTubeEmbed;