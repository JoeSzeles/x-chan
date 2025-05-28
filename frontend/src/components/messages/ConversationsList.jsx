import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const ConversationsList = ({ onSelectConversation }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await axios.get('/api/messages/conversations', {
          withCredentials: true
        });
        setConversations(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch conversations');
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  if (loading) {
    return <div className="p-4">Loading conversations...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      {conversations.length === 0 ? (
        <div className="p-4 text-gray-500">No conversations yet</div>
      ) : (
        conversations.map((conversation) => {
          const otherParticipant = conversation.participants.find(
            (p) => p._id !== localStorage.getItem('userId')
          );

          return (
            <div
              key={conversation._id}
              className="p-4 border-b hover:bg-gray-50 cursor-pointer"
              onClick={() => onSelectConversation(conversation)}
            >
              <div className="flex items-center space-x-3">
                <img
								src={otherParticipant?.profilePicture || otherParticipant?.profileImg || '/avatar-placeholder.png'}
								alt={otherParticipant?.username}
								className="w-12 h-12 rounded-full object-cover"
								onError={(e) => {
									e.target.src = '/avatar-placeholder.png';
								}}
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