import Post from "./Post";
import PostSkeleton from "../skeletons/PostSkeleton";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FaList, FaTh } from "react-icons/fa";

const Posts = ({ feedType, username, userId, isWideMode }) => {
	const [viewMode, setViewMode] = useState("list");
	const [selectedPost, setSelectedPost] = useState(null);

	const getPostEndpoint = () => {
		switch (feedType) {
			case "forYou":
				return "/api/posts/all";
			case "following":
				return "/api/posts/following";
			case "followers":
				return "/api/posts/followers";
			case "posts":
				return `/api/posts/user/${username}`;
			case "likes":
				return `/api/posts/likes/${userId}`;
			case "replies":
				return `/api/posts/replies/${userId}`;
			case "bookmarks":
				return `/api/posts/bookmarks/${userId}`;
			case "threads":
				return `/api/posts/threads/${userId}`;
			case "media":
				return `/api/posts/media/${userId}`;
			default:
				return "/api/posts/all";
		}
	};

	const POST_ENDPOINT = getPostEndpoint();

	const {
		data: posts,
		isLoading,
		refetch,
		isRefetching,
		error
	} = useQuery({
		queryKey: ["posts", feedType, username],
		queryFn: async () => {
			try {
				const res = await fetch(POST_ENDPOINT);
				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}

				// Filter out posts with missing required fields and ensure originalPost data is present
				return data.filter(post => {
					if (!post || !post.user) return false;
					if (post.isRepost && (!post.originalPost || !post.originalPost.user)) return false;
					return true;
				});
			} catch (error) {
				throw new Error(error);
			}
		},
		// Add caching configuration
		staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
		cacheTime: 30 * 60 * 1000, // Keep data in cache for 30 minutes
		refetchOnWindowFocus: false, // Don't refetch when window regains focus
		refetchOnMount: false, // Don't refetch when component mounts
		refetchOnReconnect: false, // Don't refetch when reconnecting
		keepPreviousData: true, // Keep previous data while fetching new data
	});

	// Only refetch when feedType or username changes
	useEffect(() => {
		if (feedType || username) {
			refetch();
		}
	}, [feedType, username, refetch]);

	const handlePostClick = (post) => {
		setSelectedPost(post);
	};

	const handleClosePost = () => {
		setSelectedPost(null);
	};

	if (error) {
		return (
			<div className="text-center my-4 text-red-500">
				Error loading posts. Please try again later.
			</div>
		);
	}

	return (
		<>
			{/* View Toggle Buttons */}
			<div className='flex justify-end gap-2 p-2 border-b border-gray-700'>
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

			{(isLoading || isRefetching) && (
				<div className='flex flex-col justify-center'>
					<PostSkeleton />
					<PostSkeleton />
					<PostSkeleton />
				</div>
			)}
			{!isLoading && !isRefetching && (!posts || posts.length === 0) && (
				<p className='text-center my-4'>No {feedType} to show. Switch 👻</p>
			)}
			{!isLoading && !isRefetching && posts && (
				<div className={viewMode === "grid" ? "grid grid-cols-4 gap-2 p-2" : ""}>
					{posts.map((post) => (
						<div 
							key={post._id} 
							className={viewMode === "grid" ? `relative bg-[#1e1e1e] rounded-lg overflow-hidden hover:bg-[#2a2a2a] transition-colors cursor-pointer ${isWideMode ? 'h-[300px]' : 'h-[200px]'}` : ""}
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
		</>
	);
};

export default Posts;