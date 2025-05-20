
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
            if (!id) {
                throw new Error('Could not extract video ID');
            }
            setVideoId(id);
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

    if (!videoId) {
        return (
            <div className="youtube-embed my-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                <div className="text-red-600">Invalid YouTube URL</div>
            </div>
        );
    }

    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
    console.log('[YouTubeEmbed] Using embed URL:', embedUrl);

    return (
        <div className="youtube-embed my-4">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-gray-600">Loading video...</div>
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

            <div className="relative pt-[56.25%] bg-black rounded-lg overflow-hidden">
                <iframe
                    ref={iframeRef}
                    className="absolute top-0 left-0 w-full h-full"
                    src={embedUrl}
                    title="YouTube video player"
                    frameBorder="0"
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
