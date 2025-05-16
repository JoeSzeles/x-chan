import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FaRetweet, FaExternalLinkAlt, FaLink } from 'react-icons/fa';

const ThreadView = () => {
    const { board, threadId } = useParams();
    const navigate = useNavigate();
    const [isReposting, setIsReposting] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check authentication status on component mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        setIsAuthenticated(!!(token && user));
    }, []);

    // Fetch thread data
    const { data: thread, isLoading, error } = useQuery({
        queryKey: ['thread', board, threadId],
        queryFn: async () => {
            const response = await axios.get(`/api/leech/4chan/${board}/thread/${threadId}`);
            return response.data.data;
        }
    });

    const handleRepostMainThread = async () => {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || 'null');

            if (!token || !user) {
                toast.error('Please log in to repost');
                // Store the current URL to redirect back after login
                localStorage.setItem('redirectAfterLogin', window.location.pathname);
                navigate('/login');
                return;
            }

            setIsReposting(true);
            const response = await axios.post(
                `/api/leech/4chan/${board}/convert/${threadId}`,
                {
                    repostType: 'personal',
                    targetBoard: '',
                    source: {
                        type: '4chan',
                        board: board,
                        threadId: threadId,
                        url: `https://boards.4channel.org/${board}/thread/${threadId}`
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                toast.success('Thread reposted successfully!');
            } else {
                throw new Error(response.data.error || 'Failed to repost thread');
            }
        } catch (error) {
            console.error('[ThreadView] Error reposting thread:', error);
            if (error.response?.status === 401) {
                // Clear invalid token
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setIsAuthenticated(false);
                toast.error('Session expired. Please log in again.');
                navigate('/login');
            } else {
                toast.error(error.response?.data?.error || 'Failed to repost thread');
            }
        } finally {
            setIsReposting(false);
        }
    };

    const handleRepostComment = async (commentId, originalPostId) => {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || 'null');

            if (!token || !user) {
                toast.error('Please log in to repost');
                // Store the current URL to redirect back after login
                localStorage.setItem('redirectAfterLogin', window.location.pathname);
                navigate('/login');
                return;
            }

            const response = await axios.post(
                '/api/posts/repost',
                {
                    type: 'comment',
                    originalPostId: commentId,
                    source: {
                        type: '4chan',
                        board: board,
                        threadId: threadId,
                        postId: originalPostId,
                        url: `https://boards.4channel.org/${board}/thread/${threadId}#p${originalPostId}`
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                toast.success('Comment reposted successfully!');
            } else {
                throw new Error(response.data.error || 'Failed to repost comment');
            }
        } catch (error) {
            console.error('[ThreadView] Error reposting comment:', error);
            if (error.response?.status === 401) {
                // Clear invalid token
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setIsAuthenticated(false);
                toast.error('Session expired. Please log in again.');
                navigate('/login');
            } else {
                toast.error(error.response?.data?.error || 'Failed to repost comment');
            }
        }
    };

    const copyThreadLink = () => {
        const url = `${window.location.origin}/thread/${board}/${threadId}`;
        navigator.clipboard.writeText(url);
        toast.success('Thread link copied to clipboard!');
    };

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    if (!thread) return <div>Thread not found</div>;

    return (
        <div className="max-w-4xl mx-auto p-4">
            {/* Main Post */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                    <h1 className="text-2xl font-bold">
                        {thread[0]?.subject || `Thread #${threadId}`}
                    </h1>
                    <div className="flex gap-2">
                        {isAuthenticated ? (
                            <button
                                onClick={handleRepostMainThread}
                                disabled={isReposting}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                title="Repost this thread"
                            >
                                <FaRetweet />
                                {isReposting ? 'Reposting...' : 'Repost Thread'}
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    localStorage.setItem('redirectAfterLogin', window.location.pathname);
                                    navigate('/login');
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                title="Log in to repost"
                            >
                                <FaRetweet />
                                Log in to Repost
                            </button>
                        )}
                        <button
                            onClick={copyThreadLink}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                            title="Copy thread link"
                        >
                            <FaLink />
                            Copy Link
                        </button>
                        <a
                            href={`https://boards.4channel.org/${board}/thread/${threadId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                            title="View on 4chan"
                        >
                            <FaExternalLinkAlt />
                            View on 4chan
                        </a>
                    </div>
                </div>
                {thread[0]?.image && (
                    <div className="mb-4">
                        <img
                            src={thread[0].image}
                            alt="Thread image"
                            className="max-w-full rounded-lg"
                        />
                    </div>
                )}
                <div className="prose max-w-none">
                    {thread[0]?.comment}
                </div>
            </div>

            {/* Comments */}
            <div className="space-y-4">
                {thread.slice(1).map((comment) => (
                    <div key={comment.id} className="bg-white rounded-lg shadow-md p-4">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-sm text-gray-500">
                                Post #{comment.id}
                            </span>
                            <div className="flex gap-2">
                                {isAuthenticated ? (
                                    <button
                                        onClick={() => handleRepostComment(comment.id, comment.id)}
                                        className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                        title="Repost this comment"
                                    >
                                        <FaRetweet />
                                        Repost
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            localStorage.setItem('redirectAfterLogin', window.location.pathname);
                                            navigate('/login');
                                        }}
                                        className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                        title="Log in to repost"
                                    >
                                        <FaRetweet />
                                        Log in to Repost
                                    </button>
                                )}
                                <a
                                    href={`https://boards.4channel.org/${board}/thread/${threadId}#p${comment.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                                    title="View on 4chan"
                                >
                                    <FaExternalLinkAlt />
                                    View
                                </a>
                            </div>
                        </div>
                        {comment.image && (
                            <div className="mb-2">
                                <img
                                    src={comment.image}
                                    alt="Comment image"
                                    className="max-w-full rounded-lg"
                                />
                            </div>
                        )}
                        <div className="prose max-w-none">
                            {comment.comment}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ThreadView; 