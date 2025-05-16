import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaList, FaTh, FaImage, FaVideo } from "react-icons/fa";
import { useState } from "react";
import Post from "../../components/common/Post";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PageHeader from "../../components/common/PageHeader";

const MediaPage = ({ username }) => {
    const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
    const [selectedPost, setSelectedPost] = useState(null);
    const [mediaType, setMediaType] = useState("images"); // "images" or "videos"

    const { data: posts, isLoading } = useQuery({
        queryKey: ["posts", username],
        queryFn: async () => {
            const res = await fetch(`/api/posts/user/${username}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Something went wrong");
            return data;
        },
    });

    const imagePosts = posts?.filter(post => post.img) || [];
    const videoPosts = posts?.filter(post => post.videoUrl && post.videoUrl.includes('youtube.com')) || [];

    if (isLoading) return <LoadingSpinner />;

    const currentPosts = mediaType === "images" ? imagePosts : videoPosts;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <PageHeader>
                <div className="flex items-center gap-4">
                    <Link to={`/profile/${username}`} className="text-gray-400 hover:text-white">
                        <FaArrowLeft size={20} />
                    </Link>
                    <div>
                        <h2 className="text-xl font-bold">Media</h2>
                        <p className="text-gray-400">
                            {mediaType === "images" 
                                ? `${imagePosts.length} images` 
                                : `${videoPosts.length} videos`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setMediaType("images")}
                        className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                            mediaType === "images" ? "text-blue-500" : "text-gray-500"
                        }`}
                        title="Images"
                    >
                        <FaImage className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setMediaType("videos")}
                        className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                            mediaType === "videos" ? "text-blue-500" : "text-gray-500"
                        }`}
                        title="Videos"
                    >
                        <FaVideo className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
                        className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                            viewMode === "list" ? "text-blue-500" : "text-gray-500"
                        }`}
                        title={`Switch to ${viewMode === "list" ? "grid" : "list"} view`}
                    >
                        {viewMode === "list" ? <FaTh className="w-4 h-4" /> : <FaList className="w-4 h-4" />}
                    </button>
                </div>
            </PageHeader>

            {/* Content */}
            {currentPosts.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-400">
                        {mediaType === "images" 
                            ? "No images uploaded yet" 
                            : "No videos uploaded yet"}
                    </p>
                </div>
            ) : (
                <div className={`flex-1 p-4 ${
                    viewMode === "grid" 
                        ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" 
                        : "flex flex-col gap-4"
                }`}>
                    {currentPosts.map((post) => (
                        <div
                            key={post._id}
                            className={`${
                                viewMode === "grid" 
                                    ? "h-[200px] relative bg-[#1e1e1e] rounded-lg overflow-hidden hover:bg-[#2a2a2a] transition-colors cursor-pointer" 
                                    : ""
                            }`}
                            onClick={() => setSelectedPost(post)}
                        >
                            <Post post={post} isCompact={viewMode === "grid"} />
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {selectedPost && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#1e1e1e] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold">Post</h3>
                            <button
                                onClick={() => setSelectedPost(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4">
                            <Post post={selectedPost} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaPage; 