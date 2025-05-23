import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FaPlus, FaList, FaTh, FaImage, FaTimes, FaTrash, FaEdit, FaBookmark, FaRegBookmark, FaUsers, FaUserShield, FaComments, FaEye } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuthUser } from '../hooks/useAuthUser';
import LeechesSection from '../components/boards/LeechesSection';
import Breadcrumb from '../components/common/Breadcrumb';

const BoardsPage = () => {
    const [viewMode, setViewMode] = useState('grid');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingBoard, setEditingBoard] = useState(null);
    const [showFollowing, setShowFollowing] = useState(false);
    const [newBoard, setNewBoard] = useState({
        name: '',
        description: '',
        image: '',
        privacy: 'public',
        allowedLists: []
    });
    const imageInputRef = useRef(null);
    const editImageInputRef = useRef(null);
    const { authUser } = useAuthUser();
    const queryClient = useQueryClient();

    // Fetch all boards
    const { data: boards, isLoading } = useQuery({
        queryKey: ['boards'],
        queryFn: async () => {
            const res = await fetch('/api/boards', {
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Something went wrong');
            console.log('Fetched boards:', data);
            return data;
        }
    });

    // Fetch following boards
    const { data: followingBoards, isLoading: isLoadingFollowing } = useQuery({
        queryKey: ['followingBoards'],
        queryFn: async () => {
            if (!authUser) return [];
            console.log('Fetching following boards for user:', authUser._id);
            const res = await fetch('/api/boards/following', {
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch following boards');
            console.log('Fetched following boards:', data);
            return data;
        },
        enabled: !!authUser && showFollowing,
        refetchOnWindowFocus: false,
        staleTime: 0, // Ensure we always get fresh data
        retry: 1 // Only retry once if the request fails
    });

    // Upload image mutation
    const uploadImageMutation = useMutation({
        mutationFn: async (file) => {
            console.log('Starting image upload with file:', {
                name: file.name,
                type: file.type,
                size: file.size
            });

            const formData = new FormData();
            formData.append('file', file);
            
            console.log('Sending upload request to /api/upload');
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await res.json();
            console.log('Upload response:', data);
            
            if (!res.ok) throw new Error(data.error || 'Failed to upload image');
            
            // Cloudinary URLs are already absolute, no need to modify
            const imageUrl = data.url;
            console.log('Final image URL:', imageUrl);
            
            return imageUrl;
        },
        onSuccess: (imageUrl) => {
            console.log('Image uploaded successfully:', imageUrl);
            setNewBoard(prev => {
                console.log('Updating board with new image:', imageUrl);
                return { ...prev, image: imageUrl };
            });
        },
        onError: (error) => {
            console.error('Image upload error:', error);
            toast.error(error.message);
        }
    });

    // Create board mutation
    const createBoardMutation = useMutation({
        mutationFn: async (boardData) => {
            console.log('Creating board with data:', boardData);
            const res = await fetch('/api/boards/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(boardData)
            });

            const data = await res.json();
            console.log('Create board response:', data);

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create board');
            }

            if (!data.success) {
                throw new Error(data.error || 'Failed to create board');
            }

            return data.board;
        },
        onSuccess: (newBoard) => {
            console.log('Board created successfully:', newBoard);
            queryClient.invalidateQueries(['boards']);
            setShowCreateModal(false);
            setNewBoard({
                name: '',
                description: '',
                image: '',
                isPrivate: false
            });
            toast.success('Board created successfully!');
        },
        onError: (error) => {
            console.error('Error creating board:', error);
            toast.error(error.message || 'Failed to create board');
        }
    });

    // Add delete board mutation
    const deleteBoardMutation = useMutation({
        mutationFn: async (boardId) => {
            const res = await fetch(`/api/boards/${boardId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete board');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['boards']);
            toast.success('Board deleted successfully!');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Add edit board mutation
    const editBoardMutation = useMutation({
        mutationFn: async (boardData) => {
            console.log('Updating board with data:', boardData);
            const res = await fetch(`/api/boards/${boardData._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    name: boardData.name,
                    description: boardData.description,
                    image: boardData.image,
                    privacy: boardData.privacy,
                    allowedLists: boardData.allowedLists
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update board');
            console.log('Board update response:', data);
            return data;
        },
        onSuccess: (data) => {
            console.log('Board updated successfully:', data);
            queryClient.setQueryData(['boards'], (oldData) => {
                return oldData.map(board => 
                    board._id === data._id ? { ...board, ...data } : board
                );
            });
            setShowEditModal(false);
            setEditingBoard(null);
            toast.success('Board updated successfully');
        },
        onError: (error) => {
            console.error('Board update error:', error);
            toast.error(error.message);
        }
    });

    // Follow/Unfollow board mutation
    const followMutation = useMutation({
        mutationFn: async (boardId) => {
            console.log('Following/unfollowing board:', boardId);
            const res = await fetch(`/api/boards/${boardId}/follow`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to follow/unfollow board');
            console.log('Follow/unfollow response:', data);
            return data;
        },
        onSuccess: (data) => {
            console.log('Follow/unfollow success:', data);
            // Update the boards query cache
            queryClient.setQueryData(['boards'], (oldData) => {
                if (!oldData) return oldData;
                return oldData.map(board => {
                    if (board._id === data.board._id) {
                        return data.board;
                    }
                    return board;
                });
            });
            // Invalidate and refetch following boards
            queryClient.invalidateQueries(['followingBoards']);
            toast.success(data.message);
        },
        onError: (error) => {
            console.error('Follow/unfollow error:', error);
            toast.error(error.message);
        }
    });

    const handleCreateBoard = (e) => {
        e.preventDefault();
        if (!newBoard.name.trim()) {
            toast.error('Please enter a board name');
            return;
        }

        createBoardMutation.mutate(newBoard);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size should be less than 5MB');
            return;
        }

        try {
            console.log('Starting image upload with file:', {
                name: file.name,
                type: file.type,
                size: file.size
            });

            const formData = new FormData();
            formData.append('file', file);
            
            // Show loading toast
            const loadingToast = toast.loading('Uploading image...');
            
            console.log('Sending upload request to /api/upload');
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            // Handle non-JSON responses or network errors
            let data;
            try {
                const textData = await res.text();
                data = JSON.parse(textData);
            } catch (parseError) {
                console.error('Error parsing JSON response:', parseError);
                toast.dismiss(loadingToast);
                toast.error('Server response error. Please try again.');
                return;
            }
            
            if (!res.ok) {
                toast.dismiss(loadingToast);
                throw new Error(data.error || 'Failed to upload image');
            }
            
            console.log('Upload response:', data);
            
            if (!data.url) {
                toast.dismiss(loadingToast);
                throw new Error('No image URL received from server');
            }
            
            // Update the appropriate state based on which input triggered the upload
            if (e.target === imageInputRef.current) {
                setNewBoard(prev => ({
                    ...prev,
                    image: data.url
                }));
            } else if (e.target === editImageInputRef.current) {
                setEditingBoard(prev => ({
                    ...prev,
                    image: data.url
                }));
            }
            
            toast.dismiss(loadingToast);
            toast.success('Image uploaded successfully');
        } catch (error) {
            console.error('Image upload error:', error);
            toast.error(error.message || 'Failed to upload image');
        }
    };

    const handleDeleteBoard = (e, boardId) => {
        e.preventDefault(); // Prevent navigation
        e.stopPropagation(); // Prevent event bubbling
        if (window.confirm('Are you sure you want to delete this board?')) {
            deleteBoardMutation.mutate(boardId);
        }
    };

    const handleEditBoard = (board) => {
        setEditingBoard(board);
        setShowEditModal(true);
    };

    const handleUpdateBoard = (e) => {
        e.preventDefault();
        editBoardMutation.mutate(editingBoard);
    };

    const handleFollowBoard = (e, boardId) => {
        e.preventDefault();
        e.stopPropagation();
        followMutation.mutate(boardId);
    };

    // Add this after the image upload mutation
    const { data: userLists } = useQuery({
        queryKey: ['userLists'],
        queryFn: async () => {
            const res = await fetch('/api/user/lists', {
                headers: {
                    'Authorization': `Bearer ${authUser?.token}`
                }
            });
            const data = await res.json();
            return data;
        },
        enabled: !!authUser
    });

    // Add this function at the top level of your component
    const loadImage = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(url);
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
            img.src = url;
        });
    };

    const isFollowing = (board) => {
        if (!board.followers || !authUser) return false;
        
        // Check if the user's ID is in the followers array
        const isFollowing = board.followers.some(follower => {
            // Handle both populated and unpopulated follower objects
            const followerId = typeof follower === 'object' ? follower._id : follower;
            return followerId === authUser._id;
        });
        
        console.log('Checking if following board:', board.name, 'Result:', isFollowing, 'Followers:', board.followers);
        return isFollowing;
    };

    const displayedBoards = showFollowing ? followingBoards : boards;
    const isLoadingDisplayed = showFollowing ? isLoadingFollowing : isLoading;

    return (
        <div className="flex-[4_4_0] border-r border-gray-700 min-h-screen">
            {/* Breadcrumb Navigation */}
            <Breadcrumb 
                items={[
                    { label: 'Boards' }
                ]}
            />

            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col gap-4 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">
                                {showFollowing ? 'Following Boards' : 'All Boards'}
                            </h1>
                            {!showFollowing && boards?.length > 0 && (
                                <p className="text-gray-500 mt-1">
                                    Available boards: {boards
                                        .filter(board => board.privacy === 'public')
                                        .map(board => (
                                            <Link
                                                key={board._id}
                                                to={`/boards/${board.name}`}
                                                className="text-blue-500 hover:text-blue-600 hover:underline"
                                            >
                                                /{board.name}
                                            </Link>
                                        ))
                                        .reduce((prev, curr) => [prev, ' ', curr])}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    setShowFollowing(!showFollowing);
                                    if (!showFollowing) {
                                        queryClient.invalidateQueries(['followingBoards']);
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                            >
                                {showFollowing ? <FaBookmark className="w-4 h-4" /> : <FaRegBookmark className="w-4 h-4" />}
                                {showFollowing ? 'Show All Boards' : 'Show Following'}
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                                    viewMode === 'list' ? 'text-blue-500' : 'text-gray-500'
                                }`}
                                title="List View"
                            >
                                <FaList className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                                    viewMode === 'grid' ? 'text-blue-500' : 'text-gray-500'
                                }`}
                                title="Grid View"
                            >
                                <FaTh className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors"
                            >
                                <FaPlus className="w-4 h-4" />
                                <span>Create Board</span>
                            </button>
                        </div>
                    </div>
                </div>

                {(isLoading || (showFollowing && isLoadingFollowing)) ? (
                    <div className="flex justify-center items-center h-64">
                        <LoadingSpinner />
                    </div>
                ) : (
                    <div className={viewMode === 'grid' 
                        ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' 
                        : 'grid grid-cols-1 lg:grid-cols-2 gap-4'
                    }>
                        {showFollowing ? (
                            Array.isArray(followingBoards) && followingBoards.length > 0 ? (
                                followingBoards.map((board) => (
                                    <Link
                                        key={board._id}
                                        to={`/boards/${board.name}`}
                                        className={`relative bg-[#1e1e1e] rounded-lg overflow-hidden hover:bg-[#2a2a2a] transition-colors ${
                                            viewMode === 'grid' ? 'h-[200px]' : 'flex h-[120px]'
                                        }`}
                                    >
                                        {board.image && (
                                            <div className={viewMode === 'grid' ? 'absolute inset-0' : 'w-[120px] h-full'}>
                                                <img
                                                    src={board.image}
                                                    alt={board.name}
                                                    className={viewMode === 'grid' 
                                                        ? 'w-full h-full object-cover'
                                                        : 'w-full h-full object-cover'
                                                    }
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = '/default-board.jpg';
                                                    }}
                                                />
                                                {viewMode === 'grid' && <div className="absolute inset-0 bg-black bg-opacity-30" />}
                                            </div>
                                        )}
                                        <div className={`relative h-full flex flex-col ${viewMode === 'grid' ? 'p-4 z-10' : 'flex-1 p-4'}`}>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h3 className="text-xl font-bold mb-2 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{board.name}</h3>
                                                        <p className="text-gray-200 text-sm line-clamp-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">{board.description}</p>
                                                    </div>
                                                    <div className="flex gap-2 ml-4">
                                                        {board.creator !== authUser?._id && (
                                                            <button
                                                                onClick={(e) => handleFollowBoard(e, board._id)}
                                                                className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-full transition-colors drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
                                                                title={isFollowing(board) ? "Unfollow board" : "Follow board"}
                                                            >
                                                                {isFollowing(board) ? (
                                                                    <FaBookmark className="w-4 h-4" />
                                                                ) : (
                                                                    <FaRegBookmark className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        )}
                                                        {(board.creator === authUser?._id || board.admins?.includes(authUser?._id)) && (
                                                            <>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        handleEditBoard(board);
                                                                    }}
                                                                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-full transition-colors drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
                                                                    title="Edit board"
                                                                >
                                                                    <FaEdit className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleDeleteBoard(e, board._id)}
                                                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full transition-colors drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
                                                                    title="Delete board"
                                                                >
                                                                    <FaTrash className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Board Stats Footer */}
                                            <div className="mt-auto px-4 py-2 bg-black bg-opacity-50 flex items-center justify-between text-xs text-gray-400">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1 group relative">
                                                        <FaUsers className="w-3 h-3" />
                                                        <span>{board.followers?.length || 0}</span>
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                            Followers
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 group relative">
                                                        <FaUserShield className="w-3 h-3" />
                                                        <span>{board.admins?.length || 1}</span>
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                            Admins
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 group relative">
                                                        <FaComments className="w-3 h-3" />
                                                        <span>{board.posts?.length || 0}</span>
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                            Threads
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 group relative">
                                                        <FaEye className="w-3 h-3" />
                                                        <span>
                                                            {(() => {
                                                                const totalReplies = (board.posts || []).reduce((total, post) => {
                                                                    // Count comments
                                                                    const commentsCount = post.comments?.length || 0;
                                                                    
                                                                    // Count replies to each comment
                                                                    const repliesCount = (post.comments || []).reduce((sum, comment) => {
                                                                        // Count direct replies
                                                                        const directReplies = comment.replies?.length || 0;
                                                                        // Count nested replies (replies to replies)
                                                                        const nestedReplies = (comment.replies || []).reduce((nestedSum, reply) => {
                                                                            // Count replies to this reply
                                                                            const replyReplies = reply.replies?.length || 0;
                                                                            // Recursively count nested replies
                                                                            const deeperReplies = (reply.replies || []).reduce((deepSum, deepReply) => {
                                                                                return deepSum + (deepReply.replies?.length || 0);
                                                                            }, 0);
                                                                            return nestedSum + replyReplies + deeperReplies;
                                                                        }, 0);
                                                                        return sum + directReplies + nestedReplies;
                                                                    }, 0);
                                                                    
                                                                    return total + commentsCount + repliesCount;
                                                                }, 0);
                                                                return totalReplies;
                                                            })()}
                                                        </span>
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                            Total Replies
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 group relative">
                                                        <FaEye className="w-3 h-3" />
                                                        <span>{board.views || 0}</span>
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                            Views
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-8 text-gray-500">
                                    You haven't followed any boards yet. Follow some boards to see them here!
                                </div>
                            )
                        ) : (
                            boards?.length > 0 ? (
                                boards.map((board) => (
                                    <Link
                                        key={board._id}
                                        to={`/boards/${board.name}`}
                                        className={`relative bg-[#1e1e1e] rounded-lg overflow-hidden hover:bg-[#2a2a2a] transition-colors ${
                                            viewMode === 'grid' ? 'h-[200px]' : 'flex h-[120px]'
                                        }`}
                                    >
                                        {board.image && (
                                            <div className={viewMode === 'grid' ? 'absolute inset-0' : 'w-[120px] h-full'}>
                                                <img
                                                    src={board.image}
                                                    alt={board.name}
                                                    className={viewMode === 'grid' 
                                                        ? 'w-full h-full object-cover'
                                                        : 'w-full h-full object-cover'
                                                    }
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = '/default-board.jpg';
                                                    }}
                                                />
                                                {viewMode === 'grid' && <div className="absolute inset-0 bg-black bg-opacity-30" />}
                                            </div>
                                        )}
                                        <div className={`relative h-full flex flex-col ${viewMode === 'grid' ? 'p-4 z-10' : 'flex-1 p-4'}`}>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h3 className="text-xl font-bold mb-2 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{board.name}</h3>
                                                        <p className="text-gray-200 text-sm line-clamp-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">{board.description}</p>
                                                    </div>
                                                    <div className="flex gap-2 ml-4">
                                                        {board.creator !== authUser?._id && (
                                                            <button
                                                                onClick={(e) => handleFollowBoard(e, board._id)}
                                                                className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-full transition-colors drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
                                                                title={isFollowing(board) ? "Unfollow board" : "Follow board"}
                                                            >
                                                                {isFollowing(board) ? (
                                                                    <FaBookmark className="w-4 h-4" />
                                                                ) : (
                                                                    <FaRegBookmark className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        )}
                                                        {(board.creator === authUser?._id || board.admins?.includes(authUser?._id)) && (
                                                            <>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        handleEditBoard(board);
                                                                    }}
                                                                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-full transition-colors drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
                                                                    title="Edit board"
                                                                >
                                                                    <FaEdit className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleDeleteBoard(e, board._id)}
                                                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full transition-colors drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
                                                                    title="Delete board"
                                                                >
                                                                    <FaTrash className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Board Stats Footer */}
                                            <div className="mt-auto px-4 py-2 bg-black bg-opacity-50 flex items-center justify-between text-xs text-gray-400">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1 group relative">
                                                        <FaUsers className="w-3 h-3" />
                                                        <span>{board.followers?.length || 0}</span>
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                            Followers
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 group relative">
                                                        <FaUserShield className="w-3 h-3" />
                                                        <span>{board.admins?.length || 1}</span>
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                            Admins
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 group relative">
                                                        <FaComments className="w-3 h-3" />
                                                        <span>{board.posts?.length || 0}</span>
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                            Threads
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 group relative">
                                                        <FaEye className="w-3 h-3" />
                                                        <span>
                                                            {(() => {
                                                                const totalReplies = (board.posts || []).reduce((total, post) => {
                                                                    // Count comments
                                                                    const commentsCount = post.comments?.length || 0;
                                                                    
                                                                    // Count replies to each comment
                                                                    const repliesCount = (post.comments || []).reduce((sum, comment) => {
                                                                        // Count direct replies
                                                                        const directReplies = comment.replies?.length || 0;
                                                                        // Count nested replies (replies to replies)
                                                                        const nestedReplies = (comment.replies || []).reduce((nestedSum, reply) => {
                                                                            // Count replies to this reply
                                                                            const replyReplies = reply.replies?.length || 0;
                                                                            // Recursively count nested replies
                                                                            const deeperReplies = (reply.replies || []).reduce((deepSum, deepReply) => {
                                                                                return deepSum + (deepReply.replies?.length || 0);
                                                                            }, 0);
                                                                            return nestedSum + replyReplies + deeperReplies;
                                                                        }, 0);
                                                                        return sum + directReplies + nestedReplies;
                                                                    }, 0);
                                                                    
                                                                    return total + commentsCount + repliesCount;
                                                                }, 0);
                                                                return totalReplies;
                                                            })()}
                                                        </span>
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                            Total Replies
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 group relative">
                                                        <FaEye className="w-3 h-3" />
                                                        <span>{board.views || 0}</span>
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                            Views
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-8 text-gray-500">
                                    No boards available
                                </div>
                            )
                        )}
                    </div>
                )}

                {/* Create Board Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-[#1e1e1e] p-6 rounded-lg w-full max-w-2xl">
                            <div className="flex items-center gap-4 mb-4">
                                <img
                                    src={authUser?.profilePicture}
                                    alt={authUser?.username}
                                    className="w-12 h-12 rounded-full"
                                />
                                <div>
                                    <h2 className="font-semibold">{authUser?.username}</h2>
                                    <p className="text-sm text-gray-400">Create a new board</p>
                                </div>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="ml-auto p-2 rounded-full hover:bg-gray-700 transition-colors"
                                >
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleCreateBoard}>
                                <div className="mb-4">
                                    <input
                                        type="text"
                                        value={newBoard.name}
                                        onChange={(e) => setNewBoard({ ...newBoard, name: e.target.value })}
                                        placeholder="Board name"
                                        className="w-full p-2 rounded bg-[#2a2a2a] border border-gray-700"
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <textarea
                                        value={newBoard.description}
                                        onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })}
                                        placeholder="Board description"
                                        className="w-full p-2 rounded bg-[#2a2a2a] border border-gray-700"
                                        rows="3"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={newBoard.isPrivate}
                                            onChange={(e) => setNewBoard({ ...newBoard, isPrivate: e.target.checked })}
                                            className="rounded bg-[#2a2a2a] border-gray-700"
                                        />
                                        <span className="text-sm">Private Board</span>
                                    </label>
                                </div>
                                <div className="mb-4">
                                    <input
                                        type="file"
                                        ref={imageInputRef}
                                        onChange={handleImageUpload}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => imageInputRef.current?.click()}
                                        className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
                                    >
                                        <FaImage className="w-4 h-4" />
                                        <span>Add Cover Image</span>
                                    </button>
                                    {newBoard.image && (
                                        <div className="mt-2 relative w-32 h-32">
                                            <img
                                                src={newBoard.image}
                                                alt="Board cover"
                                                className="w-full h-full object-cover rounded"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setNewBoard(prev => ({ ...prev, image: '' }))}
                                                className="absolute top-1 right-1 p-1 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75"
                                            >
                                                <FaTimes className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Privacy Settings</label>
                                    <div className="space-y-2">
                                        <div className="flex items-center">
                                            <input
                                                type="radio"
                                                id="public"
                                                name="privacy"
                                                value="public"
                                                checked={newBoard.privacy === 'public'}
                                                onChange={(e) => setNewBoard({ ...newBoard, privacy: e.target.value })}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor="public" className="ml-2 text-sm text-gray-700">
                                                Public - Anyone can view this board
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="radio"
                                                id="followers"
                                                name="privacy"
                                                value="followers"
                                                checked={newBoard.privacy === 'followers'}
                                                onChange={(e) => setNewBoard({ ...newBoard, privacy: e.target.value })}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor="followers" className="ml-2 text-sm text-gray-700">
                                                Followers - Only your followers can view this board
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="radio"
                                                id="lists"
                                                name="privacy"
                                                value="lists"
                                                checked={newBoard.privacy === 'lists'}
                                                onChange={(e) => setNewBoard({ ...newBoard, privacy: e.target.value })}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor="lists" className="ml-2 text-sm text-gray-700">
                                                Lists - Only specific lists can view this board
                                            </label>
                                        </div>
                                    </div>

                                    {newBoard.privacy === 'lists' && (
                                        <div className="mt-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Lists</label>
                                            <div className="max-h-40 overflow-y-auto border rounded-lg p-2">
                                                {userLists?.map((list) => (
                                                    <div key={list._id} className="flex items-center py-1">
                                                        <input
                                                            type="checkbox"
                                                            id={`list-${list._id}`}
                                                            checked={newBoard.allowedLists.includes(list._id)}
                                                            onChange={(e) => {
                                                                const updatedLists = e.target.checked
                                                                    ? [...newBoard.allowedLists, list._id]
                                                                    : newBoard.allowedLists.filter(id => id !== list._id);
                                                                setNewBoard({ ...newBoard, allowedLists: updatedLists });
                                                            }}
                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <label htmlFor={`list-${list._id}`} className="ml-2 text-sm text-gray-700">
                                                            {list.name}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 transition-colors"
                                        disabled={createBoardMutation.isLoading}
                                    >
                                        {createBoardMutation.isLoading ? 'Creating...' : 'Create Board'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Board Modal */}
                {showEditModal && editingBoard && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-[#1e1e1e] p-6 rounded-lg w-full max-w-2xl">
                            <div className="flex items-center gap-4 mb-4">
                                <img
                                    src={authUser?.profilePicture}
                                    alt={authUser?.username}
                                    className="w-12 h-12 rounded-full"
                                />
                                <div>
                                    <h2 className="font-semibold">{authUser?.username}</h2>
                                    <p className="text-sm text-gray-400">Edit board</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingBoard(null);
                                    }}
                                    className="ml-auto p-2 rounded-full hover:bg-gray-700 transition-colors"
                                >
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateBoard}>
                                <div className="mb-4">
                                    <input
                                        type="text"
                                        value={editingBoard.name}
                                        onChange={(e) => setEditingBoard({ ...editingBoard, name: e.target.value })}
                                        placeholder="Board name"
                                        className="w-full p-2 rounded bg-[#2a2a2a] border border-gray-700"
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <textarea
                                        value={editingBoard.description}
                                        onChange={(e) => setEditingBoard({ ...editingBoard, description: e.target.value })}
                                        placeholder="Board description"
                                        className="w-full p-2 rounded bg-[#2a2a2a] border border-gray-700"
                                        rows="3"
                                    />
                                </div>
                                <div className="mb-4">
                                    <input
                                        type="file"
                                        ref={editImageInputRef}
                                        onChange={handleImageUpload}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => editImageInputRef.current?.click()}
                                        className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
                                    >
                                        <FaImage className="w-4 h-4" />
                                        <span>Change Cover Image</span>
                                    </button>
                                    {editingBoard.image && (
                                        <div className="mt-2 relative w-32 h-32">
                                            <img
                                                src={editingBoard.image}
                                                alt="Board cover"
                                                className="w-full h-full object-cover rounded"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setEditingBoard(prev => ({ ...prev, image: '' }))}
                                                className="absolute top-1 right-1 p-1 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75"
                                            >
                                                <FaTimes className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Privacy Settings</label>
                                    <div className="space-y-2">
                                        <div className="flex items-center">
                                            <input
                                                type="radio"
                                                id="edit-public"
                                                name="edit-privacy"
                                                value="public"
                                                checked={editingBoard.privacy === 'public'}
                                                onChange={(e) => setEditingBoard({ ...editingBoard, privacy: e.target.value })}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor="edit-public" className="ml-2 text-sm text-gray-700">
                                                Public - Anyone can view this board
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="radio"
                                                id="edit-followers"
                                                name="edit-privacy"
                                                value="followers"
                                                checked={editingBoard.privacy === 'followers'}
                                                onChange={(e) => setEditingBoard({ ...editingBoard, privacy: e.target.value })}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor="edit-followers" className="ml-2 text-sm text-gray-700">
                                                Followers - Only your followers can view this board
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="radio"
                                                id="edit-lists"
                                                name="edit-privacy"
                                                value="lists"
                                                checked={editingBoard.privacy === 'lists'}
                                                onChange={(e) => setEditingBoard({ ...editingBoard, privacy: e.target.value })}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor="edit-lists" className="ml-2 text-sm text-gray-700">
                                                Lists - Only specific lists can view this board
                                            </label>
                                        </div>
                                    </div>

                                    {editingBoard.privacy === 'lists' && (
                                        <div className="mt-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Lists</label>
                                            <div className="max-h-40 overflow-y-auto border rounded-lg p-2">
                                                {userLists?.map((list) => (
                                                    <div key={list._id} className="flex items-center py-1">
                                                        <input
                                                            type="checkbox"
                                                            id={`edit-list-${list._id}`}
                                                            checked={editingBoard.allowedLists.includes(list._id)}
                                                            onChange={(e) => {
                                                                const updatedLists = e.target.checked
                                                                    ? [...editingBoard.allowedLists, list._id]
                                                                    : editingBoard.allowedLists.filter(id => id !== list._id);
                                                                setEditingBoard({ ...editingBoard, allowedLists: updatedLists });
                                                            }}
                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <label htmlFor={`edit-list-${list._id}`} className="ml-2 text-sm text-gray-700">
                                                            {list.name}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            setEditingBoard(null);
                                        }}
                                        className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 transition-colors"
                                        disabled={editBoardMutation.isLoading}
                                    >
                                        {editBoardMutation.isLoading ? 'Updating...' : 'Update Board'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Add Leeches section at the bottom */}
                <LeechesSection />
            </div>
        </div>
    );
};

export default BoardsPage; 