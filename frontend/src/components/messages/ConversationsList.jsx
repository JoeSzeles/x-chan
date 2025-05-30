import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '../common/LoadingSpinner';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useQuery } from "@tanstack/react-query";
import Avatar from '../common/Avatar';
import socketService from '../../services/socket';

const ConversationsList = ({ onSelectConversation, selectedConversation, refreshTrigger }) => {
	const [conversations, setConversations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [unreadCounts, setUnreadCounts] = useState({});
	const [newMessageAnimations, setNewMessageAnimations] = useState({});
	const { isUserOnline } = useOnlineStatus();

	// Function to play notification sound
	const playNotificationSound = () => {
		try {
			console.log('ConversationsList: Attempting to play notification sound');
			const audio = new Audio('/sounds/notification.mp3');
			audio.volume = 0.3;
			
			// Add event listeners to track loading
			audio.addEventListener('canplaythrough', () => {
				console.log('ConversationsList: Audio loaded successfully');
			});
			
			audio.addEventListener('error', (e) => {
				console.log('ConversationsList: Audio error:', e);
				// Try backup sound
				const backupAudio = new Audio('/sounds/notification-backup.mp3');
				backupAudio.volume = 0.3;
				backupAudio.play().catch(err => console.log('ConversationsList: Backup sound also failed:', err));
			});
			
			audio.play().catch(error => {
				console.log('ConversationsList: Could not play notification sound:', error);
				// Try with a simple beep sound using Web Audio API
				try {
					const audioContext = new (window.AudioContext || window.webkitAudioContext)();
					const oscillator = audioContext.createOscillator();
					const gainNode = audioContext.createGain();
					
					oscillator.connect(gainNode);
					gainNode.connect(audioContext.destination);
					
					oscillator.frequency.value = 800; // 800 Hz frequency
					gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
					gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
					
					oscillator.start(audioContext.currentTime);
					oscillator.stop(audioContext.currentTime + 0.1);
					
					console.log('ConversationsList: Played fallback beep sound');
				} catch (beepError) {
					console.log('ConversationsList: Fallback beep also failed:', beepError);
				}
			});
		} catch (error) {
			console.log('ConversationsList: Notification sound setup error:', error);
		}
	};

	const { data: authUser } = useQuery({
		queryKey: ["authUser"],
		queryFn: async () => {
			try {
				const res = await fetch("/api/auth/me", {
					credentials: 'include',
					headers: {
						"Authorization": `Bearer ${localStorage.getItem("token")}`,
					},
				});
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				console.error("Error fetching user:", error);
				return null;
			}
		},
		retry: false,
	});


	const fetchUnreadCounts = async (conversationIds) => {
		try {
			const counts = {};

			// Fetch unread count for each conversation
			for (const conversationId of conversationIds) {
				const response = await fetch(`/api/messages/conversations/${conversationId}/unread-count`, {
					credentials: 'include',
					headers: {
						'Authorization': `Bearer ${localStorage.getItem('token')}`
					}
				});

				if (response.ok) {
					const data = await response.json();
					counts[conversationId] = data.unreadCount || 0;
				} else {
					counts[conversationId] = 0;
				}
			}

			setUnreadCounts(counts);
		} catch (error) {
			console.error('Error fetching unread counts:', error);
		}
	};

	useEffect(() => {
		const fetchConversations = async () => {
    try {
      setLoading(true);
      console.log('ConversationsList: Fetching conversations...');

      const response = await fetch('/api/messages/conversations', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('ConversationsList: Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'API endpoint not found' }));
        console.error('ConversationsList: Error response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch conversations`);
      }

      const data = await response.json();
      console.log('ConversationsList: Conversations data:', data);
      const conversationsData = Array.isArray(data) ? data : [];
      setConversations(conversationsData);

      // Fetch unread counts for all conversations
			if (conversationsData.length > 0) {
				const conversationIds = conversationsData.map(conv => conv._id);
				await fetchUnreadCounts(conversationIds);
			}
    } catch (err) {
      console.error('ConversationsList: Error fetching conversations:', err);
      setError(err.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

		fetchConversations();
	}, [refreshTrigger]); // Re-fetch when refreshTrigger changes

	// Listen for new messages to update conversation list and unread counts
	useEffect(() => {
		if (!authUser) return;

		const handleNewMessage = (message) => {
			console.log('ConversationsList: New message received:', message);
			console.log('ConversationsList: Current selected conversation:', selectedConversation?._id);
			console.log('ConversationsList: Message conversation:', message.conversationId);
			console.log('ConversationsList: Message sender:', message.senderId._id || message.senderId);
			console.log('ConversationsList: Current user:', authUser._id);

			// Update conversations list with new message
			setConversations(prevConversations => {
				const conversationExists = prevConversations.some(conv => conv._id === message.conversationId);

				if (!conversationExists) {
					// If this is a new conversation, refresh the list
					console.log('ConversationsList: New conversation detected, should refresh');
					return prevConversations;
				}

				const updatedConversations = prevConversations.map(conv => {
					if (conv._id === message.conversationId) {
						return {
							...conv,
							lastMessage: {
								content: message.content,
								senderId: message.senderId._id || message.senderId,
								timestamp: message.createdAt
							},
							lastActivity: message.createdAt,
							updatedAt: message.createdAt
						};
					}
					return conv;
				});

				// Sort conversations by last activity (most recent first)
				return updatedConversations.sort((a, b) => 
					new Date(b.lastActivity || b.updatedAt) - new Date(a.lastActivity || a.updatedAt)
				);
			});

			// Get the actual sender ID
			const senderId = message.senderId._id || message.senderId;
			const isFromCurrentUser = senderId === authUser._id;
			const isCurrentConversation = selectedConversation && message.conversationId === selectedConversation._id;

			console.log('ConversationsList: Is from current user:', isFromCurrentUser);
			console.log('ConversationsList: Is current conversation:', isCurrentConversation);

			// Only handle notifications for messages NOT from current user
			if (!isFromCurrentUser) {
				// Always update unread count for messages from other users (regardless of selected conversation)
				setUnreadCounts(prev => ({
					...prev,
					[message.conversationId]: (prev[message.conversationId] || 0) + 1
				}));

				// Only play sound and show animation if it's NOT the currently open conversation
				if (!isCurrentConversation) {
					console.log('ConversationsList: Playing notification for different conversation');
					
					// Trigger animation for this conversation
					setNewMessageAnimations(prev => ({
						...prev,
						[message.conversationId]: Date.now()
					}));

					// Play notification sound
					playNotificationSound();

					// Clear animation after 3 seconds
					setTimeout(() => {
						setNewMessageAnimations(prev => {
							const updated = { ...prev };
							delete updated[message.conversationId];
							return updated;
						});
					}, 3000);
				} else {
					console.log('ConversationsList: Message is for current conversation, no notification needed');
				}
			} else {
				console.log('ConversationsList: Message is from current user, no notification needed');
			}
		};

		// Use a single listener for the conversation list
		socketService.onNewMessage(handleNewMessage);

		return () => {
			socketService.offNewMessage(handleNewMessage);
		};
	}, [authUser, selectedConversation]);


	if (loading) {
		return (
			<div className="p-4 flex justify-center items-center">
				<LoadingSpinner size="sm" />
				<span className="ml-2 text-gray-400">Loading conversations...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 text-center">
				<p className="text-red-500 mb-2">{error}</p>
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
		<div className="h-full overflow-y-auto">
			{conversations.length === 0 ? (
				<div className="p-4 text-gray-500">No conversations yet</div>
			) : (
				conversations.map((conversation) => {
					const otherParticipant = conversation.participants.find(
						p => p._id !== authUser?._id
					);

					const unreadCount = unreadCounts[conversation._id] || 0;
					const hasUnread = unreadCount > 0;
					const hasNewMessage = newMessageAnimations[conversation._id];
					const animationClass = hasNewMessage ? 'message-notification' : '';

					return (
						<div
							key={conversation._id}
							className={`p-4 border-b hover:bg-gray-50 cursor-pointer relative transition-all duration-300 ${hasUnread ? 'bg-blue-50' : ''} ${animationClass}`}
							onClick={() => {
								console.log('ConversationsList: Selecting conversation:', conversation._id);
								onSelectConversation(conversation);
								
								// Clear unread count for this conversation
								setUnreadCounts(prev => {
									const updated = { ...prev, [conversation._id]: 0 };
									console.log('ConversationsList: Updated unread counts:', updated);
									return updated;
								});
								
								// Clear animation for this conversation
								setNewMessageAnimations(prev => {
									const updated = { ...prev };
									delete updated[conversation._id];
									return updated;
								});
							}}
						>
							<div className="flex items-center space-x-3">
								<div className="relative">
									<Avatar 
										user={otherParticipant}
										size="lg"
										showOnlineStatus={true}
										clickable={false}
									/>
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex justify-between items-start">
										<h3 className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-900'}`}>
											{otherParticipant?.username}
										</h3>
										<div className="flex items-center space-x-2">
											<span className="text-xs text-gray-500">
												{formatDistanceToNow(new Date(conversation.updatedAt), {
													addSuffix: true
												})}
											</span>
											{hasUnread && (
												<div className="flex items-center space-x-1">
													<span className={`text-xs bg-red-500 text-white rounded-full px-2 py-1 font-bold min-w-[20px] text-center ${hasNewMessage ? 'pulse-green' : ''}`}>
														{unreadCount}
													</span>
													{hasNewMessage && <div className="sound-wave"></div>}
												</div>
											)}
										</div>
									</div>
									<p className={`text-sm truncate ${hasUnread ? 'font-medium text-gray-700' : 'text-gray-500'}`}>
										{conversation.lastMessage?.content || 'No messages yet'}
									</p>
								</div>
							</div>
						</div>
					);
				})
			)}
		</div>
	);
};

export default ConversationsList;