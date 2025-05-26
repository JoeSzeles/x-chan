import React, { useState, useEffect } from 'react';
import { BiRepost } from 'react-icons/bi';
import { toast } from 'react-hot-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import LoadingSpinner from './LoadingSpinner';
import axios from 'axios';

const RepostButton = ({ 
    itemId, 
    type = 'post', // 'post' or 'comment'
    repostCount = 0,
    isReposted = false,
    onRepost,
    className = '',
    userData // Add userData as a prop
}) => {
    const [showRepostOptions, setShowRepostOptions] = useState(false);
    const [selectedBoard, setSelectedBoard] = useState('');
    const [isHovered, setIsHovered] = useState(false);
    const queryClient = useQueryClient();

    // Fetch user boards
    const { data: userBoards, isLoading: isLoadingBoards } = useQuery({
        queryKey: ['userBoards', userData?._id],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            if (!token || !userData?._id) {
                console.log('[RepostButton] No token or user ID found:', { 
                    hasToken: !!token, 
                    userId: userData?._id 
                });
                return [];
            }

            try {
                console.log('[RepostButton] Fetching boards for user:', userData._id);
                const response = await axios.get(`/api/boards/user/${userData._id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                console.log('[RepostButton] Boards fetched:', response.data);
                return response.data;
            } catch (error) {
                console.error('[RepostButton] Error fetching boards:', error);
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('userData');
                }
                return [];
            }
        },
        enabled: !!userData?._id,
        retry: false
    });

    // Add debug logging for userBoards
    useEffect(() => {
        console.log('Current userBoards state:', userBoards);
    }, [userBoards]);

    // Add debug logging for userData
    useEffect(() => {
        console.log('Current userData in RepostButton:', userData);
    }, [userData]);

    const { mutate: repostItem, isPending: isReposting } = useMutation({
        mutationFn: async (repostType) => {
            if (!userData?._id) {
                throw new Error('User must be logged in to repost');
            }

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token is required');
            }

            const endpoint = type === 'post' 
                ? `/api/posts/repost/${itemId}`
                : `/api/comments/repost/${itemId}`;

            const res = await fetch(endpoint, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    repostType,
                    targetBoard: repostType === 'board' ? selectedBoard : undefined
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },
        onSuccess: (data) => {
            // Update the current item's reposts
            if (type === 'post') {
                queryClient.setQueryData(["post", itemId], (oldData) => {
                    if (!oldData) return null;
                    return {
                        ...oldData,
                        reposts: data.reposts || [],
                    };
                });
            } else {
                queryClient.setQueryData(["comment", itemId], (oldData) => {
                    if (!oldData) return null;
                    return {
                        ...oldData,
                        reposts: data.reposts || [],
                    };
                });
            }

            // Update profile posts if we're on a profile page
            const currentPath = window.location.pathname;
            if (currentPath.startsWith('/profile/')) {
                const username = currentPath.split('/profile/')[1];
                queryClient.setQueryData(["userPosts", username], (oldData) => {
                    if (!oldData) return null;
                    return oldData.map(p => 
                        p._id === itemId 
                            ? { ...p, reposts: data.reposts || [] }
                            : p
                    );
                });
            }

            // Update feed if it exists
            queryClient.setQueryData(["feed"], (oldData) => {
                if (!oldData) return null;
                return oldData.map(p => 
                    p._id === itemId 
                        ? { ...p, reposts: data.reposts || [] }
                        : p
                );
            });

            // Update posts list if it exists
            queryClient.setQueryData(["posts"], (oldData) => {
                if (!oldData) return null;
                return oldData.map(p => 
                    p._id === itemId 
                        ? { ...p, reposts: data.reposts || [] }
                        : p
                );
            });

            toast.success(data.message || `${type === 'post' ? 'Post' : 'Comment'} reposted successfully`);
            setShowRepostOptions(false);
            if (onRepost) onRepost(data);
        },
        onError: (error) => {
            console.error('Repost error:', error);
            toast.error(error.response?.data?.error || error.message || `Failed to repost ${type}`);
            setShowRepostOptions(false);
        }
    });

    const handleRepost = (repostType) => {
        if (!userData?._id) {
            toast.error('Please log in to repost');
            return;
        }

        if (repostType === 'board' && !selectedBoard) {
            toast.error('Please select a board');
            return;
        }
        repostItem(repostType);
    };

    const handleRepostClick = (e) => {
        e.preventDefault(); // Prevent any default behavior
        e.stopPropagation(); // Stop event propagation
        if (!userData || !userData._id) {
            toast.error('Please log in to repost');
            return;
        }
        setShowRepostOptions(true);
    };

    return (
        <div className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
            <button
                onClick={handleRepostClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`flex items-center gap-1 group ${isReposted ? 'text-green-500' : 'text-slate-500 group-hover:text-green-500'}`}
                disabled={isReposting}
            >
                {isReposting && <LoadingSpinner size='sm' />}
                {!isReposting && (
                    <>
                        <BiRepost className='w-4 h-4' />
                        <span className='text-sm'>{repostCount}</span>
                    </>
                )}
            </button>

            {showRepostOptions && userData?._id && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowRepostOptions(false);
                    }}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Repost Options</h3>
                        
                        <div className="space-y-4">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleRepost('personal');
                                }}
                                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
                                disabled={isReposting}
                            >
                                Repost to My Profile
                            </button>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Repost to Board
                                </label>
                                {isLoadingBoards ? (
                                    <div className="flex justify-center p-4">
                                        <LoadingSpinner />
                                    </div>
                                ) : userBoards?.length > 0 ? (
                                    <>
                                        <select
                                            value={selectedBoard}
                                            onChange={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSelectedBoard(e.target.value);
                                            }}
                                            className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            disabled={isReposting}
                                        >
                                            <option value="">Select a board</option>
                                            {userBoards.map((board) => (
                                                <option key={board._id} value={board.name}>
                                                    {board.name}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleRepost('board');
                                            }}
                                            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors"
                                            disabled={isReposting || !selectedBoard}
                                        >
                                            Repost to Selected Board
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded">
                                        <p className="text-gray-600 dark:text-gray-300 mb-2">You don't have any boards yet</p>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                window.location.href = '/boards/create';
                                            }}
                                            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                            Create a Board
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowRepostOptions(false);
                            }}
                            className="mt-4 w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white py-2 px-4 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            disabled={isReposting}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RepostButton; 