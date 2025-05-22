import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { FaList, FaTh, FaEye, FaNewspaper, FaCog, FaComments, FaTimes, FaShare, FaLink, FaStar, FaTrophy, FaLightbulb, FaSmile, FaClock, FaBookmark, FaUserPlus } from "react-icons/fa";
import { IoSettingsOutline } from "react-icons/io5";
import { FaUser, FaHeart, FaRetweet, FaReply, FaQuoteRight, FaAt } from "react-icons/fa";
import axios from "axios";
import io from "socket.io-client";

import LoadingSpinner from "../../components/common/LoadingSpinner";
import Post from "../../components/common/Post";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumb from "../../components/common/Breadcrumb";

// Error Boundary Component
class NotificationErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error) {
		return { hasError: true };
	}

	componentDidCatch(error, errorInfo) {
		console.error("Notification Error:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex flex-col items-center justify-center p-4 text-center">
					<h2 className="text-xl font-bold text-red-500 mb-2">Something went wrong</h2>
					<p className="text-gray-400 mb-4">Failed to load notifications</p>
					<button
						onClick={() => window.location.reload()}
						className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
					>
						Try Again
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}

const NotificationPage = () => {
	const [viewMode, setViewMode] = useState("list");
	const [selectedPost, setSelectedPost] = useState(null);
	const [dismissedNotifications, setDismissedNotifications] = useState(new Set());
	const [removedNotifications, setRemovedNotifications] = useState(new Set());
	const [hoveredPostId, setHoveredPostId] = useState(null);
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	
	const { data: notificationsData, isLoading, error } = useQuery({
		queryKey: ["notifications"],
		queryFn: async () => {
			try {
				console.log("Fetching notifications...");
				const res = await axios.get("/api/notifications");
				console.log("Notifications API response:", res.data);
				const notifications = Array.isArray(res.data.notifications) ? res.data.notifications : [];
				console.log("Processed notifications:", notifications);
				return notifications;
			} catch (error) {
				console.error("Error fetching notifications:", error);
				return [];
			}
		},
	});

	// Socket.IO setup
	useEffect(() => {
		let socket;
		let reconnectAttempts = 0;
		const maxReconnectAttempts = 5;
		const reconnectDelay = 1000;

		const connectSocket = () => {
			if (socket) {
				socket.disconnect();
			}

			socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
				path: '/socket.io',
				transports: ['polling'],
				reconnection: false,
				timeout: 10000,
				withCredentials: true,
				forceNew: true
			});

			socket.on('connect', () => {
				console.log('Socket connected successfully');
				reconnectAttempts = 0;
				const userId = localStorage.getItem('userId');
				if (userId) {
					socket.emit('joinNotifications', userId);
				}
			});

			socket.on('connect_error', (error) => {
				console.error('Socket connection error:', error);
				reconnectAttempts++;
				
				if (reconnectAttempts < maxReconnectAttempts) {
					console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
					setTimeout(connectSocket, reconnectDelay * reconnectAttempts);
				} else {
					console.error('Max reconnection attempts reached');
					toast.error('Failed to connect to real-time updates. Please refresh the page.');
				}
			});

			socket.on('disconnect', (reason) => {
				console.log('Socket disconnected:', reason);
				if (reason === 'io server disconnect') {
					// Server initiated disconnect, try to reconnect
					connectSocket();
				}
			});

			// Listen for new notifications
			socket.on('newNotification', (notification) => {
				console.log('Received new notification:', notification);
				queryClient.setQueryData(["notifications"], (oldData) => {
					if (!oldData) return [notification];
					return [notification, ...oldData];
				});
			});
		};

		// Initial connection
		connectSocket();

		// Cleanup
		return () => {
			if (socket) {
				const userId = localStorage.getItem('userId');
				if (userId) {
					socket.emit('leaveNotifications', userId);
				}
				socket.off('newNotification');
				socket.disconnect();
			}
		};
	}, [queryClient]);

	// Ensure notifications is always an array
	const notifications = Array.isArray(notificationsData) ? notificationsData : [];
	console.log("Current notifications state:", notifications);

	const { mutate: deleteNotifications } = useMutation({
		mutationFn: async () => {
			try {
				const res = await axios.delete("/api/notifications");
				return res.data;
			} catch (error) {
				throw new Error(error.response?.data?.error || "Failed to delete notifications");
			}
		},
		onSuccess: () => {
			toast.success("Notifications deleted successfully");
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const { mutate: markAsRead } = useMutation({
		mutationFn: async (notificationId) => {
			try {
				const res = await axios.patch(`/api/notifications/${notificationId}/read`);
				return res.data;
			} catch (error) {
				throw new Error(error.response?.data?.error || "Failed to mark notification as read");
			}
		},
		onSuccess: (_, notificationId) => {
			// Update the cache directly instead of invalidating
			queryClient.setQueryData(["notifications"], (oldData) => {
				if (!oldData) return [];
				return oldData.filter(notification => notification._id !== notificationId);
			});
		},
		onError: (error) => {
			toast.error(error.message);
			// If there's an error, remove the notification from the removed set
			setRemovedNotifications(prev => {
				const newSet = new Set(prev);
				newSet.delete(notificationId);
				return newSet;
			});
		},
	});

	const getNotificationIcon = (type) => {
		switch (type) {
			case "follow":
				return <FaUser className='w-7 h-7 text-blue-500' />;
			case "like":
				return <FaHeart className='w-7 h-7 text-red-500' />;
			case "repost":
				return <FaRetweet className='w-7 h-7 text-green-500' />;
			case "reply":
			case "post_reply":
				return <FaReply className='w-7 h-7 text-purple-500' />;
			case "news_update":
				return <FaNewspaper className='w-7 h-7 text-yellow-500' />;
			case "service_update":
				return <FaCog className='w-7 h-7 text-orange-500' />;
			case "thread_activity":
				return <FaComments className='w-7 h-7 text-indigo-500' />;
			case "mention":
				return <FaAt className='w-7 h-7 text-cyan-500' />;
			case "comment_reply":
				return <FaReply className='w-7 h-7 text-violet-500' />;
			case "milestone":
				return <FaQuoteRight className='w-7 h-7 text-amber-500' />;
			case "trending_topic":
				return <FaShare className='w-7 h-7 text-rose-500' />;
			case "board_activity":
				return <FaList className='w-7 h-7 text-emerald-500' />;
			case "system_announcement":
				return <FaCog className='w-7 h-7 text-gray-500' />;
			case "post_rating":
				return <FaStar className='w-7 h-7 text-yellow-400' />;
			case "achievement":
				return <FaTrophy className='w-7 h-7 text-amber-400' />;
			case "content_recommendation":
				return <FaLightbulb className='w-7 h-7 text-blue-400' />;
			case "user_mention_reaction":
				return <FaSmile className='w-7 h-7 text-green-400' />;
			case "scheduled_reminder":
				return <FaClock className='w-7 h-7 text-purple-400' />;
			case "bookmark_activity":
				return <FaBookmark className='w-7 h-7 text-teal-500' />;
			case "user_joined":
				return <FaUserPlus className='w-7 h-7 text-lime-500' />;
			case "post_featured":
				return <FaStar className='w-7 h-7 text-amber-500' />;
			default:
				return null;
		}
	};

	const getNotificationText = (notification) => {
		switch (notification.type) {
			case "follow":
				return "followed you";
			case "like":
				return "liked your post";
			case "repost":
				return "reposted your post";
			case "reply":
			case "post_reply":
				return "replied to your post";
			case "news_update":
				return "New news update: " + notification.content;
			case "service_update":
				return "Service update: " + notification.content;
			case "thread_activity":
				return "New activity in thread: " + notification.content;
			case "mention":
				return "mentioned you in a post";
			case "comment_reply":
				return "replied to your comment";
			case "milestone":
				return "Congratulations! " + notification.content;
			case "trending_topic":
				return "A topic you follow is trending: " + notification.content;
			case "board_activity":
				return "New activity in board: " + notification.content;
			case "system_announcement":
				return "System announcement: " + notification.content;
			case "post_rating":
				return notification.content || "rated your post";
			case "achievement":
				return notification.content || "You earned an achievement!";
			case "content_recommendation":
				return notification.content || "We found content you might like";
			case "user_mention_reaction":
				return notification.content || "reacted to a mention of you";
			case "scheduled_reminder":
				return notification.content || "Here's your scheduled reminder";
			case "bookmark_activity":
				return notification.content || "Activity on your bookmarked content";
			case "user_joined":
				return notification.content || "Welcome to the platform!";
			case "post_featured":
				return notification.content || "Your post has been featured!";
			default:
				return notification.content || "";
		}
	};

	const formatPostNumber = (postId) => {
		if (!postId) return "";
		const id = postId.toString();
		return id.slice(-8).padStart(8, '0');
	};

	const formatDate = (dateString) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffInSeconds = Math.floor((now - date) / 1000);
		
		if (diffInSeconds < 60) return 'just now';
		if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
		if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
		if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
		
		return date.toLocaleDateString('en-US', { 
			month: 'short', 
			day: 'numeric',
			year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
		});
	};

	const handleNotificationClick = (notification) => {
		switch (notification.type) {
			case "follow":
				navigate(`/profile/${notification.from.username}`);
				break;
			case "like":
			case "repost":
			case "reply":
			case "post_reply":
			case "mention":
			case "post_rating":
			case "user_mention_reaction":
			case "post_featured":
				// Check both post and postId fields
				if (notification.postId?._id) {
					setSelectedPost(notification.postId._id);
				} else if (notification.post?._id) {
					setSelectedPost(notification.post._id);
				} else if (notification.postId) {
					setSelectedPost(notification.postId);
				} else if (notification.post) {
					setSelectedPost(notification.post);
				}
				break;
			case "comment_reply":
				// Handle comment replies
				if (notification.commentId) {
					navigate(`/post/${notification.postId}?commentId=${notification.commentId}`);
				} else if (notification.postId) {
					setSelectedPost(notification.postId);
				}
				break;
			case "news_update":
				if (notification.newsId) {
					navigate(`/news/${notification.newsId}`);
				}
				break;
			case "service_update":
				if (notification.serviceId) {
					navigate(`/services/${notification.serviceId}`);
				}
				break;
			case "thread_activity":
				if (notification.threadId) {
					navigate(`/threads/${notification.threadId}`);
				}
				break;
			case "milestone":
			case "achievement":
				navigate(`/profile/${notification.to.username}`);
				break;
			case "trending_topic":
				if (notification.topicId) {
					navigate(`/topics/${notification.topicId}`);
				} else {
					navigate(`/search?q=${encodeURIComponent(notification.content)}`);
				}
				break;
			case "board_activity":
				if (notification.boardId) {
					navigate(`/boards/${notification.boardId}`);
				}
				break;
			case "system_announcement":
			case "user_joined":
				// System announcements may not have a specific destination
				if (notification.linkUrl) {
					window.open(notification.linkUrl, '_blank');
				}
				break;
			case "content_recommendation":
				// Handle different content types
				if (notification.postId) {
					setSelectedPost(notification.postId);
				} else if (notification.newsId) {
					navigate(`/news/${notification.newsId}`);
				} else if (notification.serviceId) {
					navigate(`/services/${notification.serviceId}`);
				} else if (notification.threadId) {
					navigate(`/threads/${notification.threadId}`);
				}
				break;
			case "scheduled_reminder":
				// If there's a relevant post, show it
				if (notification.postId) {
					setSelectedPost(notification.postId);
				}
				break;
			case "bookmark_activity":
				// Navigate to the bookmarked post
				if (notification.postId) {
					setSelectedPost(notification.postId);
				} else {
					navigate('/bookmarks');
				}
				break;
			default:
				// If there's any post reference, show the post
				if (notification.postId?._id) {
					setSelectedPost(notification.postId._id);
				} else if (notification.post?._id) {
					setSelectedPost(notification.post._id);
				} else if (notification.postId) {
					setSelectedPost(notification.postId);
				} else if (notification.post) {
					setSelectedPost(notification.post);
				}
				break;
		}
	};

	const handleDismiss = (e, notification) => {
		e.stopPropagation(); // Prevent triggering the card click
		// Add to dismissed set for animation
		setDismissedNotifications(prev => new Set([...prev, notification._id]));
		// Wait for animation to complete before removing from DOM and making API call
		setTimeout(() => {
			setRemovedNotifications(prev => new Set([...prev, notification._id]));
			markAsRead(notification._id);
		}, 300); // Match this with the CSS transition duration
	};

	const handleShare = async (e, notification) => {
		e.stopPropagation();
		
		// Get the post ID from either the notification or its referenced post
		const postId = notification.post?._id || notification.referencedPost?._id;
		
		if (!postId) {
			toast.error('No post link available');
			return;
		}
		
		const baseUrl = window.location.origin;
		const postUrl = `${baseUrl}/post/${postId}`;
		
		try {
			await navigator.clipboard.writeText(postUrl);
			toast.success('Post link copied to clipboard!');
			console.log('Copied URL:', postUrl);
		} catch (err) {
			console.error('Share error:', err);
			toast.error('Failed to copy link');
		}
	};

	// Filter out removed notifications
	const visibleNotifications = notifications.filter(
		notification => !removedNotifications.has(notification._id)
	);

	return (
		<NotificationErrorBoundary>
			<div className='flex-[4_4_0] border-l border-r border-gray-700 min-h-screen'>
				{/* Breadcrumb Navigation */}
				<Breadcrumb 
					items={[
						{ label: 'Notifications' }
					]}
				/>

				<PageHeader>
					<p className='font-bold'>Notifications</p>
					<div className='flex items-center gap-4'>
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
						<div className='dropdown dropdown-end'>
							<div tabIndex={0} role='button' className='p-2 rounded-full hover:bg-gray-700 transition-colors'>
								<IoSettingsOutline className='w-4 h-4 text-gray-500' />
							</div>
							<ul
								tabIndex={0}
								className='dropdown-content z-[1] menu p-2 shadow bg-[#1e1e1e] rounded-lg w-52 border border-gray-700'
							>
								<li>
									<button
										onClick={deleteNotifications}
										className='flex items-center gap-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors'
									>
										<FaTimes className='w-4 h-4' />
										<span>Delete all notifications</span>
									</button>
								</li>
							</ul>
						</div>
					</div>
				</PageHeader>

				{isLoading && (
					<div className='flex justify-center h-full items-center'>
						<LoadingSpinner size='lg' />
					</div>
				)}

				{error && (
					<div className='text-center p-4 text-red-500'>
						Error loading notifications: {error.message}
					</div>
				)}

				{!isLoading && !error && visibleNotifications.length === 0 && (
					<div className='text-center p-4'>
						<div className='font-bold mb-2'>No notifications yet</div>
						<p className='text-gray-400 text-sm'>When you get notifications, they'll show up here</p>
					</div>
				)}

				{!isLoading && !error && visibleNotifications.length > 0 && (
					<div className={viewMode === "grid" 
						? "grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 p-2" 
						: "grid grid-cols-3 gap-2 p-2"
					}>
						{visibleNotifications.map((notification) => (
							<div 
								key={notification._id} 
								className={`bg-[#1e1e1e] rounded-lg hover:bg-[#2a2a2a] transition-colors cursor-pointer relative group transition-all duration-300 ${
									dismissedNotifications.has(notification._id) 
										? "opacity-0 transform scale-95" 
										: "opacity-100 transform scale-100"
								}`}
								onClick={() => handleNotificationClick(notification)}
							>
								{/* Dismiss button */}
								<button
									onClick={(e) => handleDismiss(e, notification)}
									className="absolute top-1 right-1 p-1 rounded-full hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100 z-10"
									title="Dismiss notification"
								>
									<FaTimes className="w-3 h-3 text-gray-400 hover:text-white" />
								</button>

								<div className='flex flex-col gap-1 p-2 rounded-lg'>
									<div className='flex items-start gap-2'>
										{getNotificationIcon(notification.type)}
										<div className='flex-1 min-w-0'>
											<div className="flex items-center gap-1">
												<div className='avatar'>
													<div className='w-6 h-6 rounded-full overflow-hidden relative'>
														<div className='absolute inset-0 border border-gray-300 rounded-full'></div>
														<img 
															src={notification.from.profileImg || "/avatar-placeholder.png"} 
															className="w-full h-full object-cover"
															alt={notification.from.username}
														/>
													</div>
												</div>
												<div className='flex flex-col min-w-0'>
													<span className='font-bold text-sm truncate'>@{notification.from.username}</span>
													<div className='flex gap-1 text-xs text-gray-400 truncate'>
														{getNotificationText(notification)}
													</div>
												</div>
											</div>
										</div>
									</div>
									{notification.referencedPost?._id && (
										<div 
											className='mt-1 text-xs text-gray-400 hover:text-gray-300 transition-colors cursor-pointer'
											onMouseEnter={() => setHoveredPostId(notification.referencedPost._id)}
											onMouseLeave={() => setHoveredPostId(null)}
										>
											<span className="text-red-500">#{formatPostNumber(notification.referencedPost._id)}</span>
										</div>
									)}
									{notification.post?._id && viewMode === "grid" && (
										<div className='mt-1'>
											<Post 
												post={notification.post._id} 
												isCompact={true}
											/>
										</div>
									)}
									<div className='flex items-center justify-between mt-1 text-xs text-gray-500'>
										<span>{formatDate(notification.createdAt)}</span>
										{(notification.post?._id || notification.referencedPost?._id) && (
											<button
												onClick={(e) => handleShare(e, notification)}
												className='p-1 rounded-full hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100'
												title="Copy post link"
											>
												<FaLink className="w-3 h-3" />
											</button>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				)}

				{/* Post Preview Modal */}
				{hoveredPostId && (
					<div 
						className="fixed bg-[#1e1e1e] rounded-lg shadow-lg p-4 max-w-md z-50"
						style={{
							top: '50%',
							left: '50%',
							transform: 'translate(-50%, -50%)',
							pointerEvents: 'none'
						}}
					>
						<Post post={hoveredPostId} isCompact={true} />
					</div>
				)}

				{/* Post Modal */}
				{selectedPost && (
					<div 
						className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
						onClick={() => setSelectedPost(null)}
					>
						<div 
							className="bg-[#1e1e1e] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
							onClick={(e) => e.stopPropagation()}
						>
							<button
								onClick={() => setSelectedPost(null)}
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
		</NotificationErrorBoundary>
	);
};

export default NotificationPage;
