import { FaRegComment } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { FaRegHeart } from "react-icons/fa";
import { FaRegBookmark } from "react-icons/fa6";
import { FaTrash } from "react-icons/fa";
import { FaShare } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa";
import { FaFeather } from "react-icons/fa";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { formatDistanceToNow } from 'date-fns';

import LoadingSpinner from "./LoadingSpinner";
import StarRating from "./StarRating";
import { formatPostDate } from "../../utils/date";
import PostPopup from "./PostPopup";
import PostNumberHeader from './PostNumberHeader';
import { formatPostNumber } from '../../utils/postNumberUtils';
import QuoteText from './QuoteText';
import CachedImage from './CachedImage';
import usePostNumberNavigation from '../../hooks/usePostNumberNavigation';
import RepostButton from './RepostButton';

// New PopupInput component
const PopupInput = ({ onSubmit, onClose, placeholder = "Write a reply..." }) => {
	const [text, setText] = useState("");
	const inputRef = useRef(null);

	useEffect(() => {
		// Focus input when popup opens
		if (inputRef.current) {
			inputRef.current.focus();
		}
	}, []);

	const handleSubmit = (e) => {
		e.preventDefault();
		if (text.trim()) {
			onSubmit(text);
			setText("");
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-[#1e1e1e] rounded-lg p-4 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
				<div className="flex justify-between items-center mb-4">
					<h3 className="text-lg font-semibold">Add a reply</h3>
					<button onClick={onClose} className="text-gray-400 hover:text-white">
						×
					</button>
				</div>
				<form onSubmit={handleSubmit}>
					<textarea
						ref={inputRef}
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder={placeholder}
						className="w-full p-3 rounded-lg bg-[#272525] border border-gray-700 focus:border-blue-500 focus:outline-none resize-none"
						rows={4}
					/>
					<div className="flex justify-end gap-2 mt-4">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={!text.trim()}
							className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
						>
							Reply
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

const Comment = ({ comment, postId, parentCommentId = null, disableNavigation = false, isCompact = false }) => {
	const [showReplies, setShowReplies] = useState(false);
	const [showReplyInput, setShowReplyInput] = useState(false);
	const [connectorHeight, setConnectorHeight] = useState(0);
	const commentRef = useRef(null);
	const { data: authUser } = useQuery({ queryKey: ["authUser"] });
	const queryClient = useQueryClient();
	const { handlePostNumberClick } = usePostNumberNavigation();
	const [quotedBy, setQuotedBy] = useState([]);
	const [showPreview, setShowPreview] = useState(false);
	const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
	const [localLikes, setLocalLikes] = useState(comment.likes || []);
	const [localReposts, setLocalReposts] = useState(comment.reposts || []);
	const [localBookmarks, setLocalBookmarks] = useState(comment.bookmarkedBy || []);
	const location = useLocation();
	const isPostPage = location.pathname.includes("/post/");
	const navigate = useNavigate();

	// Add debug logging to check comment structure
	useEffect(() => {
		console.log("Comment received:", comment);
		if (!comment.user || typeof comment.user === 'string') {
			console.error("User data is missing or unpopulated:", comment);
		}
	}, [comment]);
	
	// Safely access user data with defensive code
	const commentOwner = typeof comment.user === 'object' ? comment.user : { username: 'unknown', fullName: 'Unknown User' };
	const isLiked = localLikes?.includes(authUser?._id);
	const isReposted = localReposts?.includes(authUser?._id);
	const isBookmarked = localBookmarks?.includes(authUser?._id);
	const isMyComment = authUser?._id === (typeof comment.user === 'object' ? comment.user._id : comment.user);

	const formattedDate = formatPostDate(comment.createdAt);

	// Track view count
	useEffect(() => {
		const trackView = async () => {
			try {
				await fetch(`/api/comments/${comment._id}/view`, {
					method: "POST",
				});
				// Update the local cache with the new view count
				queryClient.setQueryData(["comments", postId], (oldData) => {
					if (!oldData) return oldData;
					return oldData.map((c) => {
						if (c._id === comment._id) {
							return { ...c, viewCount: (c.viewCount || 0) + 1 };
						}
						return c;
					});
				});
			} catch (error) {
				console.error("Error tracking view:", error);
			}
		};

		trackView();
	}, [comment._id, queryClient, postId]);

	// Add a debug check for the user data when rendering
	useEffect(() => {
		if (!comment.user) {
			console.error("Missing user data in comment:", comment);
		}
	}, [comment]);

	const { mutate: deleteComment, isPending: isDeleting } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/comments/${comment._id}`, {
					method: "DELETE",
					credentials: "include",
				});
				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				console.error("Error deleting comment:", error);
				throw new Error(error.message || "Error deleting comment");
			}
		},
		onSuccess: () => {
			toast.success("Comment deleted successfully");
			queryClient.invalidateQueries({ queryKey: ["comments", postId] });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete comment");
		},
	});

	const { mutate: likeComment, isPending: isLiking } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/comments/like/${comment._id}`, {
					method: "POST",
					credentials: "include",
					headers: {
						"Authorization": `Bearer ${localStorage.getItem("token")}`
					}
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
			queryClient.setQueryData(["comments"], (oldData) => {
				if (!oldData) return oldData;
				return oldData.map((c) => {
					if (c._id === comment._id) {
						return { ...c, likes: updatedLikes };
					}
					return c;
				});
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const { mutate: replyToComment, isPending: isReplying } = useMutation({
		mutationFn: async (replyText) => {
			try {
				const res = await fetch(`/api/comments/${postId}`, {
					method: "POST",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${localStorage.getItem("token")}`
					},
					body: JSON.stringify({ 
						text: replyText,
						parentComment: comment._id 
					}),
				});
				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				console.error("Error posting reply:", error);
				throw new Error(error.message || "Failed to post reply");
			}
		},
		onSuccess: () => {
			toast.success("Reply posted successfully");
			setShowReplyInput(false);
			queryClient.invalidateQueries({ queryKey: ["comments", postId] });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to post reply");
		},
	});

	const { mutate: repostComment, isPending: isReposting } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/comments/repost/${comment._id}`, {
					method: "POST",
					credentials: "include",
					headers: {
						"Authorization": `Bearer ${localStorage.getItem("token")}`
					}
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
			queryClient.setQueryData(["comments"], (oldData) => {
				if (!oldData) return oldData;
				return oldData.map((c) => {
					if (c._id === comment._id) {
						return { ...c, reposts: updatedReposts };
					}
					return c;
				});
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const { mutate: bookmarkComment, isPending: isBookmarking } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/comments/bookmark/${comment._id}`, {
					method: "POST",
					credentials: "include",
					headers: {
						"Authorization": `Bearer ${localStorage.getItem("token")}`
					}
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
			queryClient.setQueryData(["comments"], (oldData) => {
				if (!oldData) return oldData;
				return oldData.map((c) => {
					if (c._id === comment._id) {
						return { ...c, bookmarkedBy: updatedBookmarks };
					}
					return c;
				});
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	// Add rating mutation
	const { mutate: rateComment, isPending: isRating } = useMutation({
		mutationFn: async (rating) => {
			try {
				const res = await fetch(`/api/comments/rate/${comment._id}`, {
					method: "POST",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${localStorage.getItem("token")}`
					},
					body: JSON.stringify({ rating })
				});
				
				const data = await res.json();
				
				if (!res.ok) {
					throw new Error(data.error || "Failed to rate comment");
				}
				
				return data;
			} catch (error) {
				console.error("Error rating comment:", error);
				throw new Error(error.message || "Error rating comment");
			}
		},
		onSuccess: (data) => {
			// Update both the comments list and individual comment cache
			queryClient.setQueryData(["comments", postId], (oldData) => {
				if (!oldData) return oldData;
				
				// Function to update ratings in a comment or its replies
				const updateRatingsInComment = (comments) => {
					return comments.map((c) => {
						if (c._id === comment._id) {
							return { ...c, ratings: data.ratings || [] };
						}
						if (c.replies && c.replies.length > 0) {
							return {
								...c,
								replies: updateRatingsInComment(c.replies)
							};
						}
						return c;
					});
				};

				return updateRatingsInComment(oldData);
			});

			// Update individual comment cache if it exists
			queryClient.setQueryData(["comment", comment._id], (oldData) => {
				if (!oldData) return oldData;
				return { ...oldData, ratings: data.ratings || [] };
			});

			toast.success(data.message || "Rating updated successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update rating");
		},
	});

	const handleDeleteComment = (e) => {
		if (e) e.stopPropagation();
		deleteComment();
	};

	const handleCommentClick = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setShowReplyInput(true);
	};

	const handleViewClick = (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (!disableNavigation) {
			navigate(`/post/${postId}/comment/${comment._id}`, { 
				replace: true,
				state: { 
					from: window.location.pathname,
					scrollPosition: window.scrollY
				}
			});
		}
	};

	const handleReplyClick = (e) => {
		e.stopPropagation();
		setShowReplyInput(true);
	};

	const handleReplySubmit = (replyText) => {
		replyToComment(replyText);
	};

	const handleLikeComment = (e) => {
		if (e) e.stopPropagation();
		if (isLiking) return;
		likeComment();
	};

	const handleRepost = (e) => {
		if (e) e.stopPropagation();
		if (isReposting) return;
		repostComment();
	};

	const handleBookmark = (e) => {
		if (e) e.stopPropagation();
		if (isBookmarking) return;
		bookmarkComment();
	};

	// Calculate connector height when component mounts or updates
	useEffect(() => {
		if (commentRef.current && parentCommentId) {
			const cardHeight = commentRef.current.offsetHeight;
			// Add some extra space for padding/margin
			setConnectorHeight(cardHeight + 16);
		}
	}, [parentCommentId, showReplies, comment.replies?.length]);

	// Format the comment number
	const formattedCommentNumber = formatPostNumber(comment.postNumber);

	const handleQuoteClick = (postNumber) => {
		handlePostNumberClick(postNumber, postId);
	};

	// Fetch quote references
	useEffect(() => {
		const fetchQuoteReferences = async () => {
			try {
				const res = await fetch(`/api/comments/${comment._id}/quotes`);
				const data = await res.json();
				if (res.ok) {
					setQuotedBy(data.quotes || []);
				}
			} catch (error) {
				console.error("Error fetching quote references:", error);
			}
		};

		if (comment?._id) {
			fetchQuoteReferences();
		}
	}, [comment?._id]);

	return (
		<div className='flex gap-2 items-start p-4 rounded-lg bg-[#1e1e1e] mb-4 relative' ref={commentRef} onClick={(e) => e.stopPropagation()} data-post-number={comment.postNumber}>
			<div className='flex flex-col flex-1'>
				{/* Post Number Header */}
				<PostNumberHeader
					post={comment}
					onQuoteClick={handleQuoteClick}
					quotedBy={quotedBy}
					className="mb-2"
				/>

				<div className='flex gap-2'>
			<div className='avatar relative flex flex-col items-center'>
				{/* Current Commenter's Profile Picture */}
				<div className="w-12 h-12 relative z-10 rounded-full bg-[#1e1e1e] p-0.5">
					<Link 
						to={`/profile/${commentOwner.username || 'unknown'}`} 
						className='w-full h-full rounded-full overflow-hidden flex items-center justify-center border-2 border-gray-700' 
						onClick={(e) => e.stopPropagation()}
					>
						<CachedImage 
							src={commentOwner.profileImg}
							className="w-full h-full object-cover" 
							alt="Profile"
						/>
					</Link>
				</div>

				{/* Connecting Line with Arrow */}
				{comment.post && comment.post.user && (
					<div className="w-0.5 h-[100px] bg-gray-700 relative">
						<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-transparent border-b-gray-700"></div>
					</div>
				)}

				{/* Post Author's Profile Picture */}
				{comment.post && comment.post.user && (
					<div className="w-10 h-10 relative z-10 rounded-full bg-[#1e1e1e] p-0.5">
						<Link 
							to={`/profile/${comment.post.user.username}`} 
							className='w-full h-full rounded-full overflow-hidden flex items-center justify-center border-2 border-gray-700' 
							onClick={(e) => e.stopPropagation()}
						>
							<CachedImage 
								src={comment.post.user.profileImg}
								className="w-full h-full object-cover" 
								alt="Post Author"
							/>
						</Link>
					</div>
				)}
			</div>
			
			<div className={`flex flex-col flex-1 bg-[#272525] rounded-lg p-4 ${comment.post ? 'ml-1' : ''}`}>
				<div className='flex gap-2 items-center pb-3'>
					<Link 
						to={`/profile/${commentOwner.username || 'unknown'}`} 
						className='font-bold' 
						onClick={(e) => e.stopPropagation()}
					>
						{commentOwner.fullName || 'Unknown User'}
					</Link>
					<span className='text-gray-700 flex gap-1 text-sm'>
						<Link 
							to={`/profile/${commentOwner.username || 'unknown'}`} 
							onClick={(e) => e.stopPropagation()}
						>
							@{commentOwner.username || 'unknown'}
						</Link>
						<span>·</span>
						<span>{formattedDate}</span>
					</span>
					{comment.post && comment.post.user && (
						<span className='text-gray-500 text-sm'>
							replying to <Link 
								to={`/profile/${comment.post.user.username}`} 
								className='text-sky-400 hover:underline' 
								onClick={(e) => e.stopPropagation()}
							>
								@{comment.post.user.username}
							</Link>
						</span>
					)}
					{isMyComment && (
						<span className='flex justify-end flex-1'>
							{!isDeleting && (
								<FaTrash className='cursor-pointer hover:text-red-500 delete-button' onClick={(e) => {
									e.stopPropagation();
									handleDeleteComment(e);
								}} />
							)}
							{isDeleting && <LoadingSpinner size='sm' />}
						</span>
					)}
					<div className='flex-1 flex justify-end star-rating' onClick={(e) => e.stopPropagation()}>
						<StarRating post={comment} currentUser={authUser} isComment={true} />
					</div>
				</div>

				<div className='flex flex-col gap-3 overflow-hidden py-3'>
							<div className='mt-2'>
								<QuoteText text={comment.text} onQuoteClick={handleQuoteClick} />
							</div>
					{comment.img && (
						<CachedImage
							src={comment.img}
							className='h-80 object-contain rounded-lg'
							alt=""
						/>
					)}
				</div>

				<div className='flex justify-between mt-3 pt-3'>
					<div className='flex gap-4 items-center w-2/3 justify-between'>
						<div className="flex gap-2">
							<button
								type="button"
								className='flex gap-1 items-center cursor-pointer group comment-button hover:text-sky-400'
								onClick={handleCommentClick}
							>
								<FaRegComment className='w-4 h-4 text-slate-500 group-hover:text-sky-400' />
								<span className='text-sm text-slate-500 group-hover:text-sky-400'>
									{comment.replies?.length || 0}
								</span>
							</button>
							{!disableNavigation && (
								<button
									type="button"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										navigate(`/post/${postId}/comment/${comment._id}`, { 
											replace: true,
											state: { 
												from: window.location.pathname,
												scrollPosition: window.scrollY
											}
										});
									}}
									className='flex items-center gap-1 text-slate-500 hover:text-sky-400'
								>
									<FaRegEye className='w-4 h-4' />
									<span className='text-sm'>View</span>
								</button>
							)}
						</div>
						<div className='flex gap-1 items-center group cursor-pointer repost-button'>
							<RepostButton
								itemId={comment._id}
								type="comment"
								repostCount={comment.reposts?.length || 0}
								isReposted={isReposted}
								onRepost={(data) => {
									// Update local state if needed
								}}
							/>
						</div>
						<div 
							className='flex gap-1 items-center group cursor-pointer view-button'
						>
							<FaRegEye className='w-4 h-4 text-slate-500' />
							<span className='text-sm text-slate-500'>
								{comment.viewCount || 0}
							</span>
						</div>
						<div 
							className='flex gap-1 items-center group cursor-pointer like-button' 
							onClick={(e) => {
								e.stopPropagation();
								handleLikeComment(e);
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
								{comment.likes.length}
							</span>
						</div>
					</div>
					<div className='flex w-1/3 justify-end gap-2 items-center'>
						<div 
							className='flex gap-1 items-center group cursor-pointer bookmark-button' 
							onClick={(e) => {
								e.stopPropagation();
								handleBookmark(e);
							}}
						>
							{isBookmarking && <LoadingSpinner size='sm' />}
							{!isBookmarked && !isBookmarking && (
								<FaRegBookmark className='w-4 h-4 text-slate-500 group-hover:text-blue-500' />
							)}
							{isBookmarked && !isBookmarking && (
								<FaRegBookmark className='w-4 h-4 text-blue-500' />
							)}
						</div>
						<div 
							className='flex gap-1 items-center group cursor-pointer share-button' 
							onClick={(e) => {
								e.stopPropagation();
								const shareLink = `${window.location.origin}/post/${postId}/comment/${comment._id}`;
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
					</div>
				</div>
			</div>

			{/* PostPopup for replies */}
			{showReplyInput && (
				<PostPopup
					onClose={() => setShowReplyInput(false)}
					postId={postId}
					parentCommentId={comment._id}
					isComment={true}
					postNumber={comment.postNumber}
				/>
			)}
		</div>
	);
};

export default Comment; 