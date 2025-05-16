import React, { useState, useEffect } from 'react';
import TwitterEmbed from './TwitterEmbed';
import PostNumberLink from '../components/common/PostNumberLink';

const loadGrokImage = async (imageId, retryCount = 0) => {
    const maxRetries = 3;
    const formats = ['jpg', 'png', 'webp'];
    const sizes = ['large', 'orig'];
    
    // Try direct Grok URL first
    try {
        const response = await fetch(`https://x.com/i/grok/share/${imageId}`, {
            headers: {
                'Accept': 'image/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        }
    } catch (error) {
        console.warn('Failed to load from Grok share URL:', error);
    }

    // Try Twitter media URLs
    for (const format of formats) {
        for (const size of sizes) {
            const url = `https://pbs.twimg.com/media/${imageId}?format=${format}&name=${size}`;
            try {
                const response = await fetch(url, {
                    headers: {
                        'Accept': 'image/*',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    return URL.createObjectURL(blob);
                }
            } catch (error) {
                console.warn(`Failed to load image from ${url}:`, error);
            }
        }
    }

    // If all attempts fail and we haven't exceeded max retries, try again
    if (retryCount < maxRetries) {
        console.log(`Retrying image load (attempt ${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount))); // Exponential backoff
        return loadGrokImage(imageId, retryCount + 1);
    }

    throw new Error('Failed to load image after multiple attempts');
};

const GrokImage = ({ imageId }) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        let blobUrl = null;

        const loadImage = async () => {
            try {
                const url = await loadGrokImage(imageId);
                if (isMounted) {
                    blobUrl = url;
                    setImageUrl(url);
                    setError(null);
                }
            } catch (err) {
                if (isMounted) {
                    setError('Failed to load image');
                    console.error('Error loading Grok image:', err);
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
    }, [imageId]);

    if (isLoading) {
        return (
            <div className="grok-image my-2">
                <div className="bg-red-500/10 rounded-lg border border-red-500/20 p-3">
                    <div className="flex justify-between items-center">
                        <div className="text-gray-500">Loading image...</div>
                        <button 
                            onClick={() => setIsLoading(true)}
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
                    <a 
                        href={`https://x.com/i/grok/share/${imageId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600"
                    >
                        View on X
                    </a>
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
                    onError={() => setError('Failed to load image')}
                />
            </div>
        </div>
    );
};

const QuoteText = ({ text, onQuoteClick }) => {
    const renderContent = () => {
        if (!text) return null;

        // First, split the text into lines to handle greentext properly
        const lines = text.split('\n');
        
        return lines.map((line, lineIndex) => {
            // Check if this is a post number reference
            const postNumberMatch = line.match(/>>(\d+)/);
            if (postNumberMatch) {
                return (
                    <PostNumberLink
                        key={lineIndex}
                        postNumber={parseInt(postNumberMatch[1])}
                        onQuoteClick={onQuoteClick}
                    />
                );
            }

            // Check if this is greentext (starts with > but not >>)
            if (line.trim().startsWith('>') && !line.trim().startsWith('>>')) {
                return (
                    <div key={lineIndex} className="text-green-500">
                        {line}
                    </div>
                );
            }

            // Check for Twitter URLs
            const twitterMatch = line.match(/(?:@)?(https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/\d+)/);
            if (twitterMatch) {
                const tweetUrl = twitterMatch[0];
                const remainingText = line.replace(tweetUrl, '').trim();
                
                return (
                    <div key={lineIndex}>
                        {remainingText && (
                            <span dangerouslySetInnerHTML={{ 
                                __html: remainingText
                                    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>')
                                    .replace(/@(\w+)/g, '<a href="/user/$1" class="text-blue-500 hover:underline">@$1</a>')
                                    .replace(/#(\w+)/g, '<a href="/hashtag/$1" class="text-blue-500 hover:underline">#$1</a>')
                            }} />
                        )}
                        <TwitterEmbed url={tweetUrl} />
                    </div>
                );
            }
            
            // Check for Grok URLs
            const grokMatch = line.match(/(?:@)?(https?:\/\/(?:x\.com|twitter\.com)\/i\/grok\/share\/[^\s]+)/);
            if (grokMatch) {
                const grokUrl = grokMatch[0];
                const remainingText = line.replace(grokUrl, '').trim();
                
                return (
                    <div key={lineIndex}>
                        {remainingText && (
                            <span dangerouslySetInnerHTML={{ 
                                __html: remainingText
                                    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>')
                                    .replace(/@(\w+)/g, '<a href="/user/$1" class="text-blue-500 hover:underline">@$1</a>')
                                    .replace(/#(\w+)/g, '<a href="/hashtag/$1" class="text-blue-500 hover:underline">#$1</a>')
                            }} />
                        )}
                        <GrokImage imageId={grokUrl.split('/').pop()} />
                    </div>
                );
            }
            
            // Regular text with formatting
            return (
                <div key={lineIndex} dangerouslySetInnerHTML={{ 
                    __html: line
                        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>')
                        .replace(/@(\w+)/g, '<a href="/user/$1" class="text-blue-500 hover:underline">@$1</a>')
                        .replace(/#(\w+)/g, '<a href="/hashtag/$1" class="text-blue-500 hover:underline">#$1</a>')
                }} />
            );
        });
    };

    return (
        <div className="whitespace-pre-wrap break-words break-all overflow-hidden">
            {renderContent()}
        </div>
    );
};

export default QuoteText; 