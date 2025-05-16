import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa6";
import { FaList, FaTh } from "react-icons/fa";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Post from "../components/common/Post";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import PageHeader from "../components/common/PageHeader";
import Breadcrumb from "../components/common/Breadcrumb";

const BookmarksPage = () => {
    const [viewMode, setViewMode] = useState("list"); // "list" or "grid"
    const [selectedPost, setSelectedPost] = useState(null);
    const navigate = useNavigate();

    // Check authentication on component mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch("/api/auth/me", {
                    credentials: 'include'
                });

                if (!res.ok) {
                    throw new Error('Not authenticated');
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('userData');
                toast.error('Please login to view bookmarks');
                navigate('/login', { state: { from: '/bookmarks' } });
            }
        };

        checkAuth();
    }, [navigate]);

    const { data: bookmarkedPosts, isLoading, error } = useQuery({
        queryKey: ["bookmarks"],
        queryFn: async () => {
            try {
                const res = await fetch("/api/bookmarks", {
                    credentials: 'include'
                });

                if (!res.ok) {
                    if (res.status === 401) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('userData');
                        navigate('/login', { state: { from: '/bookmarks' } });
                        throw new Error('Session expired. Please login again.');
                    }
                    const data = await res.json();
                    throw new Error(data.error || "Failed to fetch bookmarks");
                }

                const data = await res.json();
                if (!Array.isArray(data)) {
                    console.error('Invalid bookmarks data:', data);
                    throw new Error('Invalid bookmarks data received');
                }
                return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            } catch (error) {
                console.error('Error fetching bookmarks:', error);
                throw error;
            }
        },
        retry: false,
        enabled: true
    });

    const handlePostClick = (post) => {
        setSelectedPost(post);
    };

    const handleClosePost = () => {
        setSelectedPost(null);
    };

    // If not authenticated, show a message and login button
    if (error?.message === 'Not authenticated') {
        return (
            <div className='flex-[4_4_0] border-r border-gray-700 min-h-screen flex flex-col items-center justify-center'>
                <div className='text-center p-4'>
                    <h2 className='text-xl font-bold mb-4'>Please login to view your bookmarks</h2>
                    <Link 
                        to='/login' 
                        state={{ from: '/bookmarks' }}
                        className='bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors'
                    >
                        Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className='flex-[4_4_0] border-r border-gray-700 min-h-screen'>
            {/* Breadcrumb Navigation */}
            <Breadcrumb 
                items={[
                    { label: 'Bookmarks' }
                ]}
            />

            {/* Header */}
            <PageHeader>
                <div className='flex gap-10 items-center'>
                    <Link to='/'>
                        <FaArrowLeft className='w-4 h-4' />
                    </Link>
                    <div className='flex flex-col'>
                        <p className='font-bold text-lg'>Bookmarks</p>
                        <span className='text-sm text-slate-500'>@{bookmarkedPosts?.length || 0} posts</span>
                    </div>
                </div>
                <div className='flex gap-2'>
                    <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                            viewMode === "list" ? "text-blue-500" : "text-gray-500"
                        }`}
                        title="List View"
                    >
                        <FaList className='w-4 h-4' />
                    </button>
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                            viewMode === "grid" ? "text-blue-500" : "text-gray-500"
                        }`}
                        title="Grid View"
                    >
                        <FaTh className='w-4 h-4' />
                    </button>
                </div>
            </PageHeader>

            {/* Error State */}
            {error && (
                <div className='text-center p-4 text-red-500'>
                    {error.message}
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className='flex justify-center h-full items-center'>
                    <LoadingSpinner size='lg' />
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && bookmarkedPosts?.length === 0 && (
                <div className='text-center p-4 font-bold'>No bookmarked posts yet</div>
            )}

            {/* Bookmarked Posts */}
            {!isLoading && !error && bookmarkedPosts && (
                <div className={viewMode === "grid" ? "grid grid-cols-4 gap-2 p-2" : ""}>
                    {bookmarkedPosts.map((post) => (
                        <div 
                            key={post._id} 
                            className={viewMode === "grid" ? `relative bg-[#1e1e1e] rounded-lg overflow-hidden hover:bg-[#2a2a2a] transition-colors cursor-pointer h-[200px]` : ""}
                            onClick={() => viewMode === "grid" && handlePostClick(post)}
                        >
                            <Post 
                                post={post} 
                                isCompact={viewMode === "grid"}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Post Modal */}
            {selectedPost && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={handleClosePost}
                >
                    <div 
                        className="bg-[#1e1e1e] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={handleClosePost}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
                            aria-label="Close modal"
                        >
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-6 w-6" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M6 18L18 6M6 6l12 12" 
                                />
                            </svg>
                        </button>
                        <div className="p-4">
                            <Post post={selectedPost} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookmarksPage; 