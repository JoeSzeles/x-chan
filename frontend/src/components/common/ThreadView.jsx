import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import LoadingSpinner from "./LoadingSpinner";
import Comment from "./Comment";
import Post from "./Post";
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
const ThreadedComment = ({ comment, postId, level = 0, onViewReplies, isLastInThread = true, expandedComments }) => {
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
					<div className="flex-grow">
						<button
							onClick={() => onViewReplies(comment._id)}
							className="text-blue-400 hover:underline text-sm mb-4 ml-5"
						>
							{comment.replies.length > 3 
								? `Show all ${comment.replies.length} replies` 
								: `Show ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`}
						</button>

						{/* Nested replies */}
						{expandedComments.has(comment._id) && comment.replies.map((reply) => (
							<ThreadedComment
								key={reply._id}
								comment={reply}
								postId={postId}
								level={level + 1}
								onViewReplies={onViewReplies}
								expandedComments={expandedComments}
							/>
						))}
					</div>
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
		navigate(previousLocation, { 
			replace: true,
			state: { 
				scrollPosition: previousScroll,
				preserveScroll: true 
			}
		});
	};

	// Fetch post data
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

	// Fetch comments data
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

	// Handle clicking on a reply to navigate deeper
	const handleCommentClick = (clickedCommentId, e) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		// Clear expanded comments when changing focus
		setExpandedComments(new Set());
		setFocusedComment(clickedCommentId);
		setHighlightedComment(clickedCommentId);
		
		// Expand all parent comments in the path
		const newExpanded = new Set();
		let current = getFocusedComment(comments, clickedCommentId);
		while (current && current.parentComment) {
			newExpanded.add(current.parentComment);
			current = getFocusedComment(comments, current.parentComment);
		}
		setExpandedComments(newExpanded);
	};

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

	const onViewReplies = (commentId) => {
		setExpandedComments((prevExpanded) => {
			const newExpanded = new Set();
			const newComment = getFocusedComment(comments, commentId);
			
			// If already expanded, collapse it and its children
			if (prevExpanded.has(commentId)) {
				return new Set([]);
			}
			
			// Only add the clicked comment to expanded set
			newExpanded.add(commentId);
			return newExpanded;
		});
		
		setFocusedComment(commentId);
		setHighlightedComment(commentId);
	};

	// Handle reply submission
	const handleReplySubmit = () => {
		// After submitting, refetch comments
		queryClient.invalidateQueries(["comments", postId]);
		setShowReplyInput(false); // Close the popup
	};

	if (postLoading || commentsLoading) {
		return (
			<div className="flex justify-center items-center h-64">
				<LoadingSpinner />
			</div>
		);
	}

	if (!post) {
		return (
			<div className="p-4 text-center">
				<p>Post not found or has been deleted.</p>
				<button 
					onClick={() => navigate('/')}
					className="btn btn-primary mt-4"
				>
					Return to Home
				</button>
			</div>
		);
	}

	// Calculate comment path
	const commentPath = [];
	let current = currentComment;
	while (current) {
		commentPath.unshift(current);
		current = getFocusedComment(comments, current.parentComment);
	}

	return (
		<div className="flex flex-col gap-4 border-r border-gray-700 min-h-screen w-full">
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

			<div className="flex gap-4 px-4 w-full">
				{/* Left Side - Profile Pictures */}
				<div className="w-16 flex-shrink-0 flex flex-col items-center gap-2 pt-4">
					{/* Original Post Author */}
					<div className="w-[60px] h-[60px] relative z-10 rounded-full bg-[#1e1e1e] p-0.5">
						<div className='w-full h-full rounded-full overflow-hidden flex items-center justify-center border-2 border-gray-700 group relative'>
							<img 
								src={post.user.profileImg || "/avatar-placeholder.png"}
								className="w-full h-full object-cover" 
								alt={post.user.username}
								onError={(e) => {
									e.target.src = "/avatar-placeholder.png";
								}}
							/>
						</div>
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
								<div className="w-6 h-6 rounded-full overflow-hidden cursor-pointer transition-transform hover:scale-110 relative z-20">
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

				<div className="flex-1 min-w-0 max-w-full">
					{/* Comment Path Navigation with User Avatars */}
					<div className="comment-path bg-gray-800 p-4 rounded-lg mb-6">
						<div className="flex items-center gap-3 overflow-x-auto">
							{/* Avatar Grid for Quick Navigation */}
							<div className="flex -space-x-2 hover:space-x-1 transition-all duration-200">
								<div 
									onClick={() => setFocusedComment(postId)}
									className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-700 cursor-pointer hover:scale-110 transition-transform relative z-10"
								>
									<img 
										src={post?.user?.profileImg || "/avatar-placeholder.png"} 
										alt="Original Post"
										className="w-full h-full object-cover"
										onError={(e) => {
											e.target.src = "/avatar-placeholder.png";
										}}
									/>
									<div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
										<span className="text-white text-xs">OP</span>
									</div>
								</div>

								{comments?.slice(0, 5).map((comment, index) => (
									<div
										key={comment._id}
										onClick={() => handleCommentClick(comment._id)}
										className={`w-8 h-8 rounded-full overflow-hidden border-2 cursor-pointer hover:scale-110 transition-transform relative z-[${20 - index}] ${
											focusedComment === comment._id ? 'border-blue-500' : 'border-gray-700'
										}`}
									>
										<img 
											src={comment.user?.profileImg || "/avatar-placeholder.png"} 
											alt={comment.user?.username}
											className="w-full h-full object-cover"
											onError={(e) => {
												e.target.src = "/avatar-placeholder.png";
											}}
										/>
										<div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
											<span className="text-white text-xs">@{comment.user?.username}</span>
										</div>
									</div>
								))}

								{comments?.length > 5 && (
									<div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center text-xs text-white cursor-pointer hover:bg-gray-600 transition-colors">
										+{comments.length - 5}
									</div>
								)}
							</div>

							{/* Current Path Indicator */}
							{commentPath && commentPath.length > 0 && (
								<div className="flex items-center gap-2 ml-4 text-sm text-gray-400">
									<span className="text-gray-500">→</span>
									<span>Viewing reply by @{currentComment?.user?.username}</span>
									<span className="text-gray-500">({commentPath.length} deep)</span>
								</div>
							)}
						</div>
					</div>

					

					{/* Original Post */}
					<Post post={post} />

					{/* Original Comment Display */}
					{currentComment && (
						<div className="original-comment mb-6 bg-gray-800 p-4 rounded-lg">
							<Comment 
								comment={currentComment} 
								postId={postId}
								parentCommentId={currentComment.parentComment}
								disableNavigation={true}
							/>
						</div>
					)}

					{/* Reply Chain Navigation */}
					<div className="sticky top-16 z-10 bg-background-main py-2 border-b border-gray-700 mb-4">
						<div className="flex items-center gap-2">
							<button 
								onClick={() => setFocusedComment(postId)}
								className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-full hover:bg-gray-700 transition-colors"
							>
								<img 
									src={post?.user?.profileImg || "/avatar-placeholder.png"} 
									alt="Original Post"
									className="w-6 h-6 rounded-full"
								/>
								<span className="text-sm">OP</span>
							</button>
							
							{commentPath && commentPath.length > 0 && (
								<>
									<span className="text-gray-500">→</span>
									{commentPath.map((comment, index) => (
										<div key={comment._id} className="flex items-center">
											<button
												onClick={() => handleCommentClick(comment._id)}
												className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-full hover:bg-gray-700 transition-colors"
											>
												<img 
													src={comment.user?.profileImg || "/avatar-placeholder.png"} 
													alt={comment.user?.username}
													className="w-6 h-6 rounded-full"
												/>
												<span className="text-sm">@{comment.user?.username}</span>
											</button>
											{index < commentPath.length - 1 && (
												<span className="mx-2 text-gray-500">→</span>
											)}
										</div>
									))}
								</>
							)}
						</div>
					</div>

					{/* Comments Section */}
					<div className="comments-list mt-4">
						<div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
							<h3 className="text-lg font-semibold">
								Replies {comments?.length > 0 ? `(${comments.length})` : ''}
							</h3>
							{commentPath && commentPath.length > 0 && (
								<div className="flex items-center gap-2 text-sm">
									<button
										onClick={() => setFocusedComment(postId)}
										className="text-blue-400 hover:text-blue-300"
									>
										View All
									</button>
									<span className="text-gray-500">|</span>
									<span className="text-gray-400">
										{commentPath.length} replies deep
									</span>
								</div>
							)}
						</div>
						<div className="threaded-comments space-y-4">
							{comments?.map((comment) => (
								<div key={comment._id} className="comment-card bg-gray-800 p-4 rounded-lg">
									<Comment 
										comment={comment}
										postId={postId}
										parentCommentId={null}
										disableNavigation={true}
									/>
									{comment.replies?.length > 0 && (
										<>
											<button
												onClick={() => onViewReplies(comment._id)}
												className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
											>
												{expandedComments.has(comment._id) ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
											</button>
											{expandedComments.has(comment._id) && (
												<div className="ml-8 mt-4 space-y-4">
													{comment.replies.map((reply) => (
														<ThreadedComment
															key={reply._id}
															comment={reply}
															postId={postId}
															level={1}
															onViewReplies={onViewReplies}
															expandedComments={expandedComments}
														/>
													))}
												</div>
											)}
										</>
									)}
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Reply Popup */}
			{showReplyInput && (
				<PostPopup
					onClose={() => setShowReplyInput(false)}
					postId={postId}
					isComment={true}
					onSubmit={handleReplySubmit}
					postNumber={post.postNumber}
				/>
			)}
		</div>
	);
};

export default ThreadView;