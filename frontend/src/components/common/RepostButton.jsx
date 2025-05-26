import React, { useState } from 'react';
import { BiRepost } from 'react-icons/bi';
import { toast } from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import LoadingSpinner from './LoadingSpinner';

const RepostButton = ({ 
    itemId, 
    type = 'post', // 'post' or 'comment'
    repostCount = 0,
    isReposted = false,
    onRepost,
    className = '',
    userData
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const queryClient = useQueryClient();

    const { mutate: repostItem, isPending: isReposting } = useMutation({
        mutationFn: async () => {
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
                    repostType: 'personal'
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
            if (onRepost) onRepost(data);
        },
        onError: (error) => {
            console.error('Repost error:', error);
            toast.error(error.response?.data?.error || error.message || `Failed to repost ${type}`);
        }
    });

    const handleRepost = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!userData || !userData._id) {
            toast.error('Please log in to repost');
            return;
        }

        repostItem();
    };

    return (
        <div className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
            <button
                onClick={handleRepost}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`flex items-center gap-1 group ${isReposted ? 'text-green-500' : 'text-slate-500 group-hover:text-green-500'}`}
                disabled={isReposting}
                title={isReposted ? 'Unrepost' : 'Repost to your profile'}
            >
                {isReposting ? (
                    <LoadingSpinner size='sm' />
                ) : (
                    <>
                        <BiRepost className='w-4 h-4' />
                        <span className='text-sm'>{repostCount}</span>
                    </>
                )}
            </button>
        </div>
    );
};

export default RepostButton;