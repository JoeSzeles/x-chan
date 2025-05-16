import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GrokImage = ({ imageId }) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    const maxRetries = 3;

    useEffect(() => {
        let isMounted = true;
        let blobUrl = null;

        const loadImage = async () => {
            try {
                // First try the API endpoint
                const apiUrl = `${process.env.REACT_APP_API_URL || ''}/api/grok/image/${imageId}`;
                console.log('Attempting to load image from API:', apiUrl);
                
                const response = await axios.get(apiUrl, {
                    responseType: 'blob',
                    headers: {
                        'Accept': 'image/*',
                        'Cache-Control': 'no-cache'
                    },
                    timeout: 5000 // 5 second timeout
                });

                if (response.status === 200 && response.data) {
                    const blob = new Blob([response.data], { type: response.headers['content-type'] });
                    if (isMounted) {
                        blobUrl = URL.createObjectURL(blob);
                        setImageUrl(blobUrl);
                        setError(null);
                        setRetryCount(0);
                    }
                    return;
                }

                // If API fails, try direct Grok URL
                console.log('API failed, trying direct Grok URL');
                const grokResponse = await fetch(`https://x.com/i/grok/share/${imageId}`, {
                    headers: {
                        'Accept': 'image/*',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });

                if (grokResponse.ok) {
                    const blob = await grokResponse.blob();
                    if (isMounted) {
                        blobUrl = URL.createObjectURL(blob);
                        setImageUrl(blobUrl);
                        setError(null);
                        setRetryCount(0);
                    }
                    return;
                }

                // If both fail and we haven't exceeded max retries, try again
                if (retryCount < maxRetries) {
                    console.log(`Retrying image load (attempt ${retryCount + 1}/${maxRetries})...`);
                    setRetryCount(prev => prev + 1);
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount))); // Exponential backoff
                    return loadImage();
                }

                throw new Error('Failed to load image. The image may have been deleted or is no longer available.');
            } catch (err) {
                console.error('Error loading Grok image:', err);
                if (isMounted) {
                    if (retryCount < maxRetries) {
                        setRetryCount(prev => prev + 1);
                        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
                        return loadImage();
                    }
                    setError('Failed to load image. The image may have been deleted or is no longer available.');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadImage();

        return () => {
            isMounted = false;
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [imageId, retryCount]);

    const handleRetry = () => {
        setRetryCount(0);
        setIsLoading(true);
        setError(null);
    };

    if (isLoading) {
        return (
            <div className="grok-image my-2">
                <div className="bg-red-500/10 rounded-lg border border-red-500/20 p-3">
                    <div className="flex justify-between items-center">
                        <div className="text-gray-500">
                            {retryCount > 0 ? `Retrying... (${retryCount}/${maxRetries})` : 'Loading image...'}
                        </div>
                        <button 
                            onClick={handleRetry}
                            className="text-blue-500 hover:text-blue-600"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="grok-image my-2">
                <div className="bg-red-500/10 rounded-lg border border-red-500/20 p-3">
                    <div className="text-red-500">{error}</div>
                    <div className="mt-2 flex gap-2">
                        <a 
                            href={`https://x.com/i/grok/share/${imageId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600"
                        >
                            View on X
                        </a>
                        <button
                            onClick={handleRetry}
                            className="text-blue-500 hover:text-blue-600"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grok-image my-2">
            <div className="bg-red-500/10 rounded-lg border border-red-500/20 overflow-hidden">
                <img
                    src={imageUrl}
                    alt="Grok image"
                    className="w-full h-auto"
                    loading="lazy"
                    onError={() => setError('Failed to load image. The image may have been deleted or is no longer available.')}
                />
            </div>
        </div>
    );
};

export default GrokImage; 