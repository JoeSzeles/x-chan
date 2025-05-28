import React, { useEffect, useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '../common/LoadingSpinner';

const ConversationsList = ({ authUser, onSelectConversation, selectedConversation }) => {
	const [conversations, setConversations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

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
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('ConversationsList: Error fetching conversations:', err);
      setError(err.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

		fetchConversations();
	}, [authUser]);

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

					return (
						<div
							key={conversation._id}
							className="p-4 border-b hover:bg-gray-50 cursor-pointer"
							onClick={() => onSelectConversation(conversation)}
						>
							<div className="flex items-center space-x-3">
								<img
									src={otherParticipant?.profileImg || otherParticipant?.profilePicture || '/avatar-placeholder.png'}
									alt={otherParticipant?.username}
									className="w-12 h-12 rounded-full object-cover"
								/>
								<div className="flex-1 min-w-0">
									<div className="flex justify-between items-start">
										<h3 className="text-sm font-medium text-gray-900 truncate">
											{otherParticipant?.username}
										</h3>
										<span className="text-xs text-gray-500">
											{formatDistanceToNow(new Date(conversation.updatedAt), {
												addSuffix: true
											})}
										</span>
									</div>
									<p className="text-sm text-gray-500 truncate">
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