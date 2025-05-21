
import React, { useState, useEffect, useRef } from 'react';

const YouTubeEmbed = ({ url }) => {
    const [videoId, setVideoId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [thumbnailUrl, setThumbnailUrl] = useState(null);
    const embedContainerRef = useRef(null);

    useEffect(() => {
        const parseVideoId = (url) => {
            try {
                const cleanUrl = url.trim();
                let id = null;

                if (cleanUrl.includes('youtu.be/')) {
                    id = cleanUrl.split('youtu.be/')[1]?.split(/[?#]/)[0];
                } else if (cleanUrl.includes('youtube.com/watch')) {
                    id = new URL(cleanUrl).searchParams.get('v');
                } else if (cleanUrl.includes('youtube.com/embed/')) {
                    id = cleanUrl.split('embed/')[1]?.split(/[?#]/)[0];
                } else if (cleanUrl.includes('youtube.com/shorts/')) {
                    id = cleanUrl.split('shorts/')[1]?.split(/[?#]/)[0];
                }

                if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) {
                    throw new Error('Invalid YouTube URL');
                }

                setVideoId(id);
                // Set the thumbnail URL directly based on the video ID
                setThumbnailUrl(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
                setError(null);
            } catch (err) {
                console.error('YouTube URL parsing error:', err);
                setError('Invalid YouTube URL');
                setVideoId(null);
                setThumbnailUrl(null);
            } finally {
                setIsLoading(false);
            }
        };

        setIsLoading(true);
        parseVideoId(url);
    }, [url]);

    // For checking if the thumbnail image loaded properly
    const handleThumbnailError = () => {
        console.error('YouTube thumbnail failed to load:', thumbnailUrl);
        setError('Failed to load video thumbnail');
    };

    const handleThumbnailLoad = () => {
        setIsLoading(false);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="youtube-embed my-2">
                <div className="bg-red-500/10 rounded-lg border border-red-500/20 p-3">
                    <div className="flex justify-between items-center">
                        <div className="text-gray-500">Loading video...</div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="youtube-embed my-2">
                <div className="bg-red-500/10 rounded-lg border border-red-500/20 p-3">
                    <div className="text-red-500 mb-2">{error}</div>
                    <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-red-500 hover:underline"
                    >
                        View on YouTube
                    </a>
                </div>
            </div>
        );
    }

    // Main embed with thumbnail preview 
    return (
        <div className="youtube-embed my-2">
            <div className="bg-red-500/10 rounded-lg border border-red-500/20 overflow-hidden">
                {/* YouTube branding header */}
                <div className="p-3 flex items-center justify-between border-b border-red-500/20">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                        </svg>
                        <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-red-500 hover:underline"
                        >
                            Watch on YouTube
                        </a>
                    </div>
                </div>

                {/* Thumbnail with play button overlay that links to YouTube */}
                <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
                    {thumbnailUrl && (
                        <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <img 
                                src={thumbnailUrl} 
                                alt="YouTube Video Thumbnail" 
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={handleThumbnailError}
                                onLoad={handleThumbnailLoad}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                            </div>
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default YouTubeEmbed;
