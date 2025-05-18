import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import PostNumberLink from './PostNumberLink';

// Global Twitter script loading
let twitterScriptPromise = null;

const loadTwitterScript = () => {
    if (!twitterScriptPromise) {
        twitterScriptPromise = new Promise((resolve, reject) => {
            if (document.querySelector('script[src="https://platform.twitter.com/widgets.js"]')) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://platform.twitter.com/widgets.js';
            script.async = true;
            script.onload = () => {
                if (window.twttr && window.twttr.widgets) {
                    window.twttr.widgets.load().then(resolve).catch(reject);
                } else {
                    reject(new Error('Twitter widgets not loaded'));
                }
            };
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }
    return twitterScriptPromise;
};

// Cache management utilities
const CACHE_PREFIX = 'tweet_cache_';
const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour in milliseconds

const getCachedTweet = (url) => {
    try {
        const cachedData = localStorage.getItem(CACHE_PREFIX + url);
        if (!cachedData) return null;

        const { data, timestamp } = JSON.parse(cachedData);
        const now = Date.now();

        // Check if cache is expired
        if (now - timestamp > CACHE_EXPIRY) {
            localStorage.removeItem(CACHE_PREFIX + url);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error reading from cache:', error);
        return null;
    }
};

const setCachedTweet = (url, data) => {
    try {
        const cacheData = {
            data,
            timestamp: Date.now()
        };
        localStorage.setItem(CACHE_PREFIX + url, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error writing to cache:', error);
    }
};

const clearTweetCache = (url) => {
    try {
        if (url) {
            localStorage.removeItem(CACHE_PREFIX + url);
        } else {
            // Clear all tweet caches
            Object.keys(localStorage)
                .filter(key => key.startsWith(CACHE_PREFIX))
                .forEach(key => localStorage.removeItem(key));
        }
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
};

// Helper function to handle CORS errors
const handleCorsError = (error) => {
    console.warn('CORS error:', error);
    return {
        error: 'Unable to load content due to security restrictions. Please try opening in a new tab.',
        isCorsError: true
    };
};

// Add font loading optimization
const fontStyles = {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontDisplay: 'swap'
};

// TwitterEmbed component
const TwitterEmbed = ({ url }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tweetData, setTweetData] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const embedContainerRef = useRef(null);

    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1000; // 1 second

    const fetchTweetData = async (forceReload = false) => {
            try {
                // Clean the URL (remove @ if present and ensure proper format)
                const cleanUrl = url.replace(/^@/, '').trim();

                // Extract tweet ID
                const tweetId = cleanUrl.match(/status\/(\d+)/)?.[1];
                if (!tweetId) {
                    throw new Error('Invalid tweet URL');
                }

            // Check cache first if not forcing reload
            if (!forceReload) {
                const cachedData = getCachedTweet(cleanUrl);
                if (cachedData) {
                        setTweetData(cachedData);
                        setIsLoading(false);
                    return;
                }
            }

            // Get API URL from environment variable, with fallback
            const apiBaseUrl = import.meta.env.VITE_API_URL || '';
            if (!apiBaseUrl) {
                throw new Error('API URL not configured');
            }

            // Construct API URL properly
            const apiUrl = `${apiBaseUrl}/api/twitter/embed?url=${encodeURIComponent(cleanUrl)}`;

                // Fetch tweet data through our backend proxy
            const response = await fetch(apiUrl, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                // Handle specific error cases
                if (response.status === 404) {
                    throw new Error('Tweet not found or has been deleted');
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                } else if (response.status === 401) {
                    throw new Error('Authentication required to view this tweet');
                } else if (response.status === 500) {
                    throw new Error('Server error. Please try again later.');
                }
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.details || `Twitter API error: ${response.status}`);
                }

                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error);
                }

                // Cache the successful response
                setCachedTweet(cleanUrl, data);
                    setTweetData(data);
                    setIsLoading(false);
            setError(null);
            setRetryCount(0);

            } catch (err) {
            // Silently handle errors without logging to console
            if (retryCount < MAX_RETRIES) {
                setTimeout(() => {
                    setRetryCount(prev => prev + 1);
                }, RETRY_DELAY * (retryCount + 1));
            } else {
                    setError(err.message);
                // Show a more informative fallback UI for failed tweet loads
                    setTweetData({
                    html: `<div class="tweet-error bg-gray-800 rounded-lg p-4">
                        <p class="text-gray-300 mb-2">${err.message}</p>
                        <div class="flex gap-2">
                            <a href="${url}" target="_blank" rel="noopener noreferrer" 
                               class="text-blue-400 hover:text-blue-300 transition-colors">
                                View on Twitter
                            </a>
                            <button onclick="window.location.reload()" 
                                    class="text-blue-400 hover:text-blue-300 transition-colors">
                                Retry
                            </button>
                        </div>
                        </div>`
                    });
                    setIsLoading(false);
                }
            }
        };

    useEffect(() => {
        fetchTweetData();
    }, [url, retryCount]);

    if (error) {
        return (
            <div className="twitter-embed my-2">
                <div className="bg-[#1d9bf0]/10 rounded-lg border border-[#1d9bf0]/20 p-3">
                    <div className="flex justify-between items-center mb-2">
                        <div className="text-red-500">{error}</div>
                        <button
                            onClick={() => {
                                setIsLoading(true);
                                setError(null);
                                fetchTweetData();
                            }}
                            className="p-2 text-[#1d9bf0] hover:bg-[#1d9bf0]/10 rounded-full transition-colors"
                            title="Reload tweet"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#1d9bf0] hover:underline">
                        View on Twitter
                    </a>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="twitter-embed my-2">
                <div className="bg-[#1d9bf0]/10 rounded-lg border border-[#1d9bf0]/20 p-3">
                    <div className="flex justify-between items-center">
                        <div className="text-gray-500">Loading tweet...</div>
                        <button
                            onClick={() => {
                                setIsLoading(true);
                                setError(null);
                                fetchTweetData();
                            }}
                            className="p-2 text-[#1d9bf0] hover:bg-[#1d9bf0]/10 rounded-full transition-colors"
                            title="Reload tweet"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="twitter-embed my-2" ref={embedContainerRef}>
            <div className="bg-[#1d9bf0]/10 rounded-lg border border-[#1d9bf0]/20 overflow-hidden">
                <div className="p-3 flex items-center justify-between border-b border-[#1d9bf0]/20">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#1d9bf0] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <div className="flex flex-col">
                            <a href={tweetData?.author_url || url} target="_blank" rel="noopener noreferrer" className="text-[#1d9bf0] hover:underline">
                                {tweetData?.author_name ? `@${tweetData.author_name}` : 'View on Twitter'}
                            </a>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setIsLoading(true);
                                setError(null);
                                fetchTweetData();
                            }}
                            className="p-2 text-[#1d9bf0] hover:bg-[#1d9bf0]/10 rounded-full transition-colors"
                            title="Reload tweet"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="p-3">
                    {tweetData && (
                        <>
                            <div 
                                className="twitter-tweet-content mb-3"
                                dangerouslySetInnerHTML={{ __html: tweetData.html }}
                            />
                            {tweetData.media && tweetData.media.length > 0 && (
                                <div className="grid gap-2 mt-3">
                                    {tweetData.media.map((url, index) => (
                                        <div key={index} className="relative rounded-lg overflow-hidden">
                                            <img 
                                                src={url} 
                                                alt={`Tweet media ${index + 1}`}
                                                className="w-full h-auto object-contain max-h-[400px]"
                                                loading="lazy"
                                                onError={(e) => {
                                                    console.error('Failed to load media:', url);
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// YouTube Embed component
const YouTubeEmbed = ({ url }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isHovered, setIsHovered] = useState(false);
    const embedContainerRef = useRef(null);

    // Memoize the video ID extraction
    const videoId = useMemo(() => {
        try {
            if (!url) {
                return null;
            }

            // Clean the URL first
            const cleanUrl = url.trim().replace(/\/$/, '');

            // Handle different YouTube URL formats
            let extractedId = null;

            // Handle youtu.be URLs
            if (cleanUrl.includes('youtu.be/')) {
                extractedId = cleanUrl.split('youtu.be/')[1].split(/[?&]/)[0];
            }
            // Handle youtube.com URLs
            else if (cleanUrl.includes('youtube.com/')) {
                // Handle watch URLs
                if (cleanUrl.includes('/watch')) {
                    try {
                        const urlObj = new URL(cleanUrl);
                        extractedId = urlObj.searchParams.get('v');
                    } catch (e) {
                        const match = cleanUrl.match(/[?&]v=([^&]+)/);
                        if (match) {
                            extractedId = match[1];
                        }
                    }
                }
                // Handle embed URLs
                else if (cleanUrl.includes('/embed/')) {
                    extractedId = cleanUrl.split('/embed/')[1].split(/[?&]/)[0];
                }
                // Handle shorts URLs
                else if (cleanUrl.includes('/shorts/')) {
                    extractedId = cleanUrl.split('/shorts/')[1].split(/[?&]/)[0];
                }
                // Handle channel URLs with video IDs
                else if (cleanUrl.includes('/v/')) {
                    extractedId = cleanUrl.split('/v/')[1].split(/[?&]/)[0];
                }
                // Handle playlist URLs
                else if (cleanUrl.includes('/playlist')) {
                    try {
                        const urlObj = new URL(cleanUrl);
                        const listId = urlObj.searchParams.get('list');
                        if (listId) {
                            extractedId = listId;
                        }
                    } catch (e) {
                        // Ignore parsing errors for playlists
                    }
                }
            }
            // Handle direct video IDs
            else if (/^[a-zA-Z0-9_-]{8,20}$/.test(cleanUrl)) {
                extractedId = cleanUrl;
            }
            // Handle URLs with video ID as a parameter
            else {
                const match = cleanUrl.match(/[?&]v=([^&]+)/);
                if (match) {
                    extractedId = match[1];
                }
            }

            // Validate video ID
            if (!extractedId) {
                return null;
            }

            // Clean up the video ID
            extractedId = extractedId.split(/[?&]/)[0].trim();

            // Basic validation - be more lenient with validation
            if (extractedId.length < 8 || extractedId.length > 20) {
                return null;
            }

            if (!/^[a-zA-Z0-9_-]+$/.test(extractedId)) {
                return null;
            }

            return extractedId;
        } catch (error) {
            return null;
        }
    }, [url]); // Only recompute when URL changes

    const getEmbedUrl = useCallback((videoId) => {
        if (!videoId) return null;

        // Check if the videoId is a playlist ID (they typically start with 'PL')
        if (videoId.startsWith('PL')) {
            return `https://www.youtube.com/embed/videoseries?list=${videoId}&autoplay=0&rel=0&modestbranding=1&playsinline=1`;
        }
        return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&playsinline=1`;
    }, []);

    const loadVideoData = useCallback(async (forceReload = false) => {
        setIsLoading(true);
        setError(null);

        try {
            if (!videoId) {
                throw new Error('Invalid YouTube URL');
            }

            // Simulate loading delay for better UX
            await new Promise(resolve => setTimeout(resolve, 500));
            setIsLoading(false);
        } catch (err) {
            setError(err.message || 'Failed to load video');
            setIsLoading(false);
        }
    }, [videoId]);

    useEffect(() => {
        if (videoId) {
        loadVideoData();
        } else {
            setError('Invalid YouTube URL');
            setIsLoading(false);
        }
    }, [loadVideoData, videoId]);

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
        if (isLoading && videoId) {
            loadVideoData();
        }
    }, [isLoading, loadVideoData, videoId]);

    if (error) {
        return (
            <div className="youtube-embed my-2">
                <div className="bg-red-500/10 rounded-lg border border-red-500/20 p-3">
                    <div className="flex justify-between items-center mb-2">
                        <div className="text-red-500">{error}</div>
                        <button
                            onClick={() => loadVideoData(true)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                            title="Reload video"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">
                        View on YouTube
                    </a>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="youtube-embed my-2">
                <div className="bg-red-500/10 rounded-lg border border-red-500/20 p-3">
                    <div className="flex justify-between items-center">
                        <div className="text-gray-500">Loading video...</div>
                        <button
                            onClick={() => loadVideoData(true)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                            title="Reload video"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const embedUrl = getEmbedUrl(videoId);
    if (!embedUrl) {
        return (
            <div className="youtube-embed my-2">
                <div className="bg-red-500/10 rounded-lg border border-red-500/20 p-3">
                    <div className="flex justify-between items-center mb-2">
                        <div className="text-red-500">Invalid YouTube URL</div>
                    </div>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">
                        View on YouTube
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div 
            className="youtube-embed my-2"
            onMouseEnter={handleMouseEnter}
        >
            <div className="bg-red-500/10 rounded-lg border border-red-500/20 overflow-hidden">
                <div className="p-3 flex items-center justify-between border-b border-red-500/20">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                        </svg>
                        <div className="flex flex-col">
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">
                                View on YouTube
                            </a>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => loadVideoData(true)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                            title="Reload video"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="relative pt-[56.25%] w-full">
                    <iframe
                        ref={embedContainerRef}
                        className="absolute top-0 left-0 w-full h-full"
                        src={embedUrl}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                        onError={(e) => {
                            setError('Failed to load video');
                        }}
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                </div>
            </div>
        </div>
    );
};

// Grok Image Embed component
const GrokImageEmbed = ({ url }) => {
    return (
        <div className="flex items-center justify-center p-4 bg-gray-100 rounded-lg">
            <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-500 hover:text-blue-600 hover:underline"
            >
                View Grok Image
            </a>
        </div>
    );
};

// Helper function to process text with formatting
const processText = (text) => {
    if (!text) return '';

    // First handle post number links to prevent them from being processed as greentext
    let processed = text.replace(
        /(>>\d+)/g,
        '<span class="text-blue-400 hover:text-blue-300 cursor-pointer">$1</span>'
    );

    // Handle bold text
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Handle italic text
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Handle underlined text
    processed = processed.replace(/__(.*?)__/g, '<u>$1</u>');

    // Handle code text
    processed = processed.replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1 rounded break-all">$1</code>');

    // Handle links (including Twitter/X links)
    processed = processed.replace(/(https?:\/\/[^\s]+)/g, (url) => {
        // Remove any trailing punctuation
        const cleanUrl = url.replace(/[.,;:!?]+$/, '');
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline break-all">${cleanUrl}</a>`;
    });

    // Process greentext (only for lines starting with > that aren't post number links)
    processed = processed.split('\n').map(line => {
        if (line.trim().startsWith('>') && !line.trim().startsWith('>>')) {
            return `<span class="text-green-500">${line}</span>`;
        }
        return line;
    }).join('\n');

    return processed;
};

// PostPreview component for internal post links
const PostPreview = ({ url }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [postData, setPostData] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const embedContainerRef = useRef(null);

    const loadPostData = async (forceReload = false) => {
        setIsLoading(true);
        setError(null);

        try {
            const postId = url.split('/').pop();
            if (!postId) {
                throw new Error('Invalid post URL');
            }

            const response = await fetch(`/api/posts/${postId}`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch post data');
            }

            const data = await response.json();
            setPostData(data);
            setIsLoading(false);

        } catch (err) {
            console.error('Error loading post:', err);
            if (retryCount < 2) {
                setTimeout(() => {
                    setRetryCount(prev => prev + 1);
                }, 1000 * (retryCount + 1));
            } else {
                setError(err.message || 'Failed to load post');
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        loadPostData();
    }, [url]);

    if (error) {
        return (
            <div className="post-preview my-2">
                <div className="bg-blue-500/10 rounded-lg border border-blue-500/20 p-3">
                    <div className="flex justify-between items-center mb-2">
                        <div className="text-red-500">{error}</div>
                        <button
                            onClick={() => loadPostData(true)}
                            className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors"
                            title="Reload post"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        View Post
                    </a>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="post-preview my-2">
                <div className="bg-blue-500/10 rounded-lg border border-blue-500/20 p-3">
                    <div className="flex justify-between items-center">
                        <div className="text-gray-500">Loading post...</div>
                        <button
                            onClick={() => loadPostData(true)}
                            className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors"
                            title="Reload post"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="post-preview my-2">
            <div className="bg-blue-500/10 rounded-lg border border-blue-500/20 overflow-hidden">
                <div className="p-3 flex items-center justify-between border-b border-blue-500/20">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"/>
                            <path d="M6 10h12v2H6zm0-4h12v2H6z"/>
                        </svg>
                        <div className="flex flex-col">
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                {postData?.author ? `@${postData.author}` : 'View Post'}
                            </a>
                        </div>
                    </div>
                </div>
                <div className="p-3" ref={embedContainerRef}>
                    {postData && (
                        <>
                            <div className="mb-3">
                                <QuoteText text={postData.content} />
                            </div>
                            {postData.media && postData.media.length > 0 && (
                                <div className="grid gap-2 mt-3">
                                    {postData.media.map((url, index) => (
                                        <div key={index} className="relative rounded-lg overflow-hidden">
                                            <img 
                                                src={url} 
                                                alt={`Post media ${index + 1}`}
                                                className="w-full h-auto object-contain max-h-[400px]"
                                                loading="lazy"
                                                onError={(e) => {
                                                    console.error('Failed to load media:', url);
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const QuoteText = ({ text, onQuoteClick }) => {
    if (!text) return null;

    // Split text into parts and extract all media URLs
    const parts = text.split(/(>>\d+)/g);
    const mediaElements = [];
    let currentText = '';
    let mediaIndex = 0;

    parts.forEach((part, index) => {
        // Handle quote references
        const quoteMatch = part.match(/>>(\d+)/);
        if (quoteMatch) {
            // If there's accumulated text, process it first
            if (currentText) {
                mediaElements.push(
                    <div key={`text-${mediaIndex}`} dangerouslySetInnerHTML={{ __html: processText(currentText) }} />
                );
                currentText = '';
                mediaIndex++;
            }
            // Add the post number link
            mediaElements.push(
                <PostNumberLink
                    key={`quote-${mediaIndex}`}
                    postNumber={parseInt(quoteMatch[1])}
                    onQuoteClick={onQuoteClick}
                />
            );
            mediaIndex++;
            return;
        }

        // Extract all URLs from the part
        const urls = part.match(/(?:@)?(https?:\/\/[^\s]+)/g) || [];
        let remainingText = part;

        // Process each URL
        urls.forEach(url => {
            // Remove the URL from the remaining text
            remainingText = remainingText.replace(url, '').trim();

            // Add the text before the URL
            if (remainingText) {
                currentText += remainingText;
                remainingText = '';
            }

            // Handle different types of URLs
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                mediaElements.push(
                    <div key={`youtube-${mediaIndex}`} className="mb-4">
                        <YouTubeEmbed url={url} />
                    </div>
                );
            } else if (url.includes('/i/grok/share/')) {
                mediaElements.push(
                    <div key={`grok-${mediaIndex}`} className="mb-4">
                        <GrokImageEmbed url={url} />
                    </div>
                );
            } else if (url.includes('twitter.com') || url.includes('x.com')) {
                // Add both the clickable link and the embed
                mediaElements.push(
                    <div key={`twitter-${mediaIndex}`} className="mb-4">
                        <div className="mb-2">
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                                {url}
                            </a>
                        </div>
                        <TwitterEmbed url={url} />
                    </div>
                );
            } else if (url.includes('tradehub.ap.ngrok.io/post/')) {
                mediaElements.push(
                    <div key={`post-${mediaIndex}-${url}`} className="mb-4">
                        <PostPreview url={url} />
                    </div>
                );
            } else {
                // For other URLs, just add them to the text
                currentText += url;
            }
            mediaIndex++;
        });

        // Add any remaining text
        if (remainingText) {
            currentText += remainingText;
        }
    });

    // Add any remaining text
    if (currentText) {
        mediaElements.push(
            <div key={`text-${mediaIndex}`} dangerouslySetInnerHTML={{ __html: processText(currentText) }} />
        );
    }

    return (
        <div className="whitespace-pre-wrap break-words break-all overflow-hidden">
            {mediaElements}
        </div>
    );
};

// Add error handling for post views
const handlePostView = async (postId) => {
    try {
        const response = await fetch(`/api/posts/${postId}/view`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn(`Failed to record post view for ${postId}:`, response.status);
            // Don't throw error to prevent UI disruption
        }
    } catch (error) {
        console.warn(`Error recording post view for ${postId}:`, error);
        // Don't throw error to prevent UI disruption
    }
};

// Add this to your CSS or style block
const styles = `
@keyframes gradient-x {
    0%, 100% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
}

@keyframes float {
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-10px);
    }
}

.animate-gradient-x {
    background-size: 200% 200%;
    animation: gradient-x 15s ease infinite;
}

.animate-float {
    animation: float 3s ease-in-out infinite;
}
`;

export default QuoteText;