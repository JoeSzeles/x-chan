import React, { useState, useEffect, useRef } from 'react';

const YouTubeEmbed = ({ url }) => {
    const [videoId, setVideoId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [thumbnailUrl, setThumbnailUrl] = useState(null);
    const [videoInfo, setVideoInfo] = useState(null);
    const [showIframe, setShowIframe] = useState(false);
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
                setThumbnailUrl(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
                
                // Fetch video information
                fetchVideoInfo(id);
                setError(null);
            } catch (err) {
                console.error('YouTube URL parsing error:', err);
                setError('Invalid YouTube URL');
                setVideoId(null);
                setThumbnailUrl(null);
                setIsLoading(false);
            }
        };

        const fetchVideoInfo = async (videoId) => {
            try {
                // Use YouTube oEmbed API to get video title and channel info
                const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
                
                if (response.ok) {
                    const data = await response.json();
                    setVideoInfo({
                        title: data.title,
                        author: data.author_name,
                        authorUrl: data.author_url
                    });
                } else {
                    console.warn('Could not fetch video info from oEmbed API');
                    setVideoInfo({
                        title: 'YouTube Video',
                        author: 'Unknown Channel',
                        authorUrl: null
                    });
                }
            } catch (err) {
                console.warn('Error fetching video info:', err);
                setVideoInfo({
                    title: 'YouTube Video',
                    author: 'Unknown Channel', 
                    authorUrl: null
                });
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

    // Main embed with video info and playback options
    return (
        <div className="youtube-embed my-2">
            <div className="bg-red-500/10 rounded-lg border border-red-500/20 overflow-hidden">
                {/* YouTube header with video title and channel info */}
                <div className="p-3 border-b border-red-500/20">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                                {videoInfo?.title || 'Loading...'}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                                {videoInfo?.author && videoInfo.authorUrl ? (
                                    <a 
                                        href={videoInfo.authorUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-red-500 hover:underline"
                                    >
                                        {videoInfo.author}
                                    </a>
                                ) : (
                                    <span>{videoInfo?.author || 'Loading...'}</span>
                                )}
                                <span>•</span>
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
                    </div>
                </div>

                {/* Video player area */}
                <div className="relative pt-[56.25%] w-full bg-black">
                    {!showIframe ? (
                        // Thumbnail with play button
                        <div className="absolute inset-0">
                            {thumbnailUrl && (
                                <img 
                                    src={thumbnailUrl} 
                                    alt="YouTube Video Thumbnail" 
                                    className="absolute inset-0 w-full h-full object-cover"
                                    onError={handleThumbnailError}
                                    onLoad={handleThumbnailLoad}
                                />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <button
                                    onClick={() => setShowIframe(true)}
                                    className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors group"
                                    title="Play video"
                                >
                                    <svg className="w-8 h-8 text-white ml-1 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ) : (
                        // YouTube iframe for in-app playback
                        <iframe
                            ref={embedContainerRef}
                            className="absolute inset-0 w-full h-full"
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                            title={videoInfo?.title || "YouTube video player"}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            loading="lazy"
                        />
                    )}
                </div>

                {/* Video controls */}
                {showIframe && (
                    <div className="p-2 bg-gray-50 border-t border-red-500/20">
                        <button
                            onClick={() => setShowIframe(false)}
                            className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            ← Back to thumbnail
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default YouTubeEmbed;