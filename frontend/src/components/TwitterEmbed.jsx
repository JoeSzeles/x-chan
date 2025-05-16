import React, { useState, useEffect } from 'react';

const TwitterEmbed = ({ url }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tweetData, setTweetData] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const loadTweet = async () => {
            try {
                // First try to load using Twitter's oEmbed API
                const response = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&theme=dark`);
                if (!response.ok) throw new Error('Failed to load tweet data');
                
                const data = await response.json();
                if (isMounted) {
                    setTweetData(data);
                    setError(null);
                }
            } catch (err) {
                console.error('Error loading tweet:', err);
                if (isMounted) {
                    setError('Failed to load tweet');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadTweet();

        return () => {
            isMounted = false;
        };
    }, [url]);

    if (isLoading) {
        return (
            <div className="twitter-embed my-2">
                <div className="bg-[#1d9bf0]/10 rounded-lg border border-[#1d9bf0]/20 p-3">
                    <div className="flex justify-between items-center">
                        <div className="text-gray-500">Loading tweet...</div>
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
            <div className="twitter-embed my-2">
                <div className="bg-[#1d9bf0]/10 rounded-lg border border-[#1d9bf0]/20 p-3">
                    <div className="text-red-500">{error}</div>
                    <a 
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600"
                    >
                        View on Twitter
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="twitter-embed my-2">
            <div className="bg-[#1d9bf0]/10 rounded-lg border border-[#1d9bf0]/20 overflow-hidden">
                <div className="p-3 flex items-center gap-2 border-b border-[#1d9bf0]/20">
                    <svg className="w-5 h-5 text-[#1d9bf0] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <a 
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1d9bf0] hover:underline"
                    >
                        View on Twitter
                    </a>
                </div>
                <div 
                    className="p-3"
                    dangerouslySetInnerHTML={{ __html: tweetData?.html || '' }}
                />
            </div>
        </div>
    );
};

export default TwitterEmbed; 