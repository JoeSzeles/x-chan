import { FaRegComment } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { FaRegHeart } from "react-icons/fa";
import { FaRegBookmark } from "react-icons/fa6";
import { FaTrash } from "react-icons/fa";
import { FaShare } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa";
import { FaFeather } from "react-icons/fa";
import { FaDownload } from "react-icons/fa";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { formatDistanceToNow } from 'date-fns';

import LoadingSpinner from "./LoadingSpinner";
import StarRating from "./StarRating";
import { formatPostDate } from "../../utils/date";
import Comment from "./Comment";
import PostPopup from "./PostPopup";
import PostNumberHeader from './PostNumberHeader';
import { formatPostNumber } from '../../utils/postNumberUtils';
import QuoteText from './QuoteText';
import usePostNumberNavigation from '../../hooks/usePostNumberNavigation';
import CachedImage from './CachedImage';
import RepostButton from './RepostButton';



const Post = ({ post, isComment = false, isCompact = false }) => {
	const postRef = useRef(null);
	const [quotedBy, setQuotedBy] = useState([]);
	const [showPreview, setShowPreview] = useState(false);
	const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
	const [isImageExpanded, setIsImageExpanded] = useState(false);
	const [isVideoExpanded, setIsVideoExpanded] = useState(false);

	// Fetch quote references
	useEffect(() => {
		const fetchQuoteReferences = async () => {
			try {
				const res = await fetch(`/api/posts/${post._id}/quotes`);
				const data = await res.json();
				if (res.ok) {
					setQuotedBy(data.quotes || []);
				}
			} catch (error) {
				console.error("Error fetching quote references:", error);
			}
		};

		if (post?._id) {
			fetchQuoteReferences();
		}
	}, [post?._id]);

	// Early return if post or post.user is undefined
	if (!post || !post.user) {
		return (
			<div className='flex gap-2 items-start p-4 rounded-lg bg-[#1e1e1e] mb-4'>
				<div className='flex flex-col flex-1 bg-[#272525] rounded-lg p-4'>
					<div className='text-gray-500'>This post is no longer available</div>
				</div>
			</div>
		);
	}

	const [showComments, setShowComments] = useState(false);
	const [showCommentPopup, setShowCommentPopup] = useState(false);
	const [localLikes, setLocalLikes] = useState(post.likes || []);
	const [localReposts, setLocalReposts] = useState(post.reposts || []);
	const [localBookmarks, setLocalBookmarks] = useState(post.bookmarkedBy || []);
	const { data: authUser } = useQuery({ queryKey: ["authUser"] });
	const queryClient = useQueryClient();
	const postOwner = post.user;
	const isLiked = localLikes?.includes(authUser?._id);
	const isReposted = localReposts?.includes(authUser?._id);
	const isBookmarked = localBookmarks?.includes(authUser?._id);
	const location = useLocation();
	const isPostPage = location.pathname.includes("/post/");
	const navigate = useNavigate();
	const { handlePostNumberClick } = usePostNumberNavigation();

	const isMyPost = authUser?._id === post.user._id;

	const formattedDate = formatPostDate(post.createdAt);

	// Format the post number
	const formattedPostNumber = formatPostNumber(post.postNumber);

	// Track view count
	useEffect(() => {
		const trackView = async () => {
			try {
				await fetch(`/api/posts/${post._id}/view`, {
					method: "POST",
				});
				// Update the local cache with the new view count
				queryClient.setQueryData(["posts"], (oldData) => {
					if (!oldData) return oldData;
					return oldData.map((p) => {
						if (p._id === post._id) {
							return { ...p, viewCount: (p.viewCount || 0) + 1 };
						}
						return p;
					});
				});
			} catch (error) {
				console.error("Error tracking view:", error);
			}
		};

		trackView();
	}, [post._id, queryClient]);

	const { mutate: deletePost, isPending: isDeleting } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/posts/${post._id}`, {
					method: "DELETE",
				});
				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: () => {
			toast.success("Post deleted successfully");
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
	});

	const { mutate: likePost, isPending: isLiking } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/posts/like/${post._id}`, {
					method: "POST",
					credentials: "include"
				});
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: (updatedLikes) => {
			setLocalLikes(updatedLikes);
			queryClient.setQueryData(["posts"], (oldData) => {
				if (!oldData) return oldData;
				return oldData.map((p) => {
					if (p._id === post._id) {
						return { ...p, likes: updatedLikes };
					}
					return p;
				});
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const { mutate: commentPost, isPending: isCommenting } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/comments/${post._id}`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ text: comment }),
				});
				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: () => {
			toast.success("Comment posted successfully");
			setComment("");
			setShowCommentPopup(false);
			queryClient.invalidateQueries({ queryKey: ["comments", post._id] });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const { mutate: repostPost, isPending: isReposting } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/posts/repost/${post._id}`, {
					method: "POST",
					credentials: "include"
				});
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: (updatedReposts) => {
			setLocalReposts(updatedReposts);
			queryClient.setQueryData(["posts"], (oldData) => {
				if (!oldData) return oldData;
				return oldData.map((p) => {
					if (p._id === post._id) {
						return { ...p, reposts: updatedReposts };
					}
					return p;
				});
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const { mutate: bookmarkPost, isPending: isBookmarking } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/posts/bookmark/${post._id}`, {
					method: "POST",
					credentials: "include"
				});
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: (updatedBookmarks) => {
			setLocalBookmarks(updatedBookmarks);
			queryClient.setQueryData(["posts"], (oldData) => {
				if (!oldData) return oldData;
				return oldData.map((p) => {
					if (p._id === post._id) {
						return { ...p, bookmarkedBy: updatedBookmarks };
					}
					return p;
				});
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const { data: comments, isLoading: commentsLoading } = useQuery({
		queryKey: ["comments", post._id],
		queryFn: async () => {
			try {
				const res = await fetch(`/api/comments/${post._id}`);
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
	});

	// Update comment count when comments change
	useEffect(() => {
		if (comments) {
			queryClient.setQueryData(["posts"], (oldData) => {
				if (!oldData) return oldData;
				return oldData.map((p) => {
					if (p._id === post._id) {
						return { ...p, comments: comments };
					}
					return p;
				});
			});
		}
	}, [comments, post._id, queryClient]);

	const handleDeletePost = () => {
		deletePost();
	};

	const handlePostComment = (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (isCommenting) return;
		commentPost();
	};

	const handleLikePost = (e) => {
		if (e) e.stopPropagation();
		if (isLiking) return;
		likePost();
	};

	const handleRepost = (e) => {
		if (e) e.stopPropagation();
		if (isReposting) return;
		repostPost();
	};

	const handleBookmark = (e) => {
		if (e) e.stopPropagation();
		if (isBookmarking) return;
		bookmarkPost();
	};

	const handleCommentClick = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setShowCommentPopup(true);
	};

	const handleViewClick = (e) => {
		e.preventDefault();
		e.stopPropagation();
		navigate(`/post/${post._id}`, {
			replace: true,
			state: {
				from: window.location.pathname,
				scrollPosition: window.scrollY
			}
		});
	};

	const handleQuoteClick = (postNumber) => {
		handlePostNumberClick(postNumber, post._id);
	};



	const handlePostNumberHover = (e) => {
		const rect = e.currentTarget.getBoundingClientRect();
		setPreviewPosition({
			x: rect.left,
			y: rect.bottom + window.scrollY
		});
		setShowPreview(true);
	};

	const handlePostNumberLeave = () => {
		setShowPreview(false);
	};

	const handleCompactPostNumberClick = (e) => {
		e.stopPropagation();
		navigate(`/post/${post._id}`);
	};

	const handleDownloadImage = async (e) => {
		e.stopPropagation();
		try {
			const response = await fetch(post.img);
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `image-${post._id}.jpg`; // You can customize the filename
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
			toast.success('Image downloaded successfully');
		} catch (error) {
			console.error('Error downloading image:', error);
			toast.error('Failed to download image');
		}
	};

	// YouTube helper functions removed

	return (
		<div className={`flex gap-2 items-start ${isCompact ? 'p-0 h-full' : 'p-4'} rounded-lg ${isCompact ? 'hover:bg-[#2a2a2a] transition-colors' : 'bg-[#1e1e1e] mb-4'}`}>
			<div className='flex flex-col flex-1 h-full'>
				{!isCompact && (
					<div className='flex items-center justify-between mb-3'>
						<div className="flex-1">
							<PostNumberHeader
								post={post}
								onQuoteClick={handleQuoteClick}
								quotedBy={quotedBy}
							/>
						</div>
						{isMyPost && (
							<button
								onClick={handleDeletePost}
								className='hover:text-red-500 p-2 rounded-full hover:bg-[#272727] transition ml-2'
								disabled={isDeleting}
							>
								{isDeleting ? <LoadingSpinner /> : <FaTrash />}
							</button>
						)}
					</div>
				)}

				<div className='flex gap-2'>
					{!isCompact && (
						<div className='avatar relative flex flex-col items-center'>
							<div className="w-12 h-12 relative z-10 rounded-full bg-[#1e1e1e] p-0.5">
								<Link 
									to={`/profile/${post.user.username}`} 
									className='w-full h-full rounded-full overflow-hidden flex items-center justify-center border-2 border-gray-700' 
									onClick={(e) => e.stopPropagation()}
								>
									<img 
										src={post.user.profileImg || "/avatar-placeholder.png"} 
										className="w-full h-full object-cover" 
										alt="Profile"
										onError={(e) => {
											e.target.src = "/avatar-placeholder.png";
										}}
									/>
								</Link>
							</div>
						</div>
					)}

					<div className={`flex flex-col flex-1 ${isCompact ? 'bg-transparent' : 'bg-[#272525]'} rounded-lg ${isCompact ? '' : 'p-4'}`}>
						{!isCompact && (
							<div className='flex gap-2 items-center pb-3'>
								<Link 
									to={`/profile/${post.user.username}`} 
									className='font-bold hover:underline' 
									onClick={(e) => e.stopPropagation()}
								>
									{post.user.fullName}
								</Link>
								<span className='text-gray-700 flex gap-1 text-sm'>
									<Link 
										to={`/profile/${post.user.username}`} 
										onClick={(e) => e.stopPropagation()}
										className="hover:underline"
									>
										@{post.user.username}
									</Link>
									{post.user.location?.countryCode && (
										<span className="ml-1">
											<img 
												src={`https://flagcdn.com/w20/${post.user.location.countryCode.toLowerCase()}.png`}
												alt={`${post.user.location.countryCode} flag`}
												className="inline-block w-4 h-3 rounded-sm"
												onError={(e) => {
													e.target.style.display = 'none';
												}}
											/>
										</span>
									)}
								</span>
								<span className="text-gray-500 ml-2">
									<span className="text-red-500 font-bold">{post.title || "No title"}</span>
								</span>
								<div className='flex-1 flex justify-end star-rating' onClick={(e) => e.stopPropagation()}>
									<StarRating post={post} currentUser={authUser} />
								</div>
							</div>
						)}

						<div className={`flex flex-col gap-3 overflow-hidden ${isCompact ? 'h-full relative' : 'py-3'}`}>
							{isCompact && (
								<div className='flex flex-col gap-1 bg-black/30 backdrop-blur-sm p-2 rounded-t-lg absolute top-0 left-0 right-0 z-10'>
									<div className='flex items-center justify-between'>
										<div className='flex items-center gap-2'>
											<img 
												src={post.user.profileImg || "/avatar-placeholder.png"} 
												className="w-6 h-6 rounded-full" 
												alt="Profile"
											/>
											<div className='flex flex-col'>
												<div className='flex items-center gap-1'>
													<span className='text-sm font-medium'>{post.user.fullName}</span>
													{post.user.location?.countryCode && (
														<img 
															src={`https://flagcdn.com/w20/${post.user.location.countryCode.toLowerCase()}.png`}
															alt={`${post.user.location.countryCode} flag`}
															className="inline-block w-4 h-3 rounded-sm"
															onError={(e) => {
																e.target.style.display = 'none';
															}}
														/>
													)}
												</div>
												<span className='text-xs text-gray-400'>@{post.user.username}</span>
											</div>
											<span className="text-gray-500 text-sm">
												<span className="text-red-500 font-bold">{post.title || "No title"}</span>
											</span>
										</div>
										<div className='flex gap-2 items-center'>
											<div className='star-rating' onClick={(e) => e.stopPropagation()}>
												<StarRating post={post} currentUser={authUser} />
											</div>
											<div 
												className='flex gap-1 items-center group cursor-pointer like-button' 
												onClick={(e) => {
													e.stopPropagation();
													handleLikePost();
												}}
											>
												{isLiking && <LoadingSpinner size='sm' />}
												{!isLiked && !isLiking && (
													<FaRegHeart className='w-4 h-4 cursor-pointer text-slate-500 group-hover:text-pink-500' />
												)}
												{isLiked && !isLiking && (
													<FaRegHeart className='w-4 h-4 cursor-pointer text-pink-500' />
												)}
												<span className={`text-sm group-hover:text-pink-500 ${isLiked ? "text-pink-500" : "text-slate-500"}`}>
													{post.likes.length}
												</span>
											</div>
											<div 
												className='flex gap-1 items-center group cursor-pointer repost-button' 
											>
												<RepostButton
													itemId={post._id}
													type="post"
													repostCount={post.reposts?.length || 0}
													isReposted={post.reposts?.includes(authUser?._id)}
													onRepost={(data) => {
														// Update local state
														setLocalReposts(data.reposts || []);
													}}
													userData={authUser}
												/>
											</div>
											<div 
												className='flex gap-1 items-center group cursor-pointer bookmark-button' 
												onClick={handleBookmark}
											>
												{isBookmarking && <LoadingSpinner size='sm' />}
												{!isBookmarked && !isBookmarking && (
													<FaRegBookmark className='w-4 h-4 text-slate-500 group-hover:text-blue-500' />
												)}
												{isBookmarked && !isBookmarking && (
													<FaRegBookmark className='w-4 h-4 text-blue-500' />
												)}
												<span className={`text-sm group-hover:text-blue-500 ${isBookmarked ? "text-blue-500" : "text-slate-500"}`}>
													{post.bookmarkedBy?.length || 0}
												</span>
											</div>
										</div>
									</div>
									<div 
										className='text-xs text-blue-400 font-mono cursor-pointer hover:text-blue-300 transition-colors'
										onMouseEnter={handlePostNumberHover}
										onMouseLeave={handlePostNumberLeave}
										onClick={handleCompactPostNumberClick}
									>
										No.{post.postNumber.toString().padStart(10, '0')}
									</div>
								</div>
							)}
							<div className={`${isCompact ? 'text-sm line-clamp-2' : ''}`}>
								<QuoteText text={post.text} onQuoteClick={handleQuoteClick} />
							</div>
							<div className="relative h-full">
								{post.img && (
									<div className="relative">
									<CachedImage
										src={post.img}
											className={`${isCompact ? 'h-full w-full object-cover' : isImageExpanded ? 'w-full h-auto max-h-none' : 'h-80 object-contain'} rounded-lg transition-all duration-300`}
										alt=""
									/>
										{!isCompact && (
											<button
												onClick={() => setIsImageExpanded(!isImageExpanded)}
												className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white px-2 py-1 rounded text-sm backdrop-blur-sm transition-colors"
											>
												{isImageExpanded ? 'Show Less' : 'Show Full'}
											</button>
										)}
									</div>
								)}

								{isCompact && (
									<div className='absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-2 rounded-b-lg flex justify-between items-center z-20'>
										<div className='flex gap-2 items-center'>
											<button
												type="button"
												className='flex gap-1 items-center cursor-pointer group comment-button hover:text-sky-400'
												onClick={handleCommentClick}
											>
												<FaRegComment className='w-4 h-4 text-slate-500 group-hover:text-sky-400' />
												<span className='text-sm text-slate-500 group-hover:text-sky-400'>
													{comments?.length || 0}
												</span>
											</button>
											<button
												onClick={handleViewClick}
												className='flex items-center gap-1 text-slate-500 hover:text-sky-400'
											>
												<FaRegEye className='w-4 h-4' />
												<span className='text-sm'>View</span>
											</button>
											<div 
												className='flex gap-1 items-center group cursor-pointer view-button'
											>
												<FaRegEye className='w-4 h-4 text-slate-500' />
												<span className='text-sm text-slate-500'>
													{post.viewCount || 0}
												</span>
											</div>
											<div 
												className='flex gap-1 items-center group cursor-pointer download-button' 
												onClick={handleDownloadImage}
												title="Download full resolution image"
											>
												<FaDownload className='w-4 h-4 text-slate-500 group-hover:text-green-500' />
											</div>
											<div 
												className='flex gap-1 items-center group cursor-pointer share-button' 
												onClick={(e) => {
													e.stopPropagation();
													const shareLink = `${window.location.origin}/post/${post._id}`;
													navigator.clipboard.writeText(shareLink).then(() => {
														toast.success('Link copied to clipboard!');
													}).catch(() => {
														toast.error('Failed to copy link');
													});
												}}
											>
												<FaShare className='w-4 h-4 text-slate-500 group-hover:text-blue-500' />
											</div>
										</div>
										<button
											onClick={(e) => {
												e.stopPropagation();
												navigate(`/post/${post._id}`);
											}}
											className='px-3 py-1 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium'
										>
											View Thread
										</button>
									</div>
								)}
							</div>
						</div>

						{!isCompact && (
							<div className='flex justify-between mt-3 pt-3 border-t border-gray-700'>
								<div className='flex gap-4 items-center w-2/3 justify-between'>
									<div className="flex gap-2">
										<button
											type="button"
											className='flex gap-1 items-center cursor-pointer group comment-button hover:text-sky-400'
											onClick={handleCommentClick}
										>
											<FaRegComment className='w-4 h-4 text-slate-500 group-hover:text-sky-400' />
											<span className='text-sm text-slate-500 group-hover:text-sky-400'>
												{comments?.length || 0}
											</span>
										</button>
										{!isComment && (
											<button
												onClick={handleViewClick}
												className='flex items-center gap-1 text-slate-500 hover:text-sky-400'
											>
												<FaRegEye className='w-4 h-4' />
												<span className='text-sm'>View</span>
											</button>
										)}
									</div>
									<div 
										className='flex gap-1 items-center group cursor-pointer repost-button' 
									>
										<RepostButton
											itemId={post._id}
											type="post"
											repostCount={post.reposts?.length || 0}
											isReposted={post.reposts?.includes(authUser?._id)}
											onRepost={(data) => {
												// Update local state
												setLocalReposts(data.reposts || []);
											}}
											userData={authUser}
										/>
									</div>
									<div 
										className='flex gap-1 items-center group cursor-pointer view-button'
									>
										<FaRegEye className='w-4 h-4 text-slate-500' />
										<span className='text-sm text-slate-500'>
											{post.viewCount || 0}
										</span>
									</div>
									<div 
										className='flex gap-1 items-center group cursor-pointer like-button' 
										onClick={(e) => {
											e.stopPropagation();
											handleLikePost();
										}}
									>
										{isLiking && <LoadingSpinner size='sm' />}
										{!isLiked && !isLiking && (
											<FaRegHeart className='w-4 h-4 cursor-pointer text-slate-500 group-hover:text-pink-500' />
										)}
										{isLiked && !isLiking && (
											<FaRegHeart className='w-4 h-4 cursor-pointer text-pink-500 ' />
										)}
										<span className={`text-sm group-hover:text-pink-500 ${isLiked ? "text-pink-500" : "text-slate-500"}`}>
											{post.likes.length}
										</span>
									</div>
									<div 
										className='flex gap-1 items-center group cursor-pointer bookmark-button' 
										onClick={handleBookmark}
									>
										{isBookmarking && <LoadingSpinner size='sm' />}
										{!isBookmarked && !isBookmarking && (
											<FaRegBookmark className='w-4 h-4 text-slate-500 group-hover:text-blue-500' />
										)}
										{isBookmarked && !isBookmarking && (
											<FaRegBookmark className='w-4 h-4 text-blue-500' />
										)}
										<span className={`text-sm group-hover:text-blue-500 ${isBookmarked ? "text-blue-500" : "text-slate-500"}`}>
											{post.bookmarkedBy?.length || 0}
										</span>
									</div>
								</div>
								<div className='flex gap-2 items-center'>
									{post.img && (
										<div 
											className='flex gap-1 items-center group cursor-pointer download-button' 
											onClick={handleDownloadImage}
											title="Download full resolution image"
										>
											<FaDownload className='w-4 h-4 text-slate-500 group-hover:text-green-500' />
										</div>
									)}
									<div 
										className='flex gap-1 items-center group cursor-pointer share-button' 
										onClick={(e) => {
											e.stopPropagation();
											const shareLink = `${window.location.origin}/post/${post._id}`;
											navigator.clipboard.writeText(shareLink).then(() => {
												toast.success('Link copied to clipboard!');
											}).catch(() => {
												toast.error('Failed to copy link');
											});
										}}
									>
										<FaShare className='w-4 h-4 text-slate-500 group-hover:text-blue-500' />
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Post Preview Popup */}
			{showPreview && (
				<div 
					className="fixed z-50 bg-[#1e1e1e] rounded-lg shadow-lg border border-gray-700 max-w-md"
					style={{
						left: `${previewPosition.x}px`,
						top: `${previewPosition.y + 10}px`,
						transform: 'translateX(-50%)'
					}}
				>
					<div className="p-4">
						<div className="flex items-center gap-2 mb-2">
							<img 
								src={post.user.profileImg || "/avatar-placeholder.png"} 
								className="w-8 h-8 rounded-full" 
								alt="Profile"
							/>
							<div>
								<div className="font-bold">{post.user.fullName}</div>
								<div className="text-sm text-gray-500">@{post.user.username}</div>
							</div>
						</div>
						<div className="text-sm mb-2">{post.text}</div>
						{post.img && (
							<CachedImage
								src={post.img}
								className="max-h-40 rounded-lg object-cover"
								alt=""
							/>
						)}

					</div>
				</div>
			)}

			{/* PostPopup for comments */}
			{showCommentPopup && (
				<PostPopup
					onClose={() => setShowCommentPopup(false)}
					postId={post._id}
					isComment={true}
					postNumber={post.postNumber}
				/>
			)}
		</div>
	);
};

export default Post;