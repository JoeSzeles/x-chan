import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import LoadingSpinner from '../common/LoadingSpinner';

const NewsCards = ({ viewMode }) => {
    const { data: botArticles, isLoading } = useQuery({
        queryKey: ['botArticles'],
        queryFn: async () => {
            // First get all bots
            const botsRes = await fetch('/api/newsbot', {
                credentials: 'include'
            });
            if (!botsRes.ok) throw new Error('Failed to fetch bots');
            const botsData = await botsRes.json();
            
            if (!botsData.success || !botsData.data || botsData.data.length === 0) {
                return [];
            }

            // Get articles from each bot
            const allArticles = [];
            for (const bot of botsData.data) {
                const articlesRes = await fetch(`/api/newsbot/${bot._id}/articles?limit=10`, {
                    credentials: 'include'
                });
                if (articlesRes.ok) {
                    const articlesData = await articlesRes.json();
                    if (articlesData.success && articlesData.data.articles) {
                        allArticles.push(...articlesData.data.articles);
                    }
                }
            }

            // Shuffle and limit to 12 articles
            return allArticles
                .sort(() => Math.random() - 0.5)
                .slice(0, 12);
        }
    });

    const isVideoUrl = (url) => {
        return url?.includes('youtube.com') || url?.includes('youtu.be') || url?.includes('vimeo.com');
    };

    const getVideoThumbnail = (url) => {
        if (url?.includes('youtube.com') || url?.includes('youtu.be')) {
            const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
            return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
        }
        if (url?.includes('vimeo.com')) {
            const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
            return videoId ? `https://vumbnail.com/${videoId}_small.jpg` : null;
        }
        return null;
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' + secs : secs}`;
    };

    const formatViews = (viewCount) => {
        if (!viewCount) return '';
        if (viewCount >= 1000000) {
            return (viewCount / 1000000).toFixed(1) + 'M views';
        } else if (viewCount >= 1000) {
            return (viewCount / 1000).toFixed(1) + 'K views';
        }
        return viewCount + ' views';
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!botArticles || botArticles.length === 0) {
        return (
            <div className="text-center text-gray-500 py-8">
                No articles available from bots
            </div>
        );
    }

    return (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-4"}>
            {botArticles.map((article) => (
                <div
                    key={article._id}
                    className={`bg-[#1e1e1e] rounded-lg overflow-hidden hover:bg-[#2a2a2a] transition-colors ${
                        viewMode === "grid" ? "h-auto" : ""
                    }`}
                >
                    {isVideoUrl(article.url) ? (
                        <div className={`${viewMode === "grid" ? "h-48" : "h-64"} relative aspect-video`}>
                            <img
                                src={getVideoThumbnail(article.url)}
                                alt={article.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://via.placeholder.com/400x300?text=Video+Preview';
                                }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                    </svg>
                                </div>
                            </div>
                            {article.duration && (
                                <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                    {formatDuration(article.duration)}
                                </div>
                            )}
                        </div>
                    ) : article.imageUrl ? (
                        <div className={`${viewMode === "grid" ? "h-48" : "h-64"} relative`}>
                            <img
                                src={article.imageUrl}
                                alt={article.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                                }}
                            />
                        </div>
                    ) : null}
                    <div className="p-4">
                        <h3 className="text-lg font-semibold mb-2">{article.title}</h3>
                        <p className="text-gray-400 text-sm mb-4">{article.description}</p>
                        
                        {isVideoUrl(article.url) && (
                            <div className="mb-3">
                                {(article.author || article.channel?.name) && (
                                    <a 
                                        href={article.channel?.link || '#'} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-400 hover:text-blue-300 block mb-1"
                                    >
                                        {article.author || article.channel?.name}
                                    </a>
                                )}
                                <div className="flex flex-wrap items-center text-xs text-gray-400 gap-2">
                                    {article.views && <span>{formatViews(article.views)}</span>}
                                    {article.uploaded && <span>• {article.uploaded}</span>}
                                </div>
                            </div>
                        )}
                        
                        <div className="flex justify-between items-center text-sm text-gray-500">
                            <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                            <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-400"
                                onClick={(e) => {
                                    if (isVideoUrl(article.url)) {
                                        e.preventDefault();
                                        const videoId = article.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                                        if (videoId) {
                                            window.open(`https://www.youtube.com/embed/${videoId}?autoplay=1`, '_blank', 'width=800,height=450');
                                        } else {
                                            window.open(article.url, '_blank');
                                        }
                                    }
                                }}
                            >
                                {isVideoUrl(article.url) ? 'Watch' : 'Read more'}
                            </a>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default NewsCards; 