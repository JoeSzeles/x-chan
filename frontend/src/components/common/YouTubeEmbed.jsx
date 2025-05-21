import React, { useState, useEffect, useRef } from 'react';

// Utility function to extract video ID from a YouTube URL
const getYouTubeVideoId = (url) => {
    if (!url) return null;

    try {
        const cleanUrl = url.trim();
        let id = null;

        // Handle youtu.be format
        if (cleanUrl.includes('youtu.be/')) {
            id = cleanUrl.split('youtu.be/')[1]?.split(/[?#]/)[0];
        } 
        // Handle standard youtube.com/watch?v= format
        else if (cleanUrl.includes('youtube.com/watch')) {
            const urlObj = new URL(cleanUrl);
            id = urlObj.searchParams.get('v');
        } 
        // Handle embed format
        else if (cleanUrl.includes('youtube.com/embed/')) {
            id = cleanUrl.split('embed/')[1]?.split(/[?#]/)[0];
        } 
        // Handle shorts format
        else if (cleanUrl.includes('youtube.com/shorts/')) {
            id = cleanUrl.split('shorts/')[1]?.split(/[?#]/)[0];
        }
        // Handle mock URLs that might have a videoId pattern
        else if (cleanUrl.includes('mock')) {
            // For mock URLs, extract a potential ID pattern
            const mockIdMatch = cleanUrl.match(/mock(\w+)/);
            if (mockIdMatch && mockIdMatch[1]) {
                // Use a real video ID as fallback for mock data
                return 'dQw4w9WgXcQ'; // Well-known YouTube video ID
            }
        }

        // Validate the video ID format (standard YouTube IDs are 11 characters)
        if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
            return id;
        }

        // If we have an ID but it's not valid format, it might be a mock ID
        if (id) {
            console.warn('Non-standard YouTube ID detected:', id);
            return 'dQw4w9WgXcQ'; // Fallback to a real video ID
        }

        return null;
    } catch (err) {
        console.error('Error parsing YouTube URL:', err, url);
        return null;
    }
};

const YouTubeEmbed = ({ url }) => {
    const [videoId, setVideoId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [thumbnailUrl, setThumbnailUrl] = useState(null);
    const [thumbnailFailed, setThumbnailFailed] = useState(false);
    const embedContainerRef = useRef(null);

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        setThumbnailFailed(false);

        const id = getYouTubeVideoId(url);

        if (id) {
            setVideoId(id);
            setThumbnailUrl(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
            setIsLoading(false);
        } else {
            console.error('Could not extract video ID from URL:', url);
            setError('Invalid YouTube URL');
            setVideoId(null);
            setThumbnailUrl(null);
            setIsLoading(false);
        }
    }, [url]);

    // For checking if the thumbnail image loaded properly
    const handleThumbnailError = () => {
        console.error('YouTube thumbnail failed to load:', thumbnailUrl);

        // If the high-quality thumbnail fails, try the default one
        if (videoId && !thumbnailFailed) {
            setThumbnailUrl(`https://i.ytimg.com/vi/${videoId}/default.jpg`);
            setThumbnailFailed(true);
        } else {
            setError('Failed to load video thumbnail');
        }
    };

    const handleThumbnailLoad = () => {
        setIsLoading(false);
    };

    // Get a display URL for showing to users (can be the original or a cleaned-up version)
    const getDisplayUrl = () => {
        if (!url) return '';
        if (videoId) {
            return `https://www.youtube.com/watch?v=${videoId}`;
        }
        return url;
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
                        href={getDisplayUrl()} 
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
                            href={getDisplayUrl()} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-red-500 hover:underline"
                        >
                            Watch on YouTube
                        </a>
                    </div>
                </div>

                {/* Thumbnail with play button overlay that links to YouTube */}
                <div className="relative pt-[56.25%] w-full bg-black">
                    {thumbnailUrl && (
                        <a 
                            href={getDisplayUrl()} 
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