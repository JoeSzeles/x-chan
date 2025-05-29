import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '../common/LoadingSpinner';
import socketService from '../../services/socket';

const MessageContacts = ({ authUser, onStartConversation }) => {
	const [activeContactTab, setActiveContactTab] = useState('followers');
	const [followers, setFollowers] = useState([]);
	const [requests, setRequests] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [onlineUsers, setOnlineUsers] = useState(new Set());

	// Use the same pattern as FollowingPage for fetching followers
	const { data: followingUsers, isLoading: loadingFollowing, error: followingError } = useQuery({
		queryKey: ["following", authUser?.username],
		queryFn: async () => {
			if (!authUser?.username) return [];

			console.log('MessageContacts: Fetching following for', authUser.username);
			const res = await fetch(`/api/users/${authUser.username}/following`, {
				credentials: "include",
				headers: {
					'Authorization': `Bearer ${localStorage.getItem('token')}`
				}
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				console.error('MessageContacts: Error fetching following:', res.status, errorData);
				throw new Error(errorData.error || "Failed to fetch following users");
			}

			const data = await res.json();
			console.log('MessageContacts: Received following data:', data);
			return data;
		},
		enabled: !!authUser?.username,
		retry: 2,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

	useEffect(() => {
		if (followingUsers) {
			setFollowers(followingUsers);
			setLoading(false);
		}
	}, [followingUsers]);

	useEffect(() => {
		if (followingError) {
			setError(followingError.message);
			setLoading(false);
		}
	}, [followingError]);

	useEffect(() => {
		// Handle online status updates
		const handleUserOnline = (data) => {
			setOnlineUsers(prev => new Set([...prev, data.userId]));
		};

		const handleUserOffline = (data) => {
			setOnlineUsers(prev => {
				const newSet = new Set(prev);
				newSet.delete(data.userId);
				return newSet;
			});
		};

		const handleOnlineUsers = (users) => {
			setOnlineUsers(new Set(users.map(user => user._id)));
		};

		// Set up socket listeners
		socketService.onUserOnline(handleUserOnline);
		socketService.onUserOffline(handleUserOffline);
		socketService.onOnlineUsers(handleOnlineUsers);
		socketService.getOnlineUsers();

		return () => {
			socketService.offUserOnline(handleUserOnline);
			socketService.offUserOffline(handleUserOffline);
		};
	}, []);

	const handleStartConversation = async (userId) => {
		try {
			console.log('MessageContacts: Starting conversation with user:', userId);
			console.log('MessageContacts: Current authUser:', authUser);
			console.log('MessageContacts: Token exists:', !!localStorage.getItem('token'));

			const requestBody = { userId: userId };
			console.log('MessageContacts: Request body:', requestBody);

			const response = await fetch('/api/messages/start-conversation', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${localStorage.getItem('token')}`
				},
				body: JSON.stringify(requestBody)
			});

			console.log('MessageContacts: Start conversation response status:', response.status);
			console.log('MessageContacts: Response headers:', response.headers);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: 'Failed to start conversation' }));
				console.error('MessageContacts: Error response:', errorData);
				console.error('MessageContacts: Full response object:', response);
				throw new Error(errorData.error || `HTTP ${response.status}: Failed to start conversation`);
			}

			const conversation = await response.json();
			console.log('MessageContacts: Started conversation:', conversation);
			onStartConversation(conversation);
		} catch (err) {
			console.error('MessageContacts: Error starting conversation:', err);
			console.error('MessageContacts: Error details:', {
				message: err.message,
				stack: err.stack,
				userId: userId,
				authUser: authUser?._id
			});
			alert(`Error starting conversation: ${err.message}`);
		}
	};

	if (loadingFollowing || loading) {
		return (
			<div className="p-4 flex justify-center items-center bg-gray-800 rounded-md border border-gray-700">
				<LoadingSpinner size="sm" />
				<span className="ml-2 text-gray-400">Loading contacts...</span>
			</div>
		);
	}

	if (error || followingError) {
		return (
			<div className="p-4 text-center bg-gray-800 rounded-md border border-gray-700">
				<p className="text-red-400 mb-2">{error || followingError?.message}</p>
				<button
					onClick={() => window.location.reload()}
					className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
				>
					Retry
				</button>
			</div>
		);
	}

	return (
		<div>
			<div className="flex border-b" style={{ borderColor: 'var(--color-border-default)' }}>
				<button
					className={`flex-1 py-2 px-4 text-center ${activeContactTab === 'followers' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-gray-300'
						}`}
					onClick={() => setActiveContactTab('followers')}
				>
					Followers
				</button>
				<button
					className={`flex-1 py-2 px-4 text-center ${activeContactTab === 'requests' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-gray-300'
						}`}
					onClick={() => setActiveContactTab('requests')}
				>
					Requests
				</button>
			</div>

			<div className="p-4">
				{activeContactTab === 'followers' ? (
					followers?.length > 0 ? (
						<ul className="space-y-1">
							{followers.map((follower) => (
								<li key={follower._id} className="py-3 px-2 border-b last:border-b-0 hover:opacity-80 rounded" style={{ borderColor: 'var(--color-border-default)' }}>
									<div className="flex items-center space-x-3">
										<div className="relative">
											<img
												src={follower.profileImg || follower.profilePicture || '/avatar-placeholder.png'}
												alt={follower.username}
												className="w-10 h-10 rounded-full object-cover border border-gray-600"
											/>
											{onlineUsers.has(follower._id) && (
												<div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full"></div>
											)}
										</div>
										<div className="flex-grow">
											<p className="text-sm font-semibold text-gray-100">
												{follower.username}
												{onlineUsers.has(follower._id) && (
													<span className="ml-2 text-green-500 text-xs">• Online</span>
												)}
											</p>
											<p className="text-xs text-gray-400">{follower.fullName || 'User'}</p>
										</div>
										<button
											className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
											onClick={() => handleStartConversation(follower._id)}
										>
											Message
										</button>
									</div>
								</li>
							))}
						</ul>
					) : (
						<p className="text-gray-400">No followers to display.</p>
					)
				) : (
					requests?.length > 0 ? (
						<ul>
							{requests.map((request) => (
								<li key={request._id} className="py-2 border-b border-gray-700 last:border-b-0">
									{/* Render Request Item */}
								</li>
							))}
						</ul>
					) : (
						<p className="text-gray-400">No requests to display.</p>
					)
				)}
			</div>
		</div>
	);
};

export default MessageContacts;