import React, { useState, useEffect } from 'react';

const CACHE_PREFIX = 'img_cache_';
const CACHE_EXPIRY = 1000 * 60 * 60 * 24; // 24 hours
const MAX_CACHE_SIZE = 4 * 1024 * 1024; // 4MB limit for cache entries
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// Helper function to extract YouTube video ID
const extractYouTubeId = (url) => {
    console.log('[CachedImage] Attempting to extract YouTube ID from:', url);
    if (!url) {
        console.log('[CachedImage] No URL provided');
        return null;
    }

    try {
        // Handle various YouTube URL formats
        const patterns = [
            /(?:youtube\.com\/vi\/|youtu\.be\/)([^&?/]+)/,  // youtu.be/ID or youtube.com/vi/ID
            /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/)([^&?/]+)/,  // youtube.com/watch?v=ID
            /(?:youtube\.com\/v\/)([^&?/]+)/,  // youtube.com/v/ID
            /(?:youtube\.com\/shorts\/)([^&?/]+)/,  // youtube.com/shorts/ID
            /(?:youtube\.com\/vi\/)([^&?/]+)/,  // youtube.com/vi/ID
            /(?:youtube\.com\/user\/[^/]+\/videos\/)([^&?/]+)/,  // youtube.com/user/username/videos/ID
            /(?:youtube\.com\/channel\/[^/]+\/videos\/)([^&?/]+)/  // youtube.com/channel/channelname/videos/ID
        ];

        // First try to match any of our patterns
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }

        // If no pattern matches, try to extract from query parameters
        const urlObj = new URL(url);
        const videoId = urlObj.searchParams.get('v');
        if (videoId) return videoId;

        return null;
    } catch (error) {
        // If URL parsing fails, try a last resort regex
        const lastResortMatch = url.match(/[?&]v=([^&]+)/);
        return lastResortMatch ? lastResortMatch[1] : null;
    }
};

// Helper function to get YouTube thumbnail URL with quality fallback
const getYouTubeThumbnailUrl = (videoId) => {
    console.log('[CachedImage] Getting thumbnail URL for video ID:', videoId);
    if (!videoId) {
        console.log('[CachedImage] No video ID provided');
        return null;
    }

    // Clean the video ID (remove any extra parameters)
    const cleanId = videoId.split('&')[0].split('?')[0];
    console.log('[CachedImage] Cleaned video ID:', cleanId);

    // Try different thumbnail qualities in order
    const qualities = [
        'maxresdefault.jpg',
        'sddefault.jpg',
        'hqdefault.jpg',
        'mqdefault.jpg',
        'default.jpg'
    ];

    return qualities.map(quality => `https://img.youtube.com/vi/${cleanId}/${quality}`);
};

const CachedImage = ({ 
    src, 
    alt = '', 
    className = '', 
    fallbackSrc = '/avatar-placeholder.png',
    loading = 'lazy',
    ...props 
}) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [currentQualityIndex, setCurrentQualityIndex] = useState(0);

    useEffect(() => {
        let isMounted = true;
        let retryTimeout;

        const loadImage = async () => {
        console.log('[CachedImage] Loading image with src:', src);
        console.log('[CachedImage] Current loading state:', isLoading);
        console.log('[CachedImage] Current error state:', error);
        console.log('[CachedImage] Current retry count:', retryCount);
        
        if (!src) {
            console.log('[CachedImage] No src provided, using fallback:', fallbackSrc);
            setImageSrc(fallbackSrc);
            return;
        }

            try {
                // Handle YouTube thumbnails
                const videoId = extractYouTubeId(src);
                let urlsToTry = [src];

                if (videoId) {
                    urlsToTry = getYouTubeThumbnailUrl(videoId);
                }

                // Try current quality first
                const currentUrl = urlsToTry[currentQualityIndex];
                console.log('[CachedImage] Attempting to load URL:', currentUrl);

                // For YouTube thumbnails, use direct img tag loading
                if (videoId) {
                    console.log('[CachedImage] Loading YouTube thumbnail, quality index:', currentQualityIndex);
                    if (isMounted) {
                        setImageSrc(currentUrl);
                        setIsLoading(false);
                    }
                    return;
                }

                // For non-YouTube images, use fetch with caching
                const cachedData = localStorage.getItem(CACHE_PREFIX + currentUrl);
                if (cachedData) {
                    const { data, timestamp } = JSON.parse(cachedData);
                    const now = Date.now();

                    if (now - timestamp < CACHE_EXPIRY) {
                        if (isMounted) {
                            setImageSrc(data);
                            setIsLoading(false);
                            return;
                        }
                    } else {
                        localStorage.removeItem(CACHE_PREFIX + currentUrl);
                    }
                }

                // If not in cache or expired, fetch the image
                const response = await fetch(currentUrl, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache',
                    credentials: 'same-origin',
                    headers: {
                        'Accept': 'image/*'
                    }
                });

                if (!response.ok) {
                    // If this is a YouTube thumbnail and we have more qualities to try
                    if (videoId && currentQualityIndex < urlsToTry.length - 1) {
                        setCurrentQualityIndex(prev => prev + 1);
                        return;
                    }
                    throw new Error(`Failed to load image: ${response.status} ${response.statusText}`);
                }

                const blob = await response.blob();

                // Verify it's actually an image
                if (!blob.type.startsWith('image/')) {
                    throw new Error('Invalid image format');
                }

                const objectUrl = URL.createObjectURL(blob);

                // Only cache if the image is small enough
                if (blob.size <= MAX_CACHE_SIZE) {
                    try {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64data = reader.result;
                            try {
                                localStorage.setItem(CACHE_PREFIX + currentUrl, JSON.stringify({
                        data: base64data,
                        timestamp: Date.now()
                    }));
                            } catch (storageError) {
                                // Silently handle storage errors
                            }
                };
                reader.readAsDataURL(blob);
                    } catch (error) {
                        // Silently handle processing errors
                    }
                }

                if (isMounted) {
                    setImageSrc(objectUrl);
                    setIsLoading(false);
                    setError(false);
                }
            } catch (err) {
                // Silently handle errors without logging
                if (isMounted) {
                    if (retryCount < MAX_RETRIES) {
                        retryTimeout = setTimeout(() => {
                            setRetryCount(prev => prev + 1);
                        }, RETRY_DELAY * (retryCount + 1));
                    } else {
                    setError(true);
                    setImageSrc(fallbackSrc);
                    setIsLoading(false);
                    }
                }
            }
        };

        loadImage();

        return () => {
            isMounted = false;
            if (retryTimeout) {
                clearTimeout(retryTimeout);
            }
            if (imageSrc && imageSrc.startsWith('blob:')) {
                URL.revokeObjectURL(imageSrc);
            }
        };
    }, [src, fallbackSrc, retryCount, currentQualityIndex]);

    return (
        <img
            src={imageSrc || fallbackSrc}
            alt={alt}
            className={`${className} ${isLoading ? 'animate-pulse bg-gray-700' : ''} ${error ? 'opacity-50' : ''}`}
            loading={loading}
            onError={() => {
                if (retryCount < MAX_RETRIES) {
                    setRetryCount(prev => prev + 1);
                } else {
                setError(true);
                setImageSrc(fallbackSrc);
                }
            }}
            {...props}
        />
    );
};

export default CachedImage;