import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

const NewsBotCard = ({ bot, onEdit, onDelete }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const queryClient = useQueryClient();

    // Ensure bot has required properties
    const safeBot = {
        ...bot,
        websites: bot.websites || [],
        settings: bot.settings || { autoPost: false },
        stats: bot.stats || { totalArticles: 0, newArticles: 0 }
    };

    const updateBotMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/newsbot/${bot._id}/update`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update bot");
            if (!data.success) throw new Error(data.error || "Failed to update bot");
            return data.data;
        },
        onMutate: () => {
            setIsUpdating(true);
        },
        onSuccess: async (data) => {
            queryClient.invalidateQueries(["newsBots"]);
            queryClient.invalidateQueries(["botArticles", bot._id]);

            // If auto-post is enabled, post to feed after update
            if (safeBot.settings.autoPost) {
                try {
                    await postToFeedMutation.mutateAsync();
                } catch (error) {
                    console.error('Auto-post failed:', error);
                }
            }

            if (data.notification) {
                if (data.notification.type === 'success') {
                    toast.success(data.notification.message, {
                        duration: 5000,
                        position: "bottom-right",
                        style: {
                            background: '#1a1a1a',
                            color: '#fff',
                            border: '1px solid #333'
                        }
                    });
                } else {
                    toast(data.notification.message, {
                        duration: 3000,
                        position: "bottom-right",
                        style: {
                            background: '#1a1a1a',
                            color: '#fff',
                            border: '1px solid #333'
                        }
                    });
                }
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update bot", {
                duration: 5000,
                position: "bottom-right",
                style: {
                    background: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid #333'
                }
            });
        },
        onSettled: () => {
            setIsUpdating(false);
        }
    });

    const postToFeedMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/newsbot/${bot._id}/post-to-feed`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to post to feed");
            if (!data.success) throw new Error(data.error || "Failed to post to feed");
            return data.data;
        },
        onMutate: () => {
            setIsPosting(true);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(["posts"]);
            queryClient.invalidateQueries(["newsBots"]);
            toast.success("Posted to feed successfully!", {
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
            toast.error(error.message || "Failed to post to feed", {
                duration: 5000,
                position: "bottom-right",
                style: {
                    background: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid #333'
                }
            });
        },
        onSettled: () => {
            setIsPosting(false);
        }
    });

    const toggleAutoPostMutation = useMutation({
        mutationFn: async (autoPost) => {
            const res = await fetch(`/api/newsbot/${bot._id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    settings: {
                        ...safeBot.settings,
                        autoPost
                    }
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update bot settings");
            if (!data.success) throw new Error(data.error || "Failed to update bot settings");
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["newsBots"]);
            toast.success(
                safeBot.settings.autoPost 
                    ? "Auto-post disabled" 
                    : "Auto-post enabled",
                {
                    duration: 3000,
                    position: "bottom-right",
                    style: {
                        background: '#1a1a1a',
                        color: '#fff',
                        border: '1px solid #333'
                    }
                }
            );
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update auto-post setting", {
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

    const handleUpdate = () => {
        updateBotMutation.mutate();
    };

    const handlePostToFeed = () => {
        postToFeedMutation.mutate();
    };

    const handleToggleAutoPost = () => {
        toggleAutoPostMutation.mutate(!safeBot.settings.autoPost);
    };

    return (
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-white">{safeBot.name}</h3>
                    <p className="text-gray-400 text-sm">
                        {safeBot.websites.length} website{safeBot.websites.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                        <span className="text-sm text-gray-400 mr-2">Auto-post</span>
                        <button
                            onClick={handleToggleAutoPost}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                safeBot.settings.autoPost ? 'bg-green-600' : 'bg-gray-600'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    safeBot.settings.autoPost ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => onEdit(safeBot)}
                            className="text-blue-500 hover:text-blue-400"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => onDelete(safeBot._id)}
                            className="text-red-500 hover:text-red-400"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-2 mb-4">
                {safeBot.websites.map((website, index) => (
                    <div key={index} className="text-sm text-gray-300">
                        <span className="text-gray-400">Website {index + 1}:</span> {website.url}
                        {website.searchTerms && (
                            <div className="text-gray-400 ml-4">
                                Search terms: {website.searchTerms}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                    {safeBot.lastUpdate ? (
                        <>
                            Last updated: {formatDistanceToNow(new Date(safeBot.lastUpdate), { addSuffix: true })}
                            {safeBot.stats.newArticles > 0 && (
                                <span className="ml-2 text-green-500">
                                    ({safeBot.stats.newArticles} new)
                                </span>
                            )}
                        </>
                    ) : (
                        "Never updated"
                    )}
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={handlePostToFeed}
                        disabled={isPosting || safeBot.stats.newArticles === 0}
                        className={`px-4 py-2 rounded-lg ${
                            isPosting || safeBot.stats.newArticles === 0
                                ? "bg-gray-600 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700"
                        } text-white transition-colors`}
                    >
                        {isPosting ? "Posting..." : "Post to Feed"}
                    </button>
                    <button
                        onClick={handleUpdate}
                        disabled={isUpdating}
                        className={`px-4 py-2 rounded-lg ${
                            isUpdating
                                ? "bg-gray-600 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700"
                        } text-white transition-colors`}
                    >
                        {isUpdating ? "Updating..." : "Update Now"}
                    </button>
                </div>
            </div>
        </div>
    );
};

import { useMutation } from 'react-query';
import { useState } from 'react';

const NewsBotCard = (props) => {
    const [debugInfo, setDebugInfo] = useState(null);
    
    // Add a force update mutation
    const forceUpdateMutation = useMutation(
        async () => {
            const response = await fetch(`/api/newsbot/${props.bot._id}/update?force=true`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to force update bot');
            }
            
            const data = await response.json();
            console.log('Force update response:', data);
            setDebugInfo(data);
            return data;
        },
        {
            onSuccess: () => {
                alert('Force update successful! Check console for details.');
                // You might want to refresh the articles here
                if (props.onRefresh) {
                    props.onRefresh();
                }
            },
            onError: (error) => {
                console.error('Force update failed:', error);
                alert(`Force update failed: ${error.message}`);
            }
        }
    );
    
    // Add this to your component's JSX
    const renderForceUpdateButton = () => (
        <button 
            onClick={() => forceUpdateMutation.mutate()}
            className="px-4 py-2 bg-red-500 text-white rounded-md mt-2"
            disabled={forceUpdateMutation.isLoading}
        >
            {forceUpdateMutation.isLoading ? 'Updating...' : 'Force Update (Debug)'}
        </button>
    );
    
    // Add this to display debug info
    const renderDebugInfo = () => {
        if (!debugInfo) return null;
        
        return (
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
                <h4 className="font-bold">Debug Info:</h4>
                <pre className="overflow-auto max-h-40">
                    {JSON.stringify(debugInfo, null, 2)}
                </pre>
            </div>
        );
    };
    
    // Modify your return statement to include these elements
    // This is just a placeholder - add these to your actual component
    return (
        <div>
            {/* Your existing component content */}
            
            {/* Add the force update button */}
            {renderForceUpdateButton()}
            
            {/* Debug info display */}
            {renderDebugInfo()}
        </div>
    );
};

export default NewsBotCard;