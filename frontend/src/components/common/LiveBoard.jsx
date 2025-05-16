import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaLink, FaYoutube, FaImage, FaTimes, FaLock, FaLockOpen } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const LiveBoard = () => {
    const [newPost, setNewPost] = useState('');
    const [postType, setPostType] = useState('text');
    const [url, setUrl] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const queryClient = useQueryClient();
    const boardRef = useRef(null);

    // Get current user data safely
    const getCurrentUser = () => {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    };

    const currentUser = getCurrentUser();

    // Fetch posts
    const { data: posts = [], isLoading } = useQuery({
        queryKey: ['liveBoardPosts'],
        queryFn: async () => {
            try {
                const res = await fetch('/api/liveboard');
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to fetch posts');
                return data;
            } catch (error) {
                console.error('Error fetching posts:', error);
                throw error;
            }
        },
        refetchInterval: 5000 // Refetch every 5 seconds
    });

    // Create post mutation with optimistic update
    const { mutate: createPost } = useMutation({
        mutationFn: async () => {
            try {
                const res = await fetch('/api/liveboard', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        content: newPost,
                        type: postType,
                        url: url,
                        isPublic
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to create post');
                return data;
            } catch (error) {
                console.error('Error creating post:', error);
                throw error;
            }
        },
        onMutate: async () => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries(['liveBoardPosts']);

            // Snapshot the previous value
            const previousPosts = queryClient.getQueryData(['liveBoardPosts']);

            // Optimistically update to the new value
            const optimisticPost = {
                _id: Date.now().toString(), // Temporary ID
                content: newPost,
                type: postType,
                url: url,
                isPublic,
                createdAt: new Date().toISOString(),
                senderId: currentUser,
            };

            queryClient.setQueryData(['liveBoardPosts'], (old = []) => [optimisticPost, ...old]);

            // Return a context object with the snapshotted value
            return { previousPosts };
        },
        onError: (err, newPost, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            queryClient.setQueryData(['liveBoardPosts'], context.previousPosts);
            toast.error(err.message || 'Failed to create post');
        },
        onSettled: () => {
            // Always refetch after error or success to ensure data is in sync
            queryClient.invalidateQueries(['liveBoardPosts']);
            setNewPost('');
            setUrl('');
            setPostType('text');
        },
    });

    // Delete post mutation with optimistic update
    const { mutate: deletePost } = useMutation({
        mutationFn: async (postId) => {
            try {
                const res = await fetch(`/api/liveboard/${postId}`, {
                    method: 'DELETE',
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to delete post');
                return data;
            } catch (error) {
                console.error('Error deleting post:', error);
                throw error;
            }
        },
        onMutate: async (postId) => {
            await queryClient.cancelQueries(['liveBoardPosts']);
            const previousPosts = queryClient.getQueryData(['liveBoardPosts']);
            
            queryClient.setQueryData(['liveBoardPosts'], (old = []) => 
                old.filter(post => post._id !== postId)
            );

            return { previousPosts };
        },
        onError: (err, postId, context) => {
            queryClient.setQueryData(['liveBoardPosts'], context.previousPosts);
            toast.error(err.message || 'Failed to delete post');
        },
        onSettled: () => {
            queryClient.invalidateQueries(['liveBoardPosts']);
        },
    });

    // Toggle post visibility mutation with optimistic update
    const { mutate: toggleVisibility } = useMutation({
        mutationFn: async ({ postId, isPublic }) => {
            try {
                const res = await fetch(`/api/liveboard/${postId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ isPublic }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to update post');
                return data;
            } catch (error) {
                console.error('Error updating post visibility:', error);
                throw error;
            }
        },
        onMutate: async ({ postId, isPublic }) => {
            await queryClient.cancelQueries(['liveBoardPosts']);
            const previousPosts = queryClient.getQueryData(['liveBoardPosts']);
            
            queryClient.setQueryData(['liveBoardPosts'], (old = []) =>
                old.map(post =>
                    post._id === postId ? { ...post, isPublic } : post
                )
            );

            return { previousPosts };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['liveBoardPosts'], context.previousPosts);
            toast.error(err.message || 'Failed to update post visibility');
        },
        onSettled: () => {
            queryClient.invalidateQueries(['liveBoardPosts']);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newPost.trim()) return;
        createPost();
    };

    const renderPostContent = (post) => {
        try {
            switch (post.type) {
                case 'youtube':
                    const videoId = post.url.split('v=')[1]?.split('&')[0];
                    return (
                        <div className="relative w-full pt-[56.25%]">
                            <iframe
                                className="absolute top-0 left-0 w-full h-full"
                                src={`https://www.youtube.com/embed/${videoId}`}
                                title="YouTube video"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                    );
                case 'image':
                    return (
                        <div className="relative group">
                            <img
                                src={post.url}
                                alt={post.content}
                                className="w-full h-48 object-cover rounded-lg"
                                onError={(e) => {
                                    e.target.src = '/image-placeholder.png';
                                }}
                            />
                            <a
                                href={post.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <span className="text-white">View Full Size</span>
                            </a>
                        </div>
                    );
                case 'link':
                    return (
                        <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline break-all"
                        >
                            {post.url}
                        </a>
                    );
                default:
                    return <p className="whitespace-pre-wrap">{post.content}</p>;
            }
        } catch (error) {
            console.error('Error rendering post content:', error);
            return <p className="text-red-500">Error rendering content</p>;
        }
    };

    return (
        <div className="bg-[#15202b] rounded-lg p-4 mb-4">
            <h2 className="text-xl font-bold mb-4">Live Board</h2>
            
            {/* Post Form */}
            <form onSubmit={handleSubmit} className="mb-4">
                <div className="flex gap-2 mb-2">
                    <button
                        type="button"
                        onClick={() => setPostType('text')}
                        className={`p-2 rounded ${postType === 'text' ? 'bg-blue-500' : 'bg-gray-700'}`}
                    >
                        Text
                    </button>
                    <button
                        type="button"
                        onClick={() => setPostType('link')}
                        className={`p-2 rounded ${postType === 'link' ? 'bg-blue-500' : 'bg-gray-700'}`}
                    >
                        <FaLink />
                    </button>
                    <button
                        type="button"
                        onClick={() => setPostType('youtube')}
                        className={`p-2 rounded ${postType === 'youtube' ? 'bg-blue-500' : 'bg-gray-700'}`}
                    >
                        <FaYoutube />
                    </button>
                    <button
                        type="button"
                        onClick={() => setPostType('image')}
                        className={`p-2 rounded ${postType === 'image' ? 'bg-blue-500' : 'bg-gray-700'}`}
                    >
                        <FaImage />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsPublic(!isPublic)}
                        className={`p-2 rounded ${isPublic ? 'bg-green-500' : 'bg-red-500'}`}
                        title={isPublic ? 'Public' : 'Private'}
                    >
                        {isPublic ? <FaLockOpen /> : <FaLock />}
                    </button>
                </div>
                
                <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full bg-[#1e1e1e] text-white p-2 rounded-lg mb-2 resize-none"
                    rows="3"
                />
                
                {postType !== 'text' && (
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder={`Enter ${postType} URL`}
                        className="w-full bg-[#1e1e1e] text-white p-2 rounded-lg mb-2"
                    />
                )}
                
                <button
                    type="submit"
                    className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                    Post
                </button>
            </form>

            {/* Posts List */}
            <div ref={boardRef} className="space-y-4 max-h-[500px] overflow-y-auto">
                {isLoading ? (
                    <div className="text-center">Loading...</div>
                ) : posts?.length > 0 ? (
                    posts.map((post) => (
                        <div key={post._id} className="bg-[#1e1e1e] rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <img
                                        src={post.senderId?.profileImg || "/avatar-placeholder.png"}
                                        alt={post.senderId?.username || 'User'}
                                        className="w-8 h-8 rounded-full"
                                        onError={(e) => {
                                            e.target.src = "/avatar-placeholder.png";
                                        }}
                                    />
                                    <div>
                                        <p className="font-semibold">{post.senderId?.fullName || 'Unknown User'}</p>
                                        <p className="text-sm text-gray-500">
                                            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {currentUser && post.senderId?._id === currentUser._id && (
                                        <>
                                            <button
                                                onClick={() => toggleVisibility({ postId: post._id, isPublic: !post.isPublic })}
                                                className="text-gray-500 hover:text-white"
                                                title={post.isPublic ? 'Make Private' : 'Make Public'}
                                            >
                                                {post.isPublic ? <FaLockOpen /> : <FaLock />}
                                            </button>
                                            <button
                                                onClick={() => deletePost(post._id)}
                                                className="text-gray-500 hover:text-white"
                                            >
                                                <FaTimes />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {renderPostContent(post)}
                        </div>
                    ))
                ) : (
                    <div className="text-center text-gray-500">No posts yet</div>
                )}
            </div>
        </div>
    );
};

export default LiveBoard; 