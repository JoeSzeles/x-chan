import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { toast } from "react-hot-toast";
import BotArticles from "../../components/news/BotArticles";
import debounce from "lodash/debounce";
import { io } from "socket.io-client";

// Add icon components
const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
);

const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
    </svg>
);

const UpdateIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
);

const ViewIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
);

const NewsPage = () => {
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [showCreateBot, setShowCreateBot] = useState(false);
    const [selectedBot, setSelectedBot] = useState(null);
    const [newBot, setNewBot] = useState({
        name: "",
        websites: [{ url: "", selector: "", type: "news" }],
        updateInterval: 5
    });
    const [editingBot, setEditingBot] = useState(null);
    const queryClient = useQueryClient();

    // Toggle bot status mutation
    const { mutate: toggleBotStatus } = useMutation({
        mutationFn: async (botId) => {
            try {
                const res = await fetch(`/api/newsbot/${botId}/toggle`, {
                    method: "POST",
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                const text = await res.text();
                console.log('Toggle response:', text);

                if (!text) {
                    throw new Error('Empty response from server');
                }

                let data;
                try {
                    data = JSON.parse(text);
                } catch (parseError) {
                    console.error('Failed to parse toggle response:', parseError);
                    throw new Error('Invalid response from server');
                }

                if (!res.ok) {
                    throw new Error(data.error || `Server error: ${res.status}`);
                }

                if (!data.success) {
                    throw new Error(data.error || "Failed to toggle bot status");
                }

                return data.data;
            } catch (error) {
                console.error('Error in toggleBotStatus:', error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["newsBots"]);
            toast.success("Bot status updated successfully!");
        },
        onError: (error) => {
            console.error('Toggle bot status error:', error);
            toast.error(error.message || "Failed to toggle bot status");
        }
    });

    // Initialize Socket.IO client inside useEffect
    useEffect(() => {
        const socket = io('/api', {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            autoConnect: true,
            withCredentials: true
        });

        socket.on('connect', () => {
            console.log('Connected to Socket.IO server');
        });

        socket.on('connect_error', (error) => {
            console.error('Socket.IO connection error:', error);
            toast.error('Failed to connect to real-time updates. Please refresh the page.');
        });

        socket.on('disconnect', (reason) => {
            console.log('Disconnected from Socket.IO server:', reason);
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, try to reconnect
                socket.connect();
            }
        });

        // Listen for bot updates
        socket.on('botUpdate', (data) => {
            console.log('Received bot update:', data);
            queryClient.invalidateQueries(["newsBots"]);
        });

        // Cleanup function
        return () => {
            socket.off('connect');
            socket.off('connect_error');
            socket.off('disconnect');
            socket.off('botUpdate');
            socket.disconnect();
        };
    }, [queryClient]);

    // Debounced search handler
    const debouncedSearch = useCallback(
        debounce((query) => {
            setSearchQuery(query);
        }, 300),
        []
    );

    // Handle search input change
    const handleSearchChange = (e) => {
        e.preventDefault();
        debouncedSearch(e.target.value);
    };

    // Fetch user's bots with search and category filters
    const { data: botsData, isLoading: isLoadingBots } = useQuery({
        queryKey: ["newsBots", searchQuery, selectedCategory],
        queryFn: async () => {
            try {
                // Use relative URL to avoid CORS issues
                const url = `/api/newsbot/user?search=${encodeURIComponent(searchQuery)}&category=${selectedCategory}`;
                console.log('Attempting to fetch bots from URL:', url);

                const res = await fetch(url, {
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                console.log('Response status:', res.status);

                // Check if the response is empty
                const text = await res.text();
                console.log('Raw response text:', text);

                if (!text) {
                    console.error('Empty response received from server');
                    throw new Error('Empty response from server');
                }

                // Try to parse the response as JSON
                let data;
                try {
                    data = JSON.parse(text);
                    console.log('Parsed JSON data:', data);
                } catch (parseError) {
                    console.error('JSON parse error details:', {
                        error: parseError,
                        message: parseError.message,
                        stack: parseError.stack,
                        responseText: text
                    });
                    throw new Error(`Invalid JSON response: ${parseError.message}`);
                }

                if (!res.ok) {
                    console.error('Response not OK:', {
                        status: res.status,
                        statusText: res.statusText,
                        data: data
                    });
                    throw new Error(data.error || `Server error: ${res.status} ${res.statusText}`);
                }

                if (!data.success) {
                    console.error('API returned success: false:', data);
                    throw new Error(data.error || "API request failed");
                }

                console.log('Successfully fetched bots data:', data.data);
                return data.data;
            } catch (error) {
                console.error('Error in fetchBots:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    type: error.constructor.name
                });

                // Check if it's a connection error
                if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    console.error('Network connection error detected');
                    throw new Error('Unable to connect to server. Please check your internet connection and try again.');
                }

                throw error;
            }
        },
        retry: 3,
        retryDelay: (attemptIndex) => {
            const delay = Math.min(1000 * 2 ** attemptIndex, 30000);
            console.log(`Retrying request in ${delay}ms (attempt ${attemptIndex + 1}/3)`);
            return delay;
        },
        refetchOnWindowFocus: false,
        staleTime: 30000,
        onError: (error) => {
            console.error('Query error handler:', {
                error: error,
                message: error.message,
                stack: error.stack
            });
        }
    });

    // Update bot articles mutation
    const { mutate: updateArticles } = useMutation({
        mutationFn: async (botId) => {
            try {
                const res = await fetch(`/api/newsbot/${botId}/update`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Failed to update articles');
                }

                return {
                    success: true,
                    data: {
                        newArticles: data.data?.newArticles || [],
                        errors: data.data?.errors || [],
                        totalArticles: data.data?.totalArticles || 0
                    }
                };
            } catch (error) {
                console.error('Error updating articles:', error);
                throw error;
            }
        },
        onSuccess: (data) => {
            // Ensure we have valid data before accessing properties
            const newArticlesCount = data?.newArticles?.length || 0;
            const totalArticles = data?.articles?.length || 0;

            console.log('Update mutation success:', {
                newArticlesCount,
                totalArticles,
                data
            });

            if (newArticlesCount > 0) {
                toast.success(`Found ${newArticlesCount} new articles!`, {
                    duration: 3000,
                    position: "bottom-right",
                    style: {
                        background: '#1a1a1a',
                        color: '#fff',
                        border: '1px solid #333'
                    }
                });
            } else {
                toast.success(`No new articles found. Total articles: ${totalArticles}`, {
                    duration: 3000,
                    position: "bottom-right",
                    style: {
                        background: '#1a1a1a',
                        color: '#fff',
                        border: '1px solid #333'
                    }
                });
            }

            // Invalidate queries to refresh the data
            queryClient.invalidateQueries(["newsBots"]);
        },
        onError: (error) => {
            console.error('Update mutation error:', {
                error: error,
                message: error.message,
                stack: error.stack
            });

            toast.error(error.message || "Failed to update articles", {
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

    // Delete bot mutation
    const { mutate: deleteBot } = useMutation({
        mutationFn: async (botId) => {
            const res = await fetch(`/api/newsbot/${botId}`, {
                method: "DELETE",
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete bot");
            if (!data.success) throw new Error(data.error || "Failed to delete bot");
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["newsBots"]);
            toast.success("Bot deleted successfully!");
        },
        onError: (error) => {
            console.error('Delete bot error:', error);
            toast.error(error.message || "Failed to delete bot");
        }
    });

    // Create bot mutation
    const { mutate: createBot, isLoading: isCreatingBot } = useMutation({
        mutationFn: async (botData) => {
            try {
                console.log('Sending bot data:', botData);
                const res = await fetch("/api/newsbot", {
                    method: "POST",
                    credentials: 'include',
                    headers: {
                        "Content-Type": "application/json",
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(botData)
                });

                const text = await res.text();
                console.log('Raw response:', text);

                let data;
                try {
                    data = JSON.parse(text);
                } catch (parseError) {
                    console.error('JSON parse error:', parseError);
                    throw new Error('Invalid response from server');
                }

                if (!res.ok) {
                    throw new Error(data.error || "Failed to create bot");
                }

                if (!data.success) {
                    throw new Error(data.error || "Failed to create bot");
                }

                return data.data;
            } catch (error) {
                console.error('Error creating bot:', error);
                throw error;
            }
        },
        onSuccess: () => {
            toast.success("Bot created successfully!");
            setShowCreateBot(false);
            queryClient.invalidateQueries(["newsBots"]);
        },
        onError: (error) => {
            console.error('Create bot error:', error);
            toast.error(error.message || "Failed to create bot");
        }
    });

    // Update bot mutation
    const { mutate: updateBot } = useMutation({
        mutationFn: async (botData) => {
            console.log('Updating bot with data:', botData);

            // For YouTube bots, construct the search URL
            if (botData.websites.some(w => w.type === 'video')) {
                botData.websites = botData.websites.map(website => {
                    if (website.type === 'video') {
                        const searchTerms = website.searchTerms.split(',').map(term => term.trim()).join('+');
                        return {
                            ...website,
                            url: `https://www.youtube.com/results?search_query=${searchTerms}`,
                            selector: "ytd-video-renderer"
                        };
                    }
                    return website;
                });
            }

            const res = await fetch(`/api/newsbot/${botData._id}`, {
                method: "PUT",
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(botData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update bot");
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["newsBots"]);
            setEditingBot(null);
            toast.success("Bot updated successfully!");
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Post article mutation
    const { mutate: postArticle } = useMutation({
        mutationFn: async ({ botId, articleId }) => {
            try {
                console.log('Starting postArticle mutation:', { botId, articleId });

                const url = `/api/newsbot/${botId}/post-article`;
                console.log('Making request to:', url);

                const requestBody = JSON.stringify({ articleId });
                console.log('Request body:', requestBody);

                const res = await fetch(url, {
                    method: "POST",
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: requestBody
                });

                console.log('Response status:', res.status);
                console.log('Response headers:', Object.fromEntries(res.headers.entries()));

                // Get the raw text first
                const text = await res.text();
                console.log('Raw response text:', text);

                // Check if the response is empty
                if (!text || text.trim() === '') {
                    console.error('Empty response received');
                    throw new Error('Empty response from server');
                }

                // Try to parse the response as JSON
                let data;
                try {
                    // Remove any BOM or whitespace
                    const cleanText = text.trim().replace(/^\uFEFF/, '');
                    console.log('Cleaned response text:', cleanText);

                    data = JSON.parse(cleanText);
                    console.log('Parsed JSON data:', data);
                } catch (parseError) {
                    console.error('JSON parse error:', {
                        error: parseError,
                        message: parseError.message,
                        stack: parseError.stack,
                        responseText: text,
                        responseLength: text.length,
                        firstChars: text.substring(0, 50)
                    });
                    throw new Error(`Invalid JSON response: ${parseError.message}`);
                }

                if (!res.ok) {
                    console.error('Response not OK:', {
                        status: res.status,
                        statusText: res.statusText,
                        data: data
                    });
                    throw new Error(data?.error || `Server error: ${res.status} ${res.statusText}`);
                }

                if (!data?.success) {
                    console.error('API returned success: false:', data);
                    throw new Error(data?.error || "API request failed");
                }

                return data.data;
            } catch (error) {
                console.error('Error in postArticle:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
                throw error;
            }
        },
        onSuccess: (data) => {
            console.log('Article posted successfully:', data);
            queryClient.invalidateQueries(["newsBots"]);
            toast.success("Article posted successfully!");
        },
        onError: (error) => {
            console.error('Post article error:', error);
            toast.error(error.message || "Failed to post article");
        }
    });

    // Add preset selection handler
    const handlePresetSelect = (presetKey) => {
        console.log('Selected preset:', presetKey);

        if (presetKey === "custom") {
            setNewBot({
                name: "",
                websites: [{ url: "", selector: "", type: "news" }],
                updateInterval: 5
            });
            return;
        }

        const preset = websitePresets[presetKey];
        console.log('Preset data:', preset);

        // Create a new bot configuration with the preset data
        const newBotConfig = {
            name: preset.name,
            websites: preset.websites.map(website => ({
                url: website.url,
                selector: website.selector,
                type: website.type,
                searchTerms: website.searchTerms || ''
            })),
            updateInterval: 5
        };

        console.log('Setting new bot config:', newBotConfig);
        setNewBot(newBotConfig);
    };

    const handleCreateBot = (e) => {
        e.preventDefault();
        createBot(newBot);
    };

    const addWebsite = () => {
        setNewBot(prev => ({
            ...prev,
            websites: [...prev.websites, { url: "", selector: "", type: "news" }]
        }));
    };

    const removeWebsite = (index) => {
        setNewBot(prev => ({
            ...prev,
            websites: prev.websites.filter((_, i) => i !== index)
        }));
    };

    const updateWebsite = (index, field, value) => {
        setNewBot(prev => ({
            ...prev,
            websites: prev.websites.map((website, i) => 
                i === index ? { ...website, [field]: value } : website
            )
        }));
    };

    // Add website presets
    const websitePresets = {
        youtube: {
            name: "YouTube Feed",
            websites: [{
                url: "https://www.youtube.com/results?search_query=",
                selector: "ytd-video-renderer",
                type: "video",
                searchTerms: "tech news, gaming, tutorials"
            }]
        },
        twitter: {
            name: "Twitter Feed",
            websites: [
                {
                    url: "https://twitter.com/home",
                    selector: "article[data-testid='tweet']",
                    type: "social"
                }
            ]
        },
        test: {
            name: "Test Bot",
            websites: [{
                url: "https://news.ycombinator.com",
                selector: ".athing",
                type: "news"
            }]
        }
    };

    // Add this function inside the NewsPage component
    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Link copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            toast.error('Failed to copy link');
        }
    };

    if (isLoadingBots) {
        return (
            <div className="flex-[4_4_0] mr-auto border-r border-gray-700 min-h-screen flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-4">News Bots</h1>
                <button
                    onClick={() => setShowCreateBot(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                    Create New Bot
                </button>
            </div>

            <div className="grid grid-cols-1 gap-8 mb-8">
                {botsData?.map((bot) => (
                    <div key={bot._id} className="bg-gray-800 rounded-lg p-4 hover:shadow-lg transition-shadow duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold">{bot.name}</h2>
                                <p className="text-gray-400 text-sm">
                                    Update every {bot.updateInterval} minutes
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {bot.websites.some(website => website.type === 'video') && (
                                    <button
                                        onClick={() => {
                                            const videoUrl = bot.websites.find(w => w.type === 'video')?.url;
                                            if (videoUrl) {
                                                copyToClipboard(videoUrl);
                                            }
                                        }}
                                        className="p-2 text-blue-500 hover:text-blue-400 rounded-full hover:bg-blue-500/10"
                                        title="Copy Video Link"
                                    >
                                        <ShareIcon />
                                    </button>
                                )}
                                <button
                                    onClick={() => toggleBotStatus(bot._id)}
                                    className={`p-2 rounded-full ${
                                        bot.status === 'active' ? 'bg-green-500 hover:bg-green-600' :
                                        bot.status === 'paused' ? 'bg-yellow-500 hover:bg-yellow-600' :
                                        'bg-red-500 hover:bg-red-600'
                                    }`}
                                    title={bot.status === 'active' ? 'Pause Bot' : 'Activate Bot'}
                                >
                                    {bot.status === 'active' ? <PauseIcon /> : <PlayIcon />}
                                </button>
                            </div>
                        </div>

                        <div className="mb-4">
                            <h3 className="font-medium mb-2">Websites</h3>
                            <ul className="space-y-2">
                                {bot.websites.map((website, index) => (
                                    <li key={index} className="text-sm text-gray-400">
                                        {website.url}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex justify-between items-center mb-4">
                            <div className="text-sm text-gray-400">
                                {bot.stats?.totalArticles > 0 ? (
                                    <div>
                                        <div>{bot.stats.totalArticles} total articles</div>
                                        <div className="text-xs text-gray-500">
                                            Last updated: {new Date(bot.lastUpdate).toLocaleString()}
                                        </div>
                                    </div>
                                ) : (
                                    <div>No articles found</div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setSelectedBot(bot);
                                        updateArticles(bot._id);
                                    }}
                                    className="p-2 text-blue-500 hover:text-blue-400 rounded-full hover:bg-blue-500/10"
                                    title="Update Now"
                                >
                                    <UpdateIcon />
                                </button>
                                <button
                                    onClick={() => setEditingBot(bot)}
                                    className="p-2 text-yellow-500 hover:text-yellow-400 rounded-full hover:bg-yellow-500/10"
                                    title="Edit Bot"
                                >
                                    <EditIcon />
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm('Are you sure you want to delete this bot?')) {
                                            deleteBot(bot._id);
                                        }
                                    }}
                                    className="p-2 text-red-500 hover:text-red-400 rounded-full hover:bg-red-500/10"
                                    title="Delete Bot"
                                >
                                    <DeleteIcon />
                                </button>
                            </div>
                        </div>

                        {/* Articles Section */}
                        <div className="mt-6 border-t border-gray-700 pt-4">
                            <BotArticles botId={bot._id} isOpen={true} onClose={() => {}} />
                        </div>
                    </div>
                ))}
            </div>

            {showCreateBot && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-lg w-full max-w-2xl">
                        <h2 className="text-xl font-bold mb-4">Create News Bot</h2>
                        <form onSubmit={handleCreateBot}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Choose a Preset</label>
                                <select
                                    onChange={(e) => handlePresetSelect(e.target.value)}
                                    className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 mb-2"
                                    value="custom"
                                >
                                    <option value="custom">Custom Configuration</option>
                                    <option value="twitter">Twitter/X Posts</option>
                                    <option value="youtube">YouTube Videos</option>
                                    <option value="test">Test Bot</option>
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Bot Name</label>
                                <input
                                    type="text"
                                    value={newBot.name}
                                    onChange={(e) => setNewBot(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600"
                                    required
                                    placeholder="Enter a name for your bot"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Update Interval (minutes)</label>
                                <input
                                    type="number"
                                    value={newBot.updateInterval}
                                    onChange={(e) => setNewBot(prev => ({ ...prev, updateInterval: parseInt(e.target.value) }))}
                                    className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600"
                                    min="1"
                                    max="60"
                                    required
                                />
                                <p className="text-sm text-gray-400 mt-1">How often should the bot check for new articles?</p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Websites to Monitor</label>
                                {newBot.websites.map((website, index) => (
                                    <div key={index} className="mb-4 p-4 bg-gray-700 rounded-lg">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-medium">Website {index + 1}</h3>
                                            <button
                                                type="button"
                                                onClick={() => removeWebsite(index)}
                                                className="text-red-500 hover:text-red-400"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm mb-1">Website URL</label>
                                                <input
                                                    type="url"
                                                    value={website.url}
                                                    onChange={(e) => updateWebsite(index, 'url', e.target.value)}
                                                    className="w-full p-2 rounded-lg bg-gray-600 border border-gray-500"
                                                    placeholder="https://example.com"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm mb-1">Content Selector</label>
                                                <input
                                                    type="text"
                                                    value={website.selector}
                                                    onChange={(e) => updateWebsite(index, 'selector', e.target.value)}
                                                    className="w-full p-2 rounded-lg bg-gray-600 border border-gray-500"
                                                    placeholder="article, .post, #content"
                                                    required
                                                />
                                                <p className="text-sm text-gray-400 mt-1">
                                                    CSS selector for the main content container (e.g., article, .post, #content)
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm mb-1">Website Type</label>
                                                <select
                                                    value={website.type}
                                                    onChange={(e) => updateWebsite(index, 'type', e.target.value)}
                                                    className="w-full p-2 rounded-lg bg-gray-600 border border-gray-500"
                                                >
                                                    <option value="news">News</option>
                                                    <option value="blog">Blog</option>
                                                    <option value="social">Social Media</option>
                                                    <option value="video">Video</option>
                                                </select>
                                            </div>
                                            {website.type === 'video' && (
                                                <div className="mt-3">
                                                    <label className="block text-sm mb-1">Search Terms (comma-separated)</label>
                                                    <input
                                                        type="text"
                                                        value={website.searchTerms || ''}
                                                        onChange={(e) => updateWebsite(index, 'searchTerms', e.target.value)}
                                                        className="w-full p-2 rounded-lg bg-gray-600 border border-gray-500"
                                                        placeholder="Enter search terms separated by commas"
                                                    />
                                                    <p className="text-sm text-gray-400 mt-1">
                                                        Enter search terms to find videos (e.g., "tech news, gaming, tutorials")
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addWebsite}
                                    className="w-full p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Add Another Website
                                </button>
                            </div>

                            <div className="flex justify-end gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateBot(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingBot}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                                >
                                    {isCreatingBot ? "Creating..." : "Create Bot"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editingBot && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-lg w-full max-w-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Edit Bot</h2>
                            <button
                                onClick={() => setEditingBot(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                <CloseIcon />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            console.log('Submitting bot update:', editingBot);
                            updateBot(editingBot);
                        }}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Bot Name</label>
                                <input
                                    type="text"
                                    value={editingBot.name}
                                    onChange={(e) => setEditingBot(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Update Interval (minutes)</label>
                                <input
                                    type="number"
                                    value={editingBot.updateInterval}
                                    onChange={(e) => setEditingBot(prev => ({ ...prev, updateInterval: parseInt(e.target.value) }))}
                                    className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600"
                                    min="1"
                                    max="60"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Websites</label>
                                {editingBot.websites.map((website, index) => (
                                    <div key={index} className="mb-4 p-4 bg-gray-700 rounded-lg">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-medium">Website {index + 1}</h3>
                                            {index > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingBot(prev => ({
                                                        ...prev,
                                                        websites: prev.websites.filter((_, i) => i !== index)
                                                    }))}
                                                    className="text-red-500 hover:text-red-400"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm mb-1">Website URL</label>
                                                <input
                                                    type="url"
                                                    value={website.url}
                                                    onChange={(e) => setEditingBot(prev => ({
                                                        ...prev,
                                                        websites: prev.websites.map((w, i) => 
                                                            i === index ? { ...w, url: e.target.value } : w
                                                        )
                                                    }))}
                                                    className="w-full p-2 rounded-lg bg-gray-600 border border-gray-500"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm mb-1">Content Selector</label>
                                                <input
                                                    type="text"
                                                    value={website.selector}
                                                    onChange={(e) => setEditingBot(prev => ({
                                                        ...prev,
                                                        websites: prev.websites.map((w, i) => 
                                                            i === index ? { ...w, selector: e.target.value } : w
                                                        )
                                                    }))}
                                                    className="w-full p-2 rounded-lg bg-gray-600 border border-gray-500"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm mb-1">Website Type</label>
                                                <select
                                                    value={website.type}
                                                    onChange={(e) => setEditingBot(prev => ({
                                                        ...prev,
                                                        websites: prev.websites.map((w, i) => 
                                                            i === index ? { ...w, type: e.target.value } : w
                                                        )
                                                    }))}
                                                    className="w-full p-2 rounded-lg bg-gray-600 border border-gray-500"
                                                >
                                                    <option value="news">News</option>
                                                    <option value="blog">Blog</option>
                                                    <option value="social">Social Media</option>
                                                    <option value="video">Video</option>
                                                </select>
                                            </div>
                                            {website.type === 'video' && (
                                                <div className="mt-3">
                                                    <label className="block text-sm mb-1">Search Terms (comma-separated)</label>
                                                    <input
                                                        type="text"
                                                        value={website.searchTerms || ''}
                                                        onChange={(e) => {
                                                            console.log('Updating search terms:', e.target.value);
                                                            setEditingBot(prev => ({
                                                                ...prev,
                                                                websites: prev.websites.map((w, i) => 
                                                                    i === index ? { ...w, searchTerms: e.target.value } : w
                                                                )
                                                            }));
                                                        }}
                                                        className="w-full p-2 rounded-lg bg-gray-600 border border-gray-500"
                                                        placeholder="Enter search terms separated by commas"
                                                    />
                                                    <p className="text-sm text-gray-400 mt-1">
                                                        Enter search terms to find videos (e.g., "tech news, gaming, tutorials")
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setEditingBot(prev => ({
                                        ...prev,
                                        websites: [...prev.websites, { url: "", selector: "", type: "news" }]
                                    }))}
                                    className="w-full p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Add Another Website
                                </button>
                            </div>

                            <div className="flex justify-end gap-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingBot(null)}
                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewsPage;