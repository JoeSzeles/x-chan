import React, { useEffect, useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '../common/LoadingSpinner';
import socketService from '../../services/socket';

const ConversationsList = ({ onSelectConversation, selectedConversation, refreshTrigger }) => {
	const [conversations, setConversations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [onlineUsers, setOnlineUsers] = useState(new Set());
	const [unreadCounts, setUnreadCounts] = useState({});

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
  

	const fetchUnreadCounts = async (conversationsList) => {
		try {
			const counts = {};
			
			// Fetch unread count for each conversation
			for (const conversation of conversationsList) {
				try {
					const response = await fetch(`/api/messages/conversations/${conversation._id}/unread-count`, {
						credentials: 'include',
						headers: {
							'Authorization': `Bearer ${localStorage.getItem('token')}`
						}
					});
					
					if (response.ok) {
						const data = await response.json();
						counts[conversation._id] = data.unreadCount || 0;
					} else {
						counts[conversation._id] = 0;
					}
				} catch (err) {
					console.error('Error fetching unread count for conversation:', conversation._id, err);
					counts[conversation._id] = 0;
				}
			}
			
			setUnreadCounts(counts);
		} catch (err) {
			console.error('Error fetching unread counts:', err);
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
      const conversationsList = Array.isArray(data) ? data : [];
      setConversations(conversationsList);
      
      // Fetch unread counts after getting conversations
      if (conversationsList.length > 0) {
        fetchUnreadCounts(conversationsList);
      }
    } catch (err) {
      console.error('ConversationsList: Error fetching conversations:', err);
      setError(err.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

		fetchConversations();

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

    // Handle new messages to update unread counts
    const handleNewMessage = (message) => {
      console.log('ConversationsList: New message received:', message);
      
      // Update unread count for the conversation if it's not the selected one
      if (!selectedConversation || message.conversationId !== selectedConversation._id) {
        setUnreadCounts(prev => ({
          ...prev,
          [message.conversationId]: (prev[message.conversationId] || 0) + 1
        }));
      }
      
      // Move conversation to top and update last message
      setConversations(prev => {
        const updatedConversations = prev.map(conv => {
          if (conv._id === message.conversationId) {
            return {
              ...conv,
              lastMessage: {
                content: message.content,
                senderId: message.senderId,
                timestamp: message.createdAt || new Date().toISOString()
              },
              updatedAt: message.createdAt || new Date().toISOString()
            };
          }
          return conv;
        });
        
        // Sort by updatedAt to move the conversation with new message to top
        return updatedConversations.sort((a, b) => 
          new Date(b.updatedAt) - new Date(a.updatedAt)
        );
      });
    };

    // Set up socket listeners
    socketService.onUserOnline(handleUserOnline);
    socketService.onUserOffline(handleUserOffline);
    socketService.onOnlineUsers(handleOnlineUsers);
    socketService.onNewMessage(handleNewMessage);
    socketService.getOnlineUsers();

    return () => {
      socketService.offUserOnline(handleUserOnline);
      socketService.offUserOffline(handleUserOffline);
      socketService.offNewMessage(handleNewMessage);
    };
	}, [refreshTrigger]); // Re-fetch when refreshTrigger changes

  

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
					const isSelected = selectedConversation?._id === conversation._id;

					const handleConversationClick = () => {
						onSelectConversation(conversation);
						// Clear unread count when conversation is selected
						if (unreadCount > 0) {
							setUnreadCounts(prev => ({
								...prev,
								[conversation._id]: 0
							}));
						}
					};

					return (
						<div
							key={conversation._id}
							className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
								isSelected ? 'bg-blue-50 border-blue-200' : ''
							}`}
							onClick={handleConversationClick}
						>
							<div className="flex items-center space-x-3">
								<div className="relative">
									<img
										src={otherParticipant?.profileImg || otherParticipant?.profilePicture || '/avatar-placeholder.png'}
										alt={otherParticipant?.username}
										className="w-12 h-12 rounded-full object-cover"
									/>
									{onlineUsers.has(otherParticipant?._id) && (
										<div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
									)}
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex justify-between items-start">
										<div className="flex items-center">
											<h3 className={`text-sm font-medium truncate ${
												unreadCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-900'
											}`}>
												{otherParticipant?.username}
												{onlineUsers.has(otherParticipant?._id) && (
													<span className="ml-2 text-green-500 text-xs">• Online</span>
												)}
											</h3>
											{unreadCount > 0 && (
												<span className="ml-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center">
													{unreadCount > 99 ? '99+' : unreadCount}
												</span>
											)}
										</div>
										<span className="text-xs text-gray-500 ml-2">
											{formatDistanceToNow(new Date(conversation.updatedAt), {
												addSuffix: true
											})}
										</span>
									</div>
									<p className={`text-sm truncate ${
										unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
									}`}>
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