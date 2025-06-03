
import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '../common/LoadingSpinner';
import Avatar from '../common/Avatar';
import CreateGroupModal from './CreateGroupModal';
import socketService from '../../services/socket';

const GroupConversationsList = ({ onSelectConversation, selectedConversation, authUser, refreshTrigger }) => {
  const [groupConversations, setGroupConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [newMessageAnimations, setNewMessageAnimations] = useState({});

  const playNotificationSound = () => {
    try {
      console.log('GroupConversationsList: Attempting to play notification sound');
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.3;

      audio.addEventListener('canplaythrough', () => {
        console.log('GroupConversationsList: Audio loaded successfully');
      });

      audio.addEventListener('error', (e) => {
        console.log('GroupConversationsList: Audio error:', e);
        const backupAudio = new Audio('/sounds/notification-backup.mp3');
        backupAudio.volume = 0.3;
        backupAudio.play().catch(err => console.log('GroupConversationsList: Backup sound also failed:', err));
      });

      audio.play().catch(error => {
        console.log('GroupConversationsList: Could not play notification sound:', error);
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.value = 800;
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);

          console.log('GroupConversationsList: Played fallback beep sound');
        } catch (beepError) {
          console.log('GroupConversationsList: Fallback beep also failed:', beepError);
        }
      });
    } catch (error) {
      console.log('GroupConversationsList: Notification sound setup error:', error);
    }
  };

  const fetchGroupConversations = async () => {
    try {
      setLoading(true);
      console.log('GroupConversationsList: Fetching group conversations...');

      const response = await fetch('/api/messages/group-conversations', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('GroupConversationsList: Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'API endpoint not found' }));
        console.error('GroupConversationsList: Error response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch group conversations`);
      }

      const data = await response.json();
      console.log('GroupConversationsList: Group conversations data:', data);
      const conversationsData = Array.isArray(data) ? data : [];
      setGroupConversations(conversationsData);

      if (conversationsData.length > 0) {
        const conversationIds = conversationsData.map(conv => conv._id);
        await fetchUnreadCounts(conversationIds);
      }
    } catch (err) {
      console.error('GroupConversationsList: Error fetching group conversations:', err);
      setError(err.message || 'Failed to fetch group conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCounts = async (conversationIds) => {
    try {
      const counts = {};

      for (const conversationId of conversationIds) {
        const response = await fetch(`/api/messages/group/${conversationId}/unread-count`, {
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

  const createGroupConversation = async (groupData) => {
    try {
      const response = await fetch('/api/messages/create-group', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(groupData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create group');
      }

      const newGroup = await response.json();
      setGroupConversations(prev => [newGroup, ...prev]);
      
      // Auto-select the new group
      onSelectConversation(newGroup);
    } catch (error) {
      console.error('Error creating group:', error);
      alert(`Error creating group: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchGroupConversations();
  }, [refreshTrigger]);

  // Listen for new messages to update conversation list and unread counts
  useEffect(() => {
    if (!authUser) return;

    const handleNewMessage = (message) => {
      console.log('GroupConversationsList: New message received:', message);

      // Update conversations list with new message
      setGroupConversations(prevConversations => {
        const conversationExists = prevConversations.some(conv => conv._id === message.conversationId);

        if (!conversationExists) {
          console.log('GroupConversationsList: New group conversation detected, should refresh');
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

        return updatedConversations.sort((a, b) => 
          new Date(b.lastActivity || b.updatedAt) - new Date(a.lastActivity || a.updatedAt)
        );
      });

      const senderId = message.senderId._id || message.senderId;
      const isFromCurrentUser = senderId === authUser._id;
      const isCurrentConversation = selectedConversation?._id === message.conversationId;

      if (!isFromCurrentUser) {
        console.log('GroupConversationsList: Message is from another user, processing notification');
        
        setUnreadCounts(prev => {
          const newCount = (prev[message.conversationId] || 0) + 1;
          console.log('GroupConversationsList: Updating unread count for group conversation', message.conversationId, 'to', newCount);
          return {
            ...prev,
            [message.conversationId]: newCount
          };
        });

        if (!isCurrentConversation) {
          console.log('GroupConversationsList: Message is for different group conversation - playing notification');

          setNewMessageAnimations(prev => {
            const updated = {
              ...prev,
              [message.conversationId]: Date.now()
            };
            console.log('GroupConversationsList: Animation state updated:', updated);
            return updated;
          });

          playNotificationSound();

          setTimeout(() => {
            setNewMessageAnimations(prev => {
              const updated = { ...prev };
              delete updated[message.conversationId];
              console.log('GroupConversationsList: Animation cleared for group conversation:', message.conversationId);
              return updated;
            });
          }, 3000);
        }
      }
    };

    socketService.onNewMessage(handleNewMessage);

    return () => {
      socketService.offNewMessage(handleNewMessage);
    };
  }, [authUser, selectedConversation]);

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <LoadingSpinner size="sm" />
        <span className="ml-2 text-gray-400">Loading group conversations...</span>
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
      {/* Create Group Button */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-border-default)' }}>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full py-2 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-text-light)'
          }}
        >
          <span>➕</span>
          <span>Create Group Chat</span>
        </button>
      </div>

      {/* Group Conversations List */}
      {groupConversations.length === 0 ? (
        <div className="p-4 text-gray-500">
          <div className="text-center">
            <p className="mb-2">No group conversations yet</p>
            <p className="text-sm">Create your first group chat to get started!</p>
          </div>
        </div>
      ) : (
        groupConversations.map((conversation) => {
          const unreadCount = unreadCounts[conversation._id] || 0;
          const hasUnread = unreadCount > 0;
          const hasNewMessage = newMessageAnimations[conversation._id];
          const animationClass = hasNewMessage ? 'message-notification' : '';

          // Get first few participants for display
          const displayParticipants = conversation.participants
            .filter(p => p._id !== authUser?._id)
            .slice(0, 3);

          return (
            <div
              key={conversation._id}
              className={`p-4 border-b hover:bg-gray-50 cursor-pointer relative transition-all duration-300 ${hasUnread ? 'bg-blue-50' : ''} ${animationClass}`}
              onClick={() => {
                console.log('GroupConversationsList: Selecting group conversation:', conversation._id);
                onSelectConversation(conversation);

                setUnreadCounts(prev => {
                  const updated = { ...prev, [conversation._id]: 0 };
                  console.log('GroupConversationsList: Updated unread counts:', updated);
                  return updated;
                });

                setNewMessageAnimations(prev => {
                  const updated = { ...prev };
                  delete updated[conversation._id];
                  return updated;
                });
              }}
            >
              <div className="flex items-center space-x-3">
                {/* Group Avatar */}
                <div className="relative">
                  <div className="flex -space-x-2">
                    {displayParticipants.slice(0, 2).map((participant, index) => (
                      <Avatar
                        key={participant._id}
                        user={participant}
                        size="sm"
                        showOnlineStatus={false}
                        className={`border-2 border-white ${index > 0 ? 'ml-0' : ''}`}
                      />
                    ))}
                    {conversation.participants.length > 3 && (
                      <div className="w-8 h-8 rounded-full bg-gray-500 border-2 border-white flex items-center justify-center text-xs text-white">
                        +{conversation.participants.length - 3}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className={`text-sm truncate ${hasUnread ? 'font-bold text-blue-300' : 'font-medium text-blue-300'}`}>
                      {conversation.name || 'Group Chat'}
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
                  <p className={`text-xs text-gray-400 mb-1`}>
                    {conversation.participants.length} members
                  </p>
                  <p className={`text-sm truncate ${hasUnread ? 'font-medium text-gray-700' : 'text-gray-500'}`}>
                    {conversation.lastMessage?.content || 'No messages yet'}
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateGroup={createGroupConversation}
        authUser={authUser}
      />
    </div>
  );
};

export default GroupConversationsList;
