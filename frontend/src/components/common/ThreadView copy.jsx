import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import LoadingSpinner from "./LoadingSpinner";
import Comment from "./Comment";
import StarRating from "./StarRating";
import { FaRegComment, FaRegHeart, FaRegBookmark, FaShare, FaRegEye, FaFeather, FaArrowLeft, FaRetweet, FaHeart, FaStar, FaTrash } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { toast } from "react-hot-toast";
import PostPopup from "./PostPopup";
import PostNumberHeader from './PostNumberHeader';
import { formatDistanceToNow } from 'date-fns';
import { formatPostNumber } from '../../utils/postNumberUtils';
import QuoteText from './QuoteText';

// Add ThreadConnector component
const ThreadConnector = ({ fromX, fromY, toX, toY, level = 0, isReply = false }) => {
	// Calculate control points for the Bezier curve
	const controlOffset = isReply ? 120 : 150; // much bigger radius for branches
	const horizontalOffset = level * 20; // smaller offset for replies

	// Calculate SVG viewport dimensions
	const minX = Math.min(fromX, toX) - 50;
	const minY = Math.min(fromY, toY) - 150; // increased top padding
	const width = Math.abs(fromX - toX) + 100;
	const height = Math.abs(fromY - toY) + 200; // increased height to accommodate higher start

	// Adjust coordinates relative to SVG viewport
	const relFromX = fromX - minX;
	const relFromY = fromY - minY - 70; // start 100px higher
	const relToX = toX - minX;
	const relToY = toY - minY;

	// Create path with sharp corners and smooth curves
	const pathData = `
		M ${relFromX},${relFromY}
		L ${relFromX},${relToY - controlOffset}
		C ${relFromX},${relToY - controlOffset/2}
		  ${relToX - controlOffset/2},${relToY - controlOffset/2}
		  ${relToX},${relToY}
	`;

	return (
		<svg 
			className="absolute pointer-events-none" 
			style={{ 
				left: minX,
				top: minY,
				width,
				height,
				zIndex: 1, // Lower z-index to be below profile pictures
				position: 'absolute'
			}}
		>
			<path 
				d={pathData} 
				stroke="rgba(75, 85, 99, 0.4)" // More transparent
				strokeWidth="2" 
				fill="none"
				className="transition-all duration-300 ease-in-out"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

// Custom component for displaying a threaded comment layout
const ThreadedComment = ({ comment, postId, level = 0, onViewReplies, isLastInThread = true }) => {
	const commentOwner = typeof comment.user === 'object' ? comment.user : { username: 'unknown', fullName: 'Unknown User' };
	const hasReplies = comment.replies && comment.replies.length > 0;
	const queryClient = useQueryClient();
	const commentRef = useRef(null);
	const [connectorPoints, setConnectorPoints] = useState(null);
	
	// Track view count for replies
	useEffect(() => {
		const trackView = async () => {
			try {
				await fetch(`/api/comments/${comment._id}/view`, {
					method: "POST",
				});
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
	
	// Calculate connector points when component mounts or updates
	const calculateConnectorPoints = useCallback(() => {
		if (level > 0 && commentRef.current) {
			// Get the current comment's position
			const currentRect = commentRef.current.getBoundingClientRect();
			
			// Get the parent comment's position
			const parentComment = commentRef.current.parentElement;
			const parentRect = parentComment.getBoundingClientRect();
			
			// Get the profile picture
			const profilePic = commentRef.current.querySelector('img');
			const profileRect = profilePic?.getBoundingClientRect();
			
			if (profileRect) {
				// Calculate points relative to the comment container
				const containerRect = commentRef.current.getBoundingClientRect();
				
				setConnectorPoints({
					// Start from the top left corner of the parent comment
					fromX: parentRect.left - containerRect.left,
					fromY: parentRect.top - containerRect.top,
					
					// End at the center of the profile picture
					toX: profileRect.left - containerRect.left + (profileRect.width / 2),
					toY: profileRect.top - containerRect.top + (profileRect.height / 2),
					
					level,
					isReply: true
				});
			}
		}
	}, [level]);

	// Update points on mount, resize, and scroll
	useEffect(() => {
		calculateConnectorPoints();
		
		const handleUpdate = () => {
			requestAnimationFrame(calculateConnectorPoints);
		};
		
		window.addEventListener('resize', handleUpdate);
		window.addEventListener('scroll', handleUpdate);
		
		return () => {
			window.removeEventListener('resize', handleUpdate);
			window.removeEventListener('scroll', handleUpdate);
		};
	}, [calculateConnectorPoints]);

	return (
		<div className="threaded-comment relative" ref={commentRef}>
			{/* SVG Connector Line */}
			{connectorPoints && (
				<ThreadConnector
					fromX={connectorPoints.fromX}
					fromY={connectorPoints.fromY}
					toX={connectorPoints.toX}
					toY={connectorPoints.toY}
					level={connectorPoints.level}
					isReply={connectorPoints.isReply}
				/>
			)}
			
			<div className="flex">
				{/* Indentation based on nesting level */}
				{level > 0 && (
					<div style={{ width: `${level * 40}px` }} className="flex-shrink-0"></div>
				)}
				
				<div className="flex-grow group">
					<div className="group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-200 rounded-lg">
						<Comment 
							comment={comment} 
							postId={postId}
							parentCommentId={level > 0 ? comment.parentComment : null}
							disableNavigation={true}
						/>
					</div>
				</div>
			</div>
			
			{/* View more replies button */}
			{hasReplies && (
				<div className="flex">
					<div style={{ width: `${(level + 1) * 40}px` }} className="flex-shrink-0 relative">
						{/* Vertical connector line with circles */}
						<div className="absolute right-0 -top-4 h-[calc(100%+16px)] flex flex-col items-center">
							{/* Top circle */}
							<div className="w-1 h-1 rounded-full bg-gray-600"></div>
							{/* Line */}
							<div className="w-0.5 flex-grow bg-gray-600"></div>
							{/* Bottom circle */}
							<div className="w-1 h-1 rounded-full bg-gray-600"></div>
						</div>
					</div>
					<button
						onClick={() => onViewReplies(comment._id)}
						className="text-blue-400 hover:underline text-sm mb-4 ml-5"
					>
						{comment.replies.length > 3 
							? `Show all ${comment.replies.length} replies` 
							: `Show ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`}
					</button>
				</div>
			)}
		</div>
	);
};

const ThreadView = () => {
	const { postId, commentId } = useParams();
	const [highlightedComment, setHighlightedComment] = useState(null);
	const [showReplyInput, setShowReplyInput] = useState(false);
	const [focusedComment, setFocusedComment] = useState(commentId);
	const highlightedRef = useRef(null);
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const location = useLocation();
	const [showCommentPopup, setShowCommentPopup] = useState(false);
	const [selectedComment, setSelectedComment] = useState(null);
	const [breadcrumbs, setBreadcrumbs] = useState([]);
	const [expandedComments, setExpandedComments] = useState(new Set());
	const commentRefs = useRef({});

	// Store the previous location and scroll position
	const previousLocation = location.state?.from || '/';
	const previousScroll = location.state?.scrollPosition || 0;

	const handleBack = () => {
		// Navigate back to the previous location
		navigate(previousLocation, { 
			replace: true,
			state: { 
				scrollPosition: previousScroll,
				preserveScroll: true 
			}
		});
	};

	const { data: post, isLoading: postLoading } = useQuery({
		queryKey: ["post", postId],
		queryFn: async () => {
			try {
			const res = await fetch(`/api/posts/${postId}`);
			const data = await res.json();
				if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
			} catch (error) {
				console.error("Error fetching post:", error);
				throw error;
			}
		},
	});

	const { data: comments, isLoading: commentsLoading } = useQuery({
		queryKey: ["comments", postId],
		queryFn: async () => {
			try {
			const res = await fetch(`/api/comments/${postId}`);
			const data = await res.json();
				if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
			} catch (error) {
				console.error("Error fetching comments:", error);
				throw error;
			}
		},
		enabled: !!postId,
	});

	const { data: authUser } = useQuery({
		queryKey: ["authUser"],
		queryFn: async () => {
			const res = await fetch("/api/auth/me");
			const data = await res.json();
			if (!res.ok) return null;
			return data;
		},
	});

	// Add comment mutation
	const { mutate: addComment } = useMutation({
		mutationFn: async ({ text, image }) => {
			const res = await fetch(`/api/comments/${postId}`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ text, img: image }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			return data;
		},
		onSuccess: (data) => {
			// Update both comments and post data in the cache
			queryClient.invalidateQueries(["comments", postId]);
			queryClient.setQueryData(["post", postId], (oldData) => {
				if (!oldData) return oldData;
				return {
					...oldData,
					comments: [...(oldData.comments || []), data._id],
					commentCount: (oldData.commentCount || 0) + 1
				};
			});
			setShowReplyInput(false);
			toast.success("Comment added successfully");
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	// Mutations for post actions
	const { mutate: likePost } = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/posts/like/${postId}`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			return data;
		},
		onSuccess: (data) => {
			// Update the post data in the cache
			queryClient.setQueryData(["post", postId], (oldData) => {
				if (!oldData) return null;
				return {
					...oldData,
					likes: data || [],
				};
			});

			// Also update the posts list cache if it exists
			queryClient.setQueryData(["posts"], (oldData) => {
				if (!oldData) return [];
				return oldData.map((p) => {
					if (p._id === postId) {
						return { ...p, likes: data || [] };
					}
					return p;
				});
			});

			toast.success("Post liked successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to like post");
		},
	});

	const { mutate: repostPost } = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/posts/repost/${postId}`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			return data;
		},
		onSuccess: (data) => {
			// Update the post data in the cache
			queryClient.setQueryData(["post", postId], (oldData) => {
				if (!oldData) return null;
				return {
					...oldData,
					reposts: data.reposts || [],
				};
			});

			// Also update the posts list cache if it exists
			queryClient.setQueryData(["posts"], (oldData) => {
				if (!oldData) return [];
				return oldData.map((p) => {
					if (p._id === postId) {
						return { ...p, reposts: data.reposts || [] };
					}
					return p;
				});
			});

			toast.success(data.message || "Post reposted successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to repost");
		},
	});

	const { mutate: bookmarkPost } = useMutation({
		mutationFn: async () => {
			const res = await fetch(`/api/bookmarks/${postId}`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			return data;
		},
		onSuccess: (data) => {
			// Update the post data in the cache
			queryClient.setQueryData(["post", postId], (oldData) => {
				if (!oldData) return null;
				return {
					...oldData,
					bookmarkedBy: data.isBookmarked 
						? [...(oldData.bookmarkedBy || []), authUser._id]
						: (oldData.bookmarkedBy || []).filter(id => id !== authUser._id)
				};
			});

			// Also update the posts list cache if it exists
			queryClient.setQueryData(["posts"], (oldData) => {
				if (!oldData) return [];
				return oldData.map((p) => {
					if (p._id === postId) {
						return {
							...p,
							bookmarkedBy: data.isBookmarked 
								? [...(p.bookmarkedBy || []), authUser._id]
								: (p.bookmarkedBy || []).filter(id => id !== authUser._id)
						};
					}
					return p;
				});
			});

			toast.success(data.message || (data.isBookmarked ? "Post bookmarked" : "Post unbookmarked"));
		},
		onError: (error) => {
			toast.error(error.message || "Failed to bookmark post");
		},
	});

	// Add these mutations after the post mutations
	const { mutate: likeComment } = useMutation({
		mutationFn: async (commentId) => {
			const res = await fetch(`/api/comments/like/${commentId}`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			return data;
		},
		onSuccess: (data, commentId) => {
			queryClient.setQueryData(["comments", postId], (oldData) => {
				if (!oldData) return oldData;
				return oldData.map((comment) => {
					if (comment._id === commentId) {
						return { ...comment, likes: data.likes || [] };
					}
					return comment;
				});
			});
			toast.success(data.message || "Comment liked successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to like comment");
		},
	});

	const { mutate: repostComment } = useMutation({
		mutationFn: async (commentId) => {
			const res = await fetch(`/api/comments/repost/${commentId}`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			return data;
		},
		onSuccess: (data, commentId) => {
			queryClient.setQueryData(["comments", postId], (oldData) => {
				if (!oldData) return oldData;
				return oldData.map((comment) => {
					if (comment._id === commentId) {
						return { ...comment, reposts: data.reposts || [] };
					}
					return comment;
				});
			});
			toast.success(data.message || "Comment reposted successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to repost comment");
		},
	});

	const { mutate: bookmarkComment } = useMutation({
		mutationFn: async (commentId) => {
			const res = await fetch(`/api/comments/bookmark/${commentId}`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			return data;
		},
		onSuccess: (data, commentId) => {
			queryClient.setQueryData(["comments", postId], (oldData) => {
				if (!oldData) return oldData;
				return oldData.map((comment) => {
					if (comment._id === commentId) {
						return {
							...comment,
							bookmarkedBy: data.bookmarkedBy || []
						};
					}
					return comment;
				});
			});
			toast.success(data.message || (data.isBookmarked ? "Comment bookmarked" : "Comment unbookmarked"));
		},
		onError: (error) => {
			toast.error(error.message || "Failed to bookmark comment");
		},
	});

	// Add these handler functions
	const handleLikeComment = (commentId, e) => {
		e.stopPropagation();
		if (!authUser) {
			toast.error("Please login to like comments");
			return;
		}
		likeComment(commentId);
	};

	const handleRepostComment = (commentId, e) => {
		e.stopPropagation();
		if (!authUser) {
			toast.error("Please login to repost comments");
			return;
		}
		repostComment(commentId);
	};

	const handleBookmarkComment = (commentId, e) => {
		e.stopPropagation();
		if (!authUser) {
			toast.error("Please login to bookmark comments");
			return;
		}
		bookmarkComment(commentId);
	};

	// Scroll to highlighted comment when it changes
	useEffect(() => {
		if (highlightedRef.current) {
			highlightedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}, [highlightedComment]);

	// Set initial highlighted comment
	useEffect(() => {
		if (commentId && comments) {
			setHighlightedComment(commentId);
		}
	}, [commentId, comments]);

	if (postLoading || commentsLoading) return <LoadingSpinner />;
	if (!post) return null;

	const isLiked = post.likes?.includes(authUser?._id);
	const isReposted = post.reposts?.includes(authUser?._id);
	const isBookmarked = post.bookmarkedBy?.includes(authUser?._id);

	const handleLikePost = (e) => {
		e.stopPropagation();
		if (!authUser) {
			toast.error("Please login to like posts");
			return;
		}
		likePost();
	};

	const handleRepostPost = (e) => {
		e.stopPropagation();
		if (!authUser) {
			toast.error("Please login to repost");
			return;
		}
		repostPost();
	};

	const handleBookmarkPost = (e) => {
		e.stopPropagation();
		if (!authUser) {
			toast.error("Please login to bookmark posts");
			return;
		}
		bookmarkPost();
	};

	const handleSharePost = (e) => {
		e.stopPropagation();
		const shareLink = `${window.location.origin}/post/${postId}`;
		navigator.clipboard.writeText(shareLink).then(() => {
			toast.success('Link copied to clipboard!');
		}).catch(() => {
			toast.error('Failed to copy link');
		});
	};

	const handleReplySubmit = (text, image) => {
		if (!authUser) {
			toast.error("Please login to comment");
			return;
		}
		addComment({ text, image });
	};

	// Get the current comment path (for breadcrumb navigation)
	const findCommentPath = (commentList, targetId, path = []) => {
		if (!commentList) return null;
		
		for (const comment of commentList) {
			if (comment._id === targetId) {
				return [...path, comment];
			}
			
			if (comment.replies && comment.replies.length > 0) {
				const nestedPath = findCommentPath(comment.replies, targetId, [...path, comment]);
				if (nestedPath) return nestedPath;
			}
		}
		
		return null;
	};
	
	const commentPath = findCommentPath(comments, focusedComment);
	
	// Get the focused comment object
	const getFocusedComment = (commentList, targetId) => {
		if (!commentList) return null;
		
		if (targetId === postId) {
			return null;
		}
		
		for (const comment of commentList) {
			if (comment._id === targetId) {
				return comment;
			}
			
			if (comment.replies && comment.replies.length > 0) {
				const nestedComment = getFocusedComment(comment.replies, targetId);
				if (nestedComment) return nestedComment;
			}
		}
		
		return null;
	};
	
	const currentComment = getFocusedComment(comments, focusedComment);
	const isRootView = focusedComment === postId;

	// Handle clicking on a reply to navigate deeper
	const handleCommentClick = (clickedCommentId, e) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		setFocusedComment(clickedCommentId);
		setHighlightedComment(clickedCommentId);
	};

	// Format the thread number
	const formattedThreadNumber = formatPostNumber(post.postNumber);

	const handleQuoteClick = async (postNumber) => {
		try {
			// First try to find the post by number
			const res = await fetch(`/api/posts/number/${postNumber}`);
			const data = await res.json();
			
			if (!res.ok) {
				throw new Error(data.message || "Post not found");
			}

			// If it's a comment, navigate to its parent post's thread
			if (data.post) {
				navigate(`/post/${data.post}/comment/${data._id}`, {
					state: { 
						from: window.location.pathname,
						scrollPosition: window.scrollY
					}
				});
			} else {
				// If it's a post, navigate to its thread
				navigate(`/post/${data._id}`, {
					state: { 
						from: window.location.pathname,
						scrollPosition: window.scrollY
					}
				});
			}
		} catch (error) {
			console.error("Error navigating to post:", error);
			toast.error("Could not find the referenced post");
		}
	};

	const renderComment = (comment, level = 0, parentCommentId = null) => {
		const isExpanded = expandedComments.has(comment._id);
		const hasReplies = comment.replies && comment.replies.length > 0;
		const isCommentLiked = comment.likes?.includes(authUser?._id);
		const isCommentReposted = comment.reposts?.includes(authUser?._id);
		const isCommentBookmarked = comment.bookmarkedBy?.includes(authUser?._id);

		return (
			<div key={comment._id} className="relative">
				<div 
					className={`flex gap-2 items-start p-4 rounded-lg bg-[#1e1e1e] mb-4 relative ${level > 0 ? 'ml-8' : ''}`}
					ref={el => commentRefs.current[comment._id] = el}
					data-post-number={comment.postNumber}
				>
					<div className='flex flex-col flex-1'>
						{/* Post Number Header */}
						<PostNumberHeader
							post={comment}
							onQuoteClick={handleQuoteClick}
							className="mb-2"
						/>

						<div className='flex gap-2'>
							<div className='avatar relative flex flex-col items-center'>
								<div className="w-12 h-12 relative z-10 rounded-full bg-[#1e1e1e] p-0.5">
									<Link 
										to={`/profile/${comment.user.username}`} 
										className='w-full h-full rounded-full overflow-hidden flex items-center justify-center border-2 border-gray-700' 
										onClick={(e) => e.stopPropagation()}
									>
										<img 
											src={comment.user.profileImg || "/avatar-placeholder.png"} 
											className="w-full h-full object-cover" 
											alt="Profile"
											onError={(e) => {
												e.target.src = "/avatar-placeholder.png";
											}}
										/>
									</Link>
								</div>
							</div>
							
							<div className='flex flex-col flex-1 bg-[#272525] rounded-lg p-4'>
								<div className='flex gap-2 items-center pb-3'>
									<Link 
										to={`/profile/${comment.user.username}`} 
										className='font-bold' 
										onClick={(e) => e.stopPropagation()}
									>
										{comment.user.fullName}
									</Link>
									<span className='text-gray-700 flex gap-1 text-sm'>
										<Link 
											to={`/profile/${comment.user.username}`} 
											onClick={(e) => e.stopPropagation()}
										>
											@{comment.user.username}
										</Link>
									</span>
									<div className='flex-1 flex justify-end star-rating' onClick={(e) => e.stopPropagation()}>
										<StarRating post={comment} currentUser={authUser} />
									</div>
								</div>

								<div className='flex flex-col gap-3 overflow-hidden py-3'>
									<div className='mt-2'>
										<QuoteText text={comment.text} onQuoteClick={handleQuoteClick} />
									</div>
									{comment.img && (
										<img
											src={comment.img}
											className='h-80 object-contain rounded-lg'
											alt=''
											onError={(e) => {
												e.target.src = "/avatar-placeholder.png";
											}}
										/>
									)}
								</div>

								<div className='flex justify-between mt-3 pt-3'>
									<div className='flex gap-4 items-center w-2/3 justify-between'>
										<div className="flex gap-2">
											<button
												type="button"
												className='flex gap-1 items-center cursor-pointer group comment-button hover:text-sky-400'
												onClick={(e) => {
													e.stopPropagation();
													setSelectedComment(comment);
													setShowCommentPopup(true);
												}}
											>
												<FaRegComment className='w-4 h-4 text-slate-500 group-hover:text-sky-400' />
												<span className='text-sm text-slate-500 group-hover:text-sky-400'>
													{comment.replies?.length || 0}
												</span>
											</button>
										</div>
										<div 
											className='flex gap-1 items-center group cursor-pointer repost-button' 
											onClick={(e) => handleRepostComment(comment._id, e)}
										>
											<BiRepost className={`w-6 h-6 ${isCommentReposted ? 'text-green-500' : 'text-slate-500 group-hover:text-green-500'}`} />
											<span className={`text-sm ${isCommentReposted ? 'text-green-500' : 'text-slate-500 group-hover:text-green-500'}`}>
												{comment.reposts?.length || 0}
											</span>
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
											onClick={(e) => handleLikeComment(comment._id, e)}
										>
											<FaRegHeart className={`w-4 h-4 cursor-pointer ${isCommentLiked ? 'text-pink-500' : 'text-slate-500 group-hover:text-pink-500'}`} />
											<span className={`text-sm ${isCommentLiked ? 'text-pink-500' : 'text-slate-500 group-hover:text-pink-500'}`}>
												{comment.likes?.length || 0}
											</span>
										</div>
									</div>
									<div className='flex w-1/3 justify-end gap-2 items-center'>
										<div 
											className='flex gap-1 items-center group cursor-pointer bookmark-button' 
											onClick={(e) => handleBookmarkComment(comment._id, e)}
										>
											<FaRegBookmark className={`w-4 h-4 ${isCommentBookmarked ? 'text-blue-500' : 'text-slate-500 group-hover:text-blue-500'}`} />
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
				</div>

				{hasReplies && (
					<div className="ml-8">
						{comment.replies.map(reply => renderComment(reply, level + 1, comment._id))}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="flex flex-col gap-4 border-r border-gray-700 min-h-screen">
			{/* Back Button */}
			<div className="sticky top-0 z-10 bg-background-main py-2 border-b border-gray-700">
				<button
					onClick={handleBack}
					className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
				>
					<FaArrowLeft className="w-4 h-4" />
					<span>Back</span>
				</button>
			</div>

			<div className="flex gap-4 px-4">
				{/* Left Side - Profile Pictures */}
				<div className="w-16 flex flex-col items-center gap-2 pt-4">
					{/* Original Post Author */}
					<div className="w-[60px] h-[60px] relative z-10 rounded-full bg-[#1e1e1e] p-0.5">
						<Link 
							to={`/profile/${post.user.username}`} 
							className='w-full h-full rounded-full overflow-hidden flex items-center justify-center border-2 border-gray-700 group relative' 
						>
							<img 
								src={post.user.profileImg || "/avatar-placeholder.png"} 
								className="w-full h-full object-cover" 
								alt="Post Author"
								onError={(e) => {
									e.target.src = "/avatar-placeholder.png";
								}}
							/>
							<div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
								<span className="text-white text-xs font-medium px-2 py-1 rounded bg-black/70">
									{post.user.username}
								</span>
							</div>
						</Link>
					</div>

					{/* Commenters Grid */}
					<div className="grid grid-cols-2 gap-1 mt-2">
						{comments?.map((comment) => (
							<div 
								key={comment._id}
								className={`relative group ${
									highlightedComment === comment._id ? 'ring-2 ring-blue-500 rounded-full' : ''
								}`}
							>
								{/* Username Tooltip */}
								<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
									<div className="bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
										{comment.user.username}
									</div>
									{/* Tooltip Arrow */}
									<div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-black/80 rotate-45"></div>
								</div>
								
								{/* Profile Picture */}
								<div 
									className="w-6 h-6 rounded-full overflow-hidden cursor-pointer transition-transform hover:scale-110 relative z-20"
									onClick={(e) => handleCommentClick(comment._id, e)}
								>
									<img 
										src={comment.user.profileImg || "/avatar-placeholder.png"} 
										className="w-full h-full object-cover" 
										alt={comment.user.username}
										onError={(e) => {
											e.target.src = "/avatar-placeholder.png";
										}}
									/>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Right Side - Content */}
				<div className="flex-1">
					{/* Original Post */}
					<div 
						className="bg-[#1e1e1e] rounded-lg p-4 mb-4 group hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-200"
						data-post-number={post.postNumber}
					>
						{/* Post Number Header */}
						<PostNumberHeader
							post={post}
							onQuoteClick={handleQuoteClick}
							className="mb-2"
						/>
						<div className="flex gap-2 items-center mb-3">
							<Link 
								to={`/profile/${post.user.username}`} 
								className='font-bold hover:underline' 
							>
								{post.user.fullName}
							</Link>
							<span className='text-gray-700 flex gap-1 text-sm'>
								<Link to={`/profile/${post.user.username}`} className="hover:underline">
									@{post.user.username}
								</Link>
							</span>
							<div className='flex-1 flex justify-end star-rating'>
								<StarRating post={post} currentUser={authUser} />
							</div>
						</div>
						<div className="flex flex-col gap-3">
							<div className='mt-2'>
								<QuoteText text={post.text} onQuoteClick={handleQuoteClick} />
							</div>
							{post.img && (
								<img
									src={post.img}
									className='h-80 object-contain rounded-lg'
									alt=''
									onError={(e) => {
										e.target.src = "/avatar-placeholder.png";
									}}
								/>
							)}
						</div>
						{/* Action Bar */}
						<div className='flex justify-between mt-3 pt-3'>
							<div className='flex gap-4 items-center w-2/3 justify-between'>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											setShowReplyInput(true);
										}}
										className='flex gap-1 items-center cursor-pointer group comment-button hover:text-sky-400'
									>
										<FaRegComment className='w-4 h-4 text-slate-500 group-hover:text-sky-400' />
										<span className='text-sm text-slate-500 group-hover:text-sky-400'>
											{comments?.length || 0}
										</span>
									</button>
								</div>
								<div 
									className='flex gap-1 items-center group cursor-pointer repost-button'
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										handleRepostPost(e);
									}}
								>
									<BiRepost className={`w-6 h-6 ${isReposted ? 'text-green-500' : 'text-slate-500 group-hover:text-green-500'}`} />
									<span className={`text-sm ${isReposted ? 'text-green-500' : 'text-slate-500 group-hover:text-green-500'}`}>
										{post.reposts?.length || 0}
									</span>
								</div>
								<div 
									className='flex gap-1 items-center group cursor-pointer view-button'
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
									}}
								>
									<FaRegEye className='w-4 h-4 text-slate-500 group-hover:text-blue-400' />
									<span className='text-sm text-slate-500 group-hover:text-blue-400'>
										{post.viewCount || 0}
									</span>
								</div>
								<div 
									className='flex gap-1 items-center group cursor-pointer like-button'
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										handleLikePost(e);
									}}
								>
									<FaRegHeart className={`w-4 h-4 cursor-pointer ${isLiked ? 'text-pink-500' : 'text-slate-500 group-hover:text-pink-500'}`} />
									<span className={`text-sm ${isLiked ? 'text-pink-500' : 'text-slate-500 group-hover:text-pink-500'}`}>
										{post.likes?.length || 0}
									</span>
								</div>
							</div>
							<div className='flex w-1/3 justify-end gap-2 items-center'>
								<div 
									className='flex gap-1 items-center group cursor-pointer bookmark-button'
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										handleBookmarkPost(e);
									}}
								>
									<FaRegBookmark className={`w-4 h-4 ${isBookmarked ? 'text-blue-500' : 'text-slate-500 group-hover:text-blue-500'}`} />
								</div>
								<div 
									className='flex gap-1 items-center group cursor-pointer share-button'
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										handleSharePost(e);
									}}
								>
									<FaShare className='w-4 h-4 text-slate-500 group-hover:text-blue-500' />
								</div>
							</div>
						</div>
					</div>

					{/* Enhanced Breadcrumb Navigation */}
					<div className="breadcrumbs-container mb-6">
						<div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
							{/* Original Post Link */}
							<button
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setFocusedComment(postId);
								}}
								className="flex items-center gap-2 hover:text-blue-500 transition-colors whitespace-nowrap"
							>
								<div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
									<img 
										src={post?.user?.profileImg || "/avatar-placeholder.png"} 
										alt={post?.user?.username || "Original Post"}
										className="w-full h-full object-cover"
										onError={(e) => {
											e.target.src = "/avatar-placeholder.png";
										}}
									/>
								</div>
								<span className="font-medium">Original Post</span>
							</button>

							{/* Thread Path */}
							{commentPath && commentPath.length > 0 && (
								<>
									<span className="text-gray-500 flex-shrink-0">→</span>
									{commentPath.map((comment, index) => (
										<React.Fragment key={comment._id}>
											<button
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													handleCommentClick(comment._id, e);
												}}
												className="flex items-center gap-2 hover:text-blue-500 transition-colors whitespace-nowrap"
											>
												<div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
													<img 
														src={comment.user?.profileImg || "/avatar-placeholder.png"} 
														alt={comment.user?.username || "Unknown User"}
														className="w-full h-full object-cover"
														onError={(e) => {
															e.target.src = "/avatar-placeholder.png";
														}}
													/>
												</div>
												<span className="font-medium">@{comment.user?.username || "Unknown User"}</span>
											</button>
											{index < commentPath.length - 1 && (
												<span className="text-gray-500 flex-shrink-0">→</span>
											)}
										</React.Fragment>
									))}
								</>
							)}
						</div>
						
						{/* Thread Level Indicator */}
						{commentPath && commentPath.length > 0 && (
							<div className="text-xs text-gray-500 mt-1">
								{commentPath.length} {commentPath.length === 1 ? 'reply' : 'replies'} deep
							</div>
						)}
					</div>

					{/* Show all comments in root view */}
					{isRootView && comments && comments.length > 0 && (
						<div className="comments-list mt-4">
							<h3 className="text-lg font-semibold mb-4 border-b border-gray-700 pb-2">
								Comments ({comments.length})
							</h3>
							<div className="threaded-comments">
								{comments.map((comment, index) => (
									<ThreadedComment
										key={comment._id}
										comment={comment}
										postId={postId}
										level={0}
										onViewReplies={handleCommentClick}
										isLastInThread={index === comments.length - 1}
									/>
								))}
							</div>
						</div>
					)}
					
					{/* Show focused comment and its replies when not in root view */}
					{!isRootView && currentComment && (
						<>
							<div className="mb-6 current-comment">
								<Comment 
									comment={currentComment} 
									postId={postId}
									parentCommentId={currentComment.parentComment}
									disableNavigation={true}
								/>
							</div>
							
							{/* Replies to current comment */}
							{currentComment.replies && currentComment.replies.length > 0 && (
								<div className="replies-thread mt-4">
									<div className="flex items-center gap-4 mb-4">
										<h3 className="text-lg font-semibold ml-[30px]">
											Replies ({currentComment.replies.length})
										</h3>
										
										{/* Horizontal Profile Pictures Grid */}
										<div className="flex flex-wrap gap-2 items-center">
											{currentComment.replies.map((reply) => (
												<div 
													key={reply._id}
													className={`relative group ${
														highlightedComment === reply._id ? 'shadow-[0_0_10px_rgba(59,130,246,0.5)]' : ''
													}`}
												>
													{/* Username Tooltip */}
													<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
														<div className="bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
															{reply.user.username}
														</div>
														{/* Tooltip Arrow */}
														<div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-black/80 rotate-45"></div>
													</div>
													
													{/* Profile Picture */}
													<div 
														className="w-6 h-6 rounded-full overflow-hidden cursor-pointer transition-transform hover:scale-110 relative z-20"
														onClick={(e) => handleCommentClick(reply._id, e)}
													>
														<img 
															src={reply.user.profileImg || "/avatar-placeholder.png"} 
															className="w-full h-full object-cover" 
															alt={reply.user.username}
															onError={(e) => {
																e.target.src = "/avatar-placeholder.png";
															}}
														/>
													</div>
												</div>
											))}
										</div>
									</div>
									
									<div className="threaded-comments">
										{currentComment.replies.map((reply, index) => (
											<ThreadedComment
												key={reply._id}
												comment={reply}
												postId={postId}
												level={1}
												onViewReplies={handleCommentClick}
												isLastInThread={index === currentComment.replies.length - 1}
											/>
										))}
									</div>
								</div>
							)}
							
							{/* Empty state for no replies */}
							{(!currentComment.replies || currentComment.replies.length === 0) && (
								<div className="empty-replies text-center py-8 border-t border-gray-700 mt-4">
									<p className="text-gray-500">No replies yet</p>
									<p className="text-sm text-gray-600 mt-2">Be the first to reply to this comment</p>
								</div>
							)}
						</>
					)}
				</div>
			</div>

			{/* Reply Popup */}
			{showReplyInput && (
				<PostPopup
					onClose={() => setShowReplyInput(false)}
					postId={postId}
					isComment={true}
					onSubmit={handleReplySubmit}
				/>
			)}

			{/* Comment Popup */}
			{showCommentPopup && (
				<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
					<div className='bg-[#1e1e1e] p-4 rounded-lg w-full max-w-2xl'>
						<h2 className='text-xl font-bold mb-4'>Reply to {selectedComment ? 'Comment' : 'Post'}</h2>
						<textarea
							className='w-full p-2 rounded-lg bg-[#272525] text-white resize-none'
							rows={4}
							placeholder='Write your reply...'
							value={commentText}
							onChange={(e) => setCommentText(e.target.value)}
						/>
						<div className='flex justify-end gap-2 mt-4'>
							<button
								className='px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600'
								onClick={() => setShowCommentPopup(false)}
							>
								Cancel
							</button>
							<button
								className='px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600'
								onClick={handleCommentSubmit}
							>
								Reply
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ThreadView; 