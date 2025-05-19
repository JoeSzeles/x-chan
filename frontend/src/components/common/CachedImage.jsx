import React, { useState, useEffect } from 'react';

const CACHE_PREFIX = 'img_cache_';
const CACHE_EXPIRY = 1000 * 60 * 60 * 24; // 24 hours
const MAX_CACHE_SIZE = 4 * 1024 * 1024; // 4MB limit for cache entries
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// Removed YouTube thumbnail handling code

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
                const currentUrl = src;
                console.log('[CachedImage] Attempting to load URL:', currentUrl);

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