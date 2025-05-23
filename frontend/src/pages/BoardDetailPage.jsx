import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaArrowLeft, FaTrash, FaUserShield, FaUserSlash, FaLock, FaLockOpen, FaBookmark, FaFeather, FaList, FaTh, FaCamera, FaUsers, FaComments, FaEye, FaPlus, FaChevronRight, FaHome } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Post from '../components/common/Post';
import PostPopup from "../components/common/PostPopup";
import PageHeader from '../components/common/PageHeader';
import Breadcrumb from '../components/common/Breadcrumb';

const BoardDetailPage = ({ isWideMode }) => {
    const { boardName } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: authUser } = useQuery({ queryKey: ["authUser"] });
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [showBanModal, setShowBanModal] = useState(false);
    const [showPostPopup, setShowPostPopup] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    
    const handleCoverPhotoChange = async (e) => {
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
        
        // Show loading toast
        const loadingToast = toast.loading('Uploading cover photo...');
        
        const formData = new FormData();
        formData.append('coverPhoto', file);
        
        try {
            // Add authorization header
            const token = localStorage.getItem('token');
            
            const res = await fetch(`/api/boards/${boardName}/cover`, {
                method: 'PUT',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include'
            });
            
            // Parse response as JSON
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Failed to update cover photo');
            }
            
            // Update the query cache and show success message
            queryClient.invalidateQueries(['board', boardName]);
            toast.dismiss(loadingToast);
            toast.success('Cover photo updated successfully');
        } catch (error) {
            console.error('Error updating cover photo:', error);
            toast.dismiss(loadingToast);
            toast.error(error.message || 'Failed to update cover photo');
        }
    };
    const [showCoverUpload, setShowCoverUpload] = useState(false);
    const [coverPreview, setCoverPreview] = useState(null);

    // Fetch board details
    const { data: board, isLoading } = useQuery({
        queryKey: ['board', boardName],
        queryFn: async () => {
            const res = await fetch(`/api/boards/${boardName}`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to fetch board');
            const data = await res.json();
            return data;
        }
    });

    // Fetch latest threads
    const { data: threads } = useQuery({
        queryKey: ['boardThreads', boardName],
        queryFn: async () => {
            const res = await fetch(`/api/boards/${boardName}/threads`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to fetch threads');
            const data = await res.json();
            return data;
        },
        enabled: !!board
    });

    // Delete board mutation
    const deleteBoardMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/boards/${boardName}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Something went wrong');
            return data;
        },
        onSuccess: () => {
            toast.success('Board deleted successfully');
            navigate('/boards');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Toggle privacy mutation
    const togglePrivacyMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/boards/${boardName}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isPrivate: !board.isPrivate })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Something went wrong');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['board', boardName]);
            toast.success(`Board is now ${board.isPrivate ? 'public' : 'private'}`);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Admin management mutation
    const adminMutation = useMutation({
        mutationFn: async ({ userId, action }) => {
            const res = await fetch(`/api/boards/${boardName}/admin/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Something went wrong');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['board', boardName]);
            setShowAdminModal(false);
            toast.success('Admin list updated');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Ban user mutation
    const banMutation = useMutation({
        mutationFn: async ({ userId, action }) => {
            const res = await fetch(`/api/boards/${boardName}/ban/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Something went wrong');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['board', boardName]);
            setShowBanModal(false);
            toast.success('User ban status updated');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Add cover photo update mutation
    const updateCoverMutation = useMutation({
        mutationFn: async (formData) => {
            try {
                console.log('Uploading cover photo...');
                const res = await fetch(`/api/boards/${boardName}/cover`, {
                    method: 'PUT',
                    body: formData
                });
                
                console.log('Response status:', res.status);
                const contentType = res.headers.get('content-type');
                console.log('Response content type:', contentType);

                // Check if response is ok
                if (!res.ok) {
                    // Try to get error message from response
                    let errorMessage = 'Failed to update cover photo';
                    try {
                        const errorData = await res.json();
                        errorMessage = errorData.error || errorMessage;
                    } catch (e) {
                        // If we can't parse JSON, use the status text
                        errorMessage = res.statusText || errorMessage;
                    }
                    throw new Error(errorMessage);
                }

                // Try to parse the response as JSON
                let data;
                if (contentType && contentType.includes('application/json')) {
                    data = await res.json();
                } else {
                    // If response is not JSON, return a success object
                    data = { success: true };
                }

                console.log('Upload response:', data);
                console.log('Board data:', data.board);
                console.log('Cover photo URL:', data.board?.coverPhoto);
                return data;
            } catch (error) {
                console.error('Cover photo update error:', error);
                throw error;
            }
        },
        onSuccess: (data) => {
            console.log('Cover photo update successful:', data);
            console.log('Current board data:', queryClient.getQueryData(['board', boardName]));
            
            // Update the board data in the cache with the complete board object
            queryClient.setQueryData(['board', boardName], (oldData) => {
                if (!data.board) {
                    console.error('No board data in response');
                    return oldData;
                }

                const newData = {
                    ...oldData,
                    ...data.board,
                    coverPhoto: data.board.coverPhoto || data.coverPhoto
                };

                console.log('Old board data:', oldData);
                console.log('New board data:', newData);
                console.log('Cover photo URL:', newData.coverPhoto);

                return newData;
            });
            
            // Clear the preview since we now have the actual uploaded image
            setCoverPreview(null);
            
            // Force a refetch to ensure we have the latest data
            queryClient.invalidateQueries(['board', boardName]);
            
            toast.success('Cover photo updated successfully');
            setShowCoverUpload(false);
        },
        onError: (error) => {
            console.error('Cover photo update error:', error);
            toast.error(error.message || 'Failed to update cover photo');
            // Clear preview on error
            setCoverPreview(null);
        }
    });

    // Increment view count when board is loaded
    useEffect(() => {
        if (board) {
            fetch(`/api/boards/${boardName}/view`, {
                method: 'POST',
                credentials: 'include'
            }).catch(console.error);
        }
    }, [board, boardName]);

    const handleCoverChange = async (e) => {
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

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setCoverPreview(previewUrl);

        try {
            console.log('Preparing to upload file:', {
                name: file.name,
                type: file.type,
                size: file.size
            });

            const formData = new FormData();
            formData.append('coverPhoto', file);
            await updateCoverMutation.mutateAsync(formData);
        } catch (error) {
            console.error('Error uploading cover photo:', error);
            toast.error(error.message || 'Failed to upload cover photo');
            // Clear preview on error
            setCoverPreview(null);
        }
    };

    // Clean up preview URL when component unmounts
    useEffect(() => {
        return () => {
            if (coverPreview) {
                URL.revokeObjectURL(coverPreview);
            }
        };
    }, [coverPreview]);

    // Handle post creation success
    const handlePostSuccess = (newPost) => {
        // Update the board's posts in the cache
        queryClient.setQueryData(['board', boardName], (oldData) => {
            if (!oldData) return oldData;
            return {
                ...oldData,
                posts: [newPost, ...oldData.posts]
            };
        });

        // Also update the feed if it exists
        queryClient.setQueryData(['feed'], (oldData) => {
            if (!oldData) return [newPost];
            return [newPost, ...oldData];
        });

        // Update user posts if on profile page
        if (newPost.user?.username) {
            queryClient.setQueryData(['userPosts', newPost.user.username], (oldData) => {
                if (!oldData) return [newPost];
                return [newPost, ...oldData];
            });
        }

        // Close the popup
        setShowPostPopup(false);
    };

    if (isLoading) {
        return (
            <div className='flex-[4_4_0] border-r border-gray-700 min-h-screen flex items-center justify-center'>
                <LoadingSpinner size='lg' />
            </div>
        );
    }

    if (!board) {
        return (
            <div className='flex-[4_4_0] border-r border-gray-700 min-h-screen flex items-center justify-center'>
                <div className='text-center'>
                    <h2 className='text-xl font-bold mb-2'>Board not found</h2>
                    <button
                        onClick={() => navigate('/boards')}
                        className='text-blue-500 hover:text-blue-400'
                    >
                        Go back to boards
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className='flex-[4_4_0] border-r border-gray-700 min-h-screen'>
            {/* Breadcrumb Navigation */}
            <Breadcrumb 
                items={[
                    { label: 'Boards', link: '/boards' },
                    { label: board.name }
                ]}
            />

            {/* Header */}
            <PageHeader>
                <div className='flex items-center gap-4'>
                    <button onClick={() => navigate('/boards')} className='hover:bg-gray-700 p-2 rounded-full transition-colors'>
                        <FaArrowLeft className='w-5 h-5' />
                    </button>
                    <div className='flex-1'>
                        <h1 className='text-xl font-bold'>{board.name}</h1>
                        <p className='text-gray-500'>{board.description}</p>
                    </div>
                    <div className='flex items-center gap-2'>
                        <button
                            onClick={() => setShowPostPopup(true)}
                            className='flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
                        >
                            <FaFeather className='w-4 h-4' />
                            New Thread
                        </button>
                        <button
                            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                            className='p-2 hover:bg-gray-700 rounded-full transition-colors'
                            title={`Switch to ${viewMode === 'list' ? 'grid' : 'list'} view`}
                        >
                            {viewMode === 'list' ? <FaTh className='w-5 h-5' /> : <FaList className='w-5 h-5' />}
                        </button>
                    </div>
                </div>
            </PageHeader>

            {/* Board Info */}
            <div className='p-4 border-b border-gray-700'>
                <div className="w-full h-48 relative mb-4 group">
                    <img
                        src={
                            coverPreview
                            ? coverPreview
                            : board.coverPhoto
                            ? board.coverPhoto.replace(/([^:]\/)\/+/g, "$1")
                            : '/cover.png'
                        }
                        alt={`${board.name} cover`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            console.log('Image load error, using fallback');
                            e.target.onerror = null;
                            e.target.src = '/cover.png';
                        }}
                    />
                    {(board.creator === authUser?._id || board.admins?.includes(authUser?._id)) && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <label htmlFor="coverPhotoInput" className="cursor-pointer bg-black bg-opacity-50 hover:bg-opacity-75 p-2 rounded-full text-white">
                                <FaCamera className="w-5 h-5" />
                            </label>
                            <input
                                id="coverPhotoInput"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleCoverPhotoChange}
                            />
                        </div>
                    )}
                </div>
                <div className='flex items-center gap-4'>
                    {board.image && (
                        <img
                            src={board.image}
                            alt={board.name}
                            className='w-16 h-16 rounded-lg object-cover'
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://via.placeholder.com/64?text=Board';
                            }}
                        />
                    )}
                    <div className='flex-1'>
                        <div className='flex gap-4 text-sm text-gray-500'>
                            <div className='flex items-center gap-1'>
                                <FaUsers className='w-4 h-4' />
                                <span>{board.followers?.length || 0} members</span>
                            </div>
                            <div className='flex items-center gap-1'>
                                <FaComments className='w-4 h-4' />
                                <span>{board.posts?.length || 0} posts</span>
                            </div>
                            <div className='flex items-center gap-1'>
                                <FaBookmark className='w-4 h-4' />
                                <span>{threads?.length || 0} threads</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Latest Threads */}
            {threads && threads.length > 0 && (
                <div className='p-4 border-b border-gray-700'>
                    <h2 className='text-lg font-semibold mb-4'>Latest Threads</h2>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {threads.slice(0, 3).map((thread) => (
                            <div key={thread._id} className='bg-[#1e1e1e] rounded-lg p-4 hover:bg-[#2a2a2a] transition-colors'>
                                <h3 className='font-semibold mb-2'>{thread.title}</h3>
                                <p className='text-sm text-gray-400 mb-2 line-clamp-2'>{thread.content}</p>
                                <div className='flex items-center justify-between text-sm text-gray-500'>
                                    <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
                                    <span>{thread.replies?.length || 0} replies</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Posts */}
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4'}>
                {board.posts?.map((post) => (
                    <div key={post._id} className={viewMode === 'grid' ? 'bg-[#1e1e1e] rounded-lg overflow-hidden' : ''}>
                        <Post post={post} isCompact={viewMode === 'grid'} />
                    </div>
                ))}
                {(!board.posts || board.posts.length === 0) && (
                    <div className='text-center text-gray-500 py-8'>
                        No posts in this board yet
                    </div>
                )}
            </div>

            {/* Post Popup */}
            {showPostPopup && (
                <PostPopup
                    onClose={() => setShowPostPopup(false)}
                    boardId={board._id}
                    onSuccess={handlePostSuccess}
                />
            )}
        </div>
    );
};

export default BoardDetailPage; 