import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import LoadingSpinner from "../common/LoadingSpinner";
import axios from "axios";
import io from "socket.io-client";

const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
);

const BookmarkIcon = ({ isBookmarked }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill={isBookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
    </svg>
);

// Add NotificationIcon component
const NotificationIcon = ({ hasNew }) => (
    <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {hasNew && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
        )}
    </div>
);

const BotArticles = ({ botId, isOpen, onClose }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [failedThumbnails, setFailedThumbnails] = useState(new Set());
    const [embedError, setEmbedError] = useState(false);
    const [showPostPopup, setShowPostPopup] = useState(false);
    const [postContent, setPostContent] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasNewArticles, setHasNewArticles] = useState(false);
    const [lastArticleCount, setLastArticleCount] = useState(0);
    const [socket, setSocket] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const queryClient = useQueryClient();
    const limit = 20;
    const [bookmarkedArticles, setBookmarkedArticles] = useState(new Set());
    const MAX_ARTICLES = 500;
    const MAX_RETRIES = 3;

    // Initialize WebSocket connection with retry logic
    useEffect(() => {
        if (isOpen && retryCount < MAX_RETRIES) {
            const connectSocket = () => {
                const host = window.location.hostname;
                const port = '5000';
                const url = `${window.location.protocol}//${host}:${port}`;
                
                const socket = io(url, {
        transports: ['polling', 'websocket'],
        path: '/socket.io/',
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
        forceNew: true,
        withCredentials: true
    });

                socket.on('connect_error', (error) => {
                    console.error('[Socket] Connection error details:', {
                        message: error.message,
                        type: error.type,
                        description: error.description,
                        stack: error.stack,
                        transport: socket.io?.engine?.transport?.name,
                        protocol: socket.io?.engine?.protocol,
                        readyState: socket.io?.engine?.readyState,
                        uri: socket.io?.uri,
                        options: socket.io?.opts,
                        timestamp: new Date().toISOString()
                    });

                    // Log socket engine state
                    console.log('[Socket] Engine state:', {
                        state: socket.io?.engine?.state,
                        transport: socket.io?.engine?.transport,
                        hostname: window.location.hostname,
                        protocol: window.location.protocol,
                        pathname: socket.io?.engine?.path
                    });

                    if (error.message.includes('xhr poll error')) {
                        console.log('[Socket] Polling error detected, attempting reconnect...');
                        socket.io.opts.transports = ['polling'];
                        socket.connect();
                    } else if (error.message.includes('timeout')) {
                        console.log('[Socket] Timeout detected, attempting reconnect...');
                        socket.io.opts.transports = ['polling'];
                        socket.connect();
                    } else {
                        console.log('[Socket] Unknown error, attempting reconnect...');
                        socket.io.opts.transports = ['polling'];
                        socket.connect();
                    }
                });

                socket.on('error', (error) => {
                    console.error('[Socket] General error:', {
                        error,
                        timestamp: new Date().toISOString(),
                        readyState: socket.io?.engine?.readyState,
                        transport: socket.io?.engine?.transport?.name
                    });
                });

                socket.on('reconnect_attempt', (attempt) => {
                    console.log('[Socket] Reconnection attempt:', {
                        attempt,
                        timestamp: new Date().toISOString(),
                        options: socket.io?.opts
                    });
                });

                socket.on('connect', () => {
                    console.log('Socket connected successfully');
                    socket.emit('joinBotRoom', botId);
                    setRetryCount(0);
                    toast.success('Connected to server');
                });

                socket.on('disconnect', (reason) => {
                    console.log('Socket disconnected:', reason);
                    if (reason === 'io server disconnect') {
                        socket.connect();
                    } else if (reason === 'transport error' || reason === 'ping timeout') {
                        socket.io.opts.transports = ['polling'];
                        socket.connect();
                    }
                });

                socket.on('newArticles', (data) => {
                    console.log('Received new articles notification:', data);
                    setHasNewArticles(true);
                    toast.success('New articles available! Click refresh to see them.', {
                        duration: 5000,
                        position: "bottom-right",
                        style: {
                            background: '#1a1a1a',
                            color: '#fff',
                            border: '1px solid #333'
                        }
                    });
                });

                setSocket(socket);
            };

            connectSocket();

            return () => {
                if (socket) {
                    console.log('Cleaning up WebSocket connection');
                    socket.disconnect();
                }
            };
        }
    }, [isOpen, botId, retryCount]);

    // Main articles query with better error handling
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["botArticles", botId, currentPage],
        queryFn: async () => {
            try {
                const res = await fetch(`/api/newsbot/${botId}/articles?page=${currentPage}&limit=${limit}`, {
                    credentials: 'include',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to fetch articles');
                }

                const data = await res.json();
                if (!data.success) {
                    throw new Error(data.error || 'Failed to fetch articles');
                }

                // Sort articles by publishedAt in descending order
                const sortedArticles = (data.data.articles || []).sort((a, b) => 
                    new Date(b.publishedAt) - new Date(a.publishedAt)
                );

                return {
                    ...data.data,
                    articles: sortedArticles
                };
            } catch (error) {
                console.error('Error fetching articles:', error);
                throw error;
            }
        },
        enabled: isOpen,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchInterval: 10000,
        refetchIntervalInBackground: true,
        staleTime: 0,
        cacheTime: 0,
        onError: (error) => {
            toast.error(error.message || 'Failed to fetch articles. Please try again.', {
                duration: 5000,
                position: "bottom-right",
                style: {
                    background: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid #333'
                }
            });
        }
    });

    // Update lastArticleCount when data changes
    useEffect(() => {
        if (data?.totalArticles) {
            setLastArticleCount(data.totalArticles);
        }
    }, [data?.totalArticles]);

    // Enhanced refresh function
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            // Force refetch by invalidating all queries
            await queryClient.invalidateQueries(["botArticles", botId]);

            // Fetch fresh data
            const allArticles = await fetchAllArticles();
            console.log(`Fetched ${allArticles.length} total articles`);

            const validArticles = allArticles
                .filter(article => {
                    // Remove YouTube-only restriction
                    const hasValidUrl = !!article.url;
                    const hasValidTitle = !!article.title;
                    const hasValidDescription = !!article.description;

                    if (!hasValidUrl || !hasValidTitle || !hasValidDescription) {
                        console.log(`Article filtered out:`, {
                            title: article.title,
                            url: article.url,
                            hasValidUrl,
                            hasValidTitle,
                            hasValidDescription
                        });
                    }

                    return hasValidUrl && hasValidTitle && hasValidDescription;
                })
                .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

            console.log(`Found ${validArticles.length} valid articles after filtering`);

            // Update query data
            queryClient.setQueryData(["botArticles", botId, currentPage], {
                articles: validArticles.slice(0, limit),
                totalPages: Math.ceil(validArticles.length / limit),
                currentPage: 1,
                totalArticles: validArticles.length
            });

            // Update state
            setLastArticleCount(validArticles.length);
            setCurrentPage(1);
            setHasNewArticles(false);

            // Emit refresh event to WebSocket
            if (socket) {
                socket.emit('refreshArticles', { botId });
            }

            toast.success(`Found ${validArticles.length} valid articles`, {
                duration: 3000,
                position: "bottom-right",
                style: {
                    background: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid #333'
                }
            });
        } catch (error) {
            console.error('Refresh error:', error);
            toast.error("Failed to refresh feed", {
                duration: 3000,
                position: "bottom-right",
                style: {
                    background: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid #333'
                }
            });
        } finally {
            setIsRefreshing(false);
        }
    };

    // Update the clear feed mutation to be more reliable
    const clearFeedMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/newsbot/${botId}/clear`, {
                method: 'POST',
                credentials: 'include',
            });
            if (!res.ok) {
            const data = await res.json();
                throw new Error(data.error || "Failed to clear feed");
            }
            return res.json();
        },
        onSuccess: () => {
            // Reset all state
            setLastArticleCount(0);
            setHasNewArticles(false);
            setCurrentPage(1);

            // Reset the query data
            queryClient.setQueryData(["botArticles", botId, currentPage], {
                articles: [],
                totalPages: 0,
                currentPage: 1,
                totalArticles: 0
            });

            // Invalidate all queries
            queryClient.invalidateQueries(["botArticles", botId]);
            queryClient.invalidateQueries(["botArticlesPoll", botId]);

            toast.success("Feed cleared successfully", {
                duration: 3000,
                position: "bottom-right",
                style: {
                    background: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid #333'
                }
            });
        },
        onError: (error) => {
            toast.error(error.message || "Failed to clear feed", {
                duration: 3000,
                position: "bottom-right",
                style: {
                    background: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid #333'
                }
            });
        }
    });

    const fetchAllArticles = async () => {
        let allArticles = [];
        let currentPage = 1;
        let hasMore = true;

        while (hasMore && allArticles.length < MAX_ARTICLES) {
            const res = await fetch(`/api/newsbot/${botId}/articles?page=${currentPage}&limit=${limit}`, {
                credentials: 'include'
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to fetch articles");
            }

            if (data.data.articles.length === 0) {
                hasMore = false;
            } else {
                allArticles = [...allArticles, ...data.data.articles];
                currentPage++;
            }
        }

        // Sort articles by publishedAt and limit to MAX_ARTICLES
        return allArticles
            .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
            .slice(0, MAX_ARTICLES);
    };

    const postToFeedMutation = useMutation({
        mutationFn: async (postData) => {
            console.log('Starting post submission with data:', postData);
            try {
                const res = await fetch('/api/posts/create', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(postData)
                });

                console.log('Post response status:', res.status);

                // Check if response is ok before trying to parse JSON
                if (!res.ok) {
                    let errorMessage = 'Failed to post';
                    try {
                        const errorData = await res.json();
                        errorMessage = errorData.message || errorMessage;
                    } catch (e) {
                        // If we can't parse the error response as JSON, use the status text
                        errorMessage = res.statusText || errorMessage;
                    }
                    throw new Error(errorMessage);
                }

                const data = await res.json();
                console.log('Post response data:', data);
                return data;
            } catch (error) {
                console.error('Post submission error:', error);
                throw error;
            }
        },
        onSuccess: (data) => {
            console.log('Post successful:', data);
            queryClient.invalidateQueries(['posts']);
            toast.success('Posted successfully!');
            handleClosePostPopup();
        },
        onError: (error) => {
            console.error('Post failed:', error);
            toast.error(error.message || 'Failed to post. Please try again.');
        }
    });

    const handlePostSubmit = () => {
        console.log('handlePostSubmit called with:', {
            postContent,
            selectedArticle,
            hasImage: !!selectedArticle?.imageUrl,
            hasThumbnail: !!getYouTubeThumbnail(selectedArticle?.url)
        });

        if (!postContent.trim()) {
            toast.error('Post content cannot be empty');
            return;
        }

        if (!selectedArticle) {
            toast.error('No article selected');
            return;
        }

        const thumbnail = getYouTubeThumbnail(selectedArticle.url);
        console.log('Generated thumbnail URL:', thumbnail);

        // Format the post content to include the link at the top
        const cleanUrl = getCleanYouTubeUrl(selectedArticle.url);
        const cleanContent = postContent
            .replace(/Watch here:.*$/, '') // Remove the "Watch here" line
            .trim();

        // Add the link at the top of the content
        const formattedContent = `${cleanUrl}\n\n${cleanContent}`;

        const postData = {
            text: formattedContent,
            img: null, // Remove the thumbnail since the video will be shown
            videoUrl: selectedArticle.url,
            title: selectedArticle.title,
            description: selectedArticle.description
        };

        console.log('Submitting post with data:', postData);
        postToFeedMutation.mutate(postData);
    };

    const handlePostToFeed = async (article, event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        console.log('handlePostToFeed called with article:', article);

        try {
            if (isYouTubeUrl(article.url)) {
                const cleanUrl = getCleanYouTubeUrl(article.url);
                console.log('YouTube URL detected, clean URL:', cleanUrl);

                if (cleanUrl) {
                    const thumbnail = getYouTubeThumbnail(article.url);
                    console.log('Generated thumbnail URL:', thumbnail);

                    // Set all state at once to avoid race conditions
                    const content = `Reposted from bot\n\n${article.title}\n\n${article.description}\n\nWatch here: ${cleanUrl}`;

                    setSelectedArticle(article);
                    setPostContent(content);
                    setShowPostPopup(true);
                    console.log('Post popup state updated:', {
                        showPostPopup: true,
                        hasSelectedArticle: !!article,
                        hasContent: !!content
                    });
                } else {
                    toast.error('Invalid YouTube URL');
                    setSelectedArticle(null);
                    setShowPostPopup(false);
                }
            } else {
                const postData = {
                    text: `Reposted from bot\n\n${article.title}\n\n${article.description}\n\nRead more: ${article.url}`,
                    img: article.imageUrl
                };
                console.log('Submitting non-YouTube post with data:', postData);
                await postToFeedMutation.mutateAsync(postData);
                setSelectedArticle(null);
                setShowPostPopup(false);
            }
        } catch (error) {
            console.error('Error posting to feed:', error);
            toast.error('Failed to post. Please try again.');
        }
    };

    const handleClosePostPopup = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setShowPostPopup(false);
        setPostContent('');
        setSelectedArticle(null);
    };

    const handleViewDetails = (article) => {
        setSelectedArticle(article);
        setEmbedError(false);
    };

    const handleCloseDetails = () => {
        setSelectedArticle(null);
        setEmbedError(false);
    };

    const getYouTubeEmbedUrl = (url) => {
        try {
            // Handle different YouTube URL formats
            let videoId;
            if (url.includes('youtube.com/watch')) {
                videoId = new URL(url).searchParams.get('v');
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1].split('?')[0];
            } else if (url.includes('youtube.com/embed/')) {
                videoId = url.split('embed/')[1].split('?')[0];
            } else if (url.includes('youtube.com/shorts/')) {
                videoId = url.split('shorts/')[1].split('?')[0];
            }

            if (!videoId) {
                console.error('Could not extract video ID from URL:', url);
                return null;
            }

            // Use youtube-nocookie.com for enhanced privacy and better CSP compatibility
            return `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&modestbranding=1`;
        } catch (error) {
            console.error('Error parsing YouTube URL:', error);
            return null;
        }
    };

    const getYouTubeThumbnail = (url) => {
        try {
            let videoId;
            const urlObj = new URL(url);

            if (url.includes('youtube.com/watch')) {
                videoId = urlObj.searchParams.get('v');
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1]?.split(/[?#]/)[0];
            } else if (url.includes('youtube.com/embed/')) {
                videoId = url.split('embed/')[1]?.split(/[?#]/)[0];
            } else if (url.includes('youtube.com/shorts/')) {
                videoId = url.split('shorts/')[1]?.split(/[?#]/)[0];
            }

            if (!videoId) {
                console.error('Could not extract video ID from URL:', url);
                return '/avatar-placeholder.png';
            }

            return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        } catch (error) {
            console.error('Error parsing YouTube URL:', error);
            return '/avatar-placeholder.png';
        }
    };

    const isYouTubeUrl = (url) => {
        try {
            if (!url) return false;
            return url.includes('youtube.com/watch') || 
                   url.includes('youtu.be/') || 
                   url.includes('youtube.com/embed/') ||
                   url.includes('youtube.com/shorts/');
        } catch (error) {
            console.error('Error checking YouTube URL:', error);
            return false;
        }
    };

    const getCleanYouTubeUrl = (url) => {
        try {
            // Handle different YouTube URL formats
            let videoId;
            if (url.includes('youtube.com/watch')) {
                videoId = new URL(url).searchParams.get('v');
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1].split('?')[0];
            } else if (url.includes('youtube.com/embed/')) {
                videoId = url.split('embed/')[1].split('?')[0];
            } else if (url.includes('youtube.com/shorts/')) {
                videoId = url.split('shorts/')[1].split('?')[0];
            }

            if (!videoId) {
                console.error('Could not extract video ID from URL:', url);
                return null;
            }

            return `https://www.youtube.com/watch?v=${videoId}`;
        } catch (error) {
            console.error('Error cleaning YouTube URL:', error);
            return null;
        }
    };

    const handleImageError = (articleId, isYouTube = false) => {
        console.log(`Image load failed for article ${articleId}, isYouTube: ${isYouTube}`);
        setFailedThumbnails(prev => new Set([...prev, articleId]));
    };

    const handleEmbedError = () => {
        setEmbedError(true);
        toast.error("Unable to play video. Click 'Open Original' to watch on YouTube.", {
            duration: 5000,
            position: "bottom-right",
            style: {
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #333'
            }
        });
    };

    const getPlaceholderImage = (isYouTube = false) => {
        if (isYouTube) {
            return (
                <div className="w-full h-48 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                        <svg className="w-12 h-12 text-white mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                        <span className="text-white text-sm">Video Preview</span>
                    </div>
                </div>
            );
        }
        return (
            <div className="w-full h-48 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-400 text-sm">No Preview</span>
                </div>
            </div>
        );
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Link copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            toast.error('Failed to copy link');
        }
    };

    // Add a function to preload thumbnails
    const preloadThumbnail = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(url);
            img.onerror = () => reject(new Error(`Failed to load thumbnail: ${url}`));
            img.src = url;
        });
    };

    // Add bookmark mutation
    const bookmarkMutation = useMutation({
        mutationFn: async (article) => {
            // First create a post from the article
            const postData = {
                text: article.url, // Just the URL for video posts
                videoUrl: article.url,
                title: article.title,
                description: article.description
            };

            // Create the post
            const postRes = await fetch('/api/posts', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postData)
            });

            if (!postRes.ok) {
                const data = await postRes.json();
                throw new Error(data.error || 'Failed to create post');
            }

            const post = await postRes.json();

            // Then bookmark the post
            const bookmarkRes = await fetch(`/api/bookmarks/${post.data._id}`, {
                method: 'POST',
                credentials: 'include',
            });

            if (!bookmarkRes.ok) {
                const data = await bookmarkRes.json();
                throw new Error(data.message || 'Failed to bookmark');
            }

            return bookmarkRes.json();
        },
        onSuccess: (data, article) => {
            setBookmarkedArticles(prev => {
                const newSet = new Set(prev);
                if (newSet.has(article._id)) {
                    newSet.delete(article._id);
                } else {
                    newSet.add(article._id);
                }
                return newSet;
            });
            toast.success(data.message || 'Bookmark updated');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to update bookmark');
        }
    });

    // Add function to handle bookmark toggle
    const handleBookmarkToggle = (article, e) => {
        e.preventDefault();
        e.stopPropagation();
        bookmarkMutation.mutate(article);
    };

    // Modify the article card rendering to include better error handling
    const renderArticleCard = (article) => {
        const isYouTube = isYouTubeUrl(article.url);
        const thumbnailUrl = isYouTube ? getYouTubeThumbnail(article.url) : article.imageUrl;
        const hasFailedThumbnail = failedThumbnails.has(article._id);
        const isBookmarked = bookmarkedArticles.has(article._id);

        return (
            <div key={article._id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex flex-col h-full">
                    {isYouTube ? (
                        <div className="mb-4 relative" onClick={(e) => e.stopPropagation()}>
                            {hasFailedThumbnail ? (
                                getPlaceholderImage(true)
                            ) : (
                                <>
                                    <img
                                        src={thumbnailUrl}
                                        alt={article.title}
                                        className="w-full h-48 object-cover rounded-lg"
                                        onError={() => handleImageError(article._id, true)}
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity">
                                            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : article.imageUrl && !hasFailedThumbnail ? (
                        <div className="mb-4">
                            <img
                                src={article.imageUrl}
                                alt={article.title}
                                className="w-full h-48 object-cover rounded-lg"
                                onError={() => handleImageError(article._id)}
                                loading="lazy"
                            />
                        </div>
                    ) : (
                        getPlaceholderImage()
                    )}
                    <h3 className="text-lg font-semibold text-white mb-2">
                        {article.title}
                    </h3>
                    <p className="text-gray-300 text-sm mb-4 flex-grow">
                        {article.description}
                    </p>
                    <div className="flex justify-between items-center mt-auto">
                        <div className="text-sm text-gray-400">
                            {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                                                </div>
                        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={(e) => handleBookmarkToggle(article, e)}
                                className={`p-2 rounded-full hover:bg-blue-500/10 transition-colors ${
                                    isBookmarked ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'
                                }`}
                                title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                            >
                                <BookmarkIcon isBookmarked={isBookmarked} />
                            </button>
                            {isYouTube && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const cleanUrl = getCleanYouTubeUrl(article.url);
                                        if (cleanUrl) {
                                            copyToClipboard(cleanUrl);
                                        } else {
                                            toast.error('Invalid YouTube URL');
                                        }
                                    }}
                                    className="p-2 text-blue-500 hover:text-blue-400 rounded-full hover:bg-blue-500/10"
                                    title="Copy Video Link"
                                >
                                    <ShareIcon />
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleViewDetails(article);
                                }}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                                View
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Post button clicked for article:', article);
                                    handlePostToFeed(article, e);
                                }}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            >
                                Post
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Add handleClearFeed function
    const handleClearFeed = async () => {
        if (window.confirm("Are you sure you want to clear the entire feed? This action cannot be undone.")) {
            clearFeedMutation.mutate();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="w-full">
            {isLoading ? (
                <div className="flex justify-center items-center h-32">
                    <LoadingSpinner size="lg" />
                </div>
            ) : error ? (
                <div className="text-center text-red-500 p-4">
                    Error loading articles: {error.message}
                </div>
            ) : !data?.articles || data.articles.length === 0 ? (
                <div className="text-center text-gray-400 p-4">
                    No articles found
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <div className="text-gray-400">
                                Showing {data.articles.length} of {Math.min(data.totalArticles || 0, MAX_ARTICLES)} articles
                            </div>
                            {hasNewArticles && (
                                <div className="flex items-center gap-1 text-blue-500">
                                    <NotificationIcon hasNew={true} />
                                    <span className="text-sm">New articles available</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleClearFeed}
                                disabled={clearFeedMutation.isLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {clearFeedMutation.isLoading ? (
                                    <>
                                        <LoadingSpinner size="sm" />
                                        Clearing...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                        </svg>
                                        Clear Feed
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isRefreshing ? (
                                    <>
                                        <LoadingSpinner size="sm" />
                                        Refreshing...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                        </svg>
                                        Refresh Feed
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.articles.map(article => renderArticleCard(article))}
                    </div>

                    {data.totalPages > 1 && (
                        <div className="flex justify-center space-x-2 mt-4">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="px-4 py-2 text-white">
                                Page {currentPage} of {data.totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(data.totalPages, p + 1))}
                                disabled={currentPage === data.totalPages}
                                className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Post Popup */}
            {showPostPopup && selectedArticle && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]" 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleClosePostPopup(e);
                    }}
                >
                    <div 
                        className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl" 
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-white">Create Post</h3>
                            <button
                                onClick={handleClosePostPopup}
                                className="text-gray-400 hover:text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="mb-4">
                            {selectedArticle.imageUrl || getYouTubeThumbnail(selectedArticle.url) ? (
                                <img
                                    src={selectedArticle.imageUrl || getYouTubeThumbnail(selectedArticle.url)}
                                    alt={selectedArticle.title}
                                    className="w-full h-48 object-cover rounded-lg mb-4"
                                    onError={(e) => {
                                        console.log('Image load error, using placeholder');
                                        e.target.src = getPlaceholderImage(isYouTubeUrl(selectedArticle.url));
                                    }}
                                />
                            ) : null}
                        </div>
                        <textarea
                            value={postContent}
                            onChange={(e) => setPostContent(e.target.value)}
                            className="w-full h-32 p-3 bg-gray-700 text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Write your post..."
                        />
                        <div className="flex justify-end gap-4 mt-4">
                            <button
                                onClick={handleClosePostPopup}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePostSubmit}
                                disabled={postToFeedMutation.isLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {postToFeedMutation.isLoading ? 'Posting...' : 'Post'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
                <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 p-4 rounded-lg text-white text-sm z-[9999]">
                    <div>Popup visible: {showPostPopup ? 'Yes' : 'No'}</div>
                    <div>Has selected article: {selectedArticle ? 'Yes' : 'No'}</div>
                    <div>Has content: {postContent ? 'Yes' : 'No'}</div>
                </div>
            )}

            {/* Article Details Modal */}
            {selectedArticle && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-white">{selectedArticle.title}</h3>
                            <button
                                onClick={handleCloseDetails}
                                className="text-gray-400 hover:text-white"
                            >
                                Close
                            </button>
                        </div>

                        {isYouTubeUrl(selectedArticle.url) ? (
                            embedError ? (
                                <div className="mb-4 aspect-video bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center">
                                    <div className="text-center p-4">
                                        <svg className="w-16 h-16 text-white mx-auto mb-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                                        </svg>
                                        <p className="text-white text-lg mb-2">Unable to play video</p>
                                        <p className="text-white/80 text-sm mb-4">This video cannot be played in the embed player.</p>
                                        <a
                                            href={selectedArticle.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-block px-4 py-2 bg-white text-red-600 rounded hover:bg-gray-100 transition-colors"
                                        >
                                            Watch on YouTube
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-4 aspect-video">
                                    <iframe
                                        src={getYouTubeEmbedUrl(selectedArticle.url)}
                                        title={selectedArticle.title}
                                        className="w-full h-full rounded-lg"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        onError={handleEmbedError}
                                        loading="lazy"
                                        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
                                        referrerPolicy="strict-origin"
                                    />
                                </div>
                            )
                        ) : selectedArticle.imageUrl && !failedThumbnails.has(selectedArticle._id) ? (
                            <div className="mb-4">
                                <img
                                    src={selectedArticle.imageUrl}
                                    alt={selectedArticle.title}
                                    className="w-full h-64 object-cover rounded-lg"
                                    onError={() => handleImageError(selectedArticle._id)}
                                />
                            </div>
                        ) : (
                            getPlaceholderImage(isYouTubeUrl(selectedArticle.url))
                        )}

                        <div className="text-gray-300 mb-4">
                            {selectedArticle.description}
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-400">
                                Published: {formatDistanceToNow(new Date(selectedArticle.publishedAt), { addSuffix: true })}
                            </div>
                            <div className="flex space-x-2">
                                <a
                                    href={selectedArticle.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                    Open Original
                                </a>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePostToFeed(selectedArticle);
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                >
                                    Post to Feed
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BotArticles;