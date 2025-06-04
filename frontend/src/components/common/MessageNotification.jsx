
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import socketService from '../../services/socket';
import Avatar from './Avatar';

const MessageNotification = ({ authUser }) => {
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authUser) return;

    const handleNewMessage = (message) => {
      // Only show notification if message is from another user
      if (message.senderId._id !== authUser._id) {
        // Check if we're currently on the messages page
        const isOnMessagesPage = window.location.pathname === '/messages';
        
        // Only show popup if not on messages page
        if (!isOnMessagesPage) {
          const notification = {
            id: Date.now() + Math.random(),
            message,
            timestamp: Date.now()
          };

          setNotifications(prev => [...prev, notification]);

          // Auto-remove after 5 seconds
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
          }, 5000);
        }
      }
    };

    // Register for new message events
    socketService.onNewMessage(handleNewMessage);

    return () => {
      socketService.offNewMessage(handleNewMessage);
    };
  }, [authUser]);

  const handleNotificationClick = (notification) => {
    const { message } = notification;
    
    // Remove the notification
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
    
    // Navigate to messages page with conversation selected
    if (message.conversationType === 'group') {
      navigate('/messages', { 
        state: { 
          selectedGroupConversation: message.conversationId,
          tab: 'groups'
        }
      });
    } else {
      navigate('/messages', { 
        state: { 
          selectedConversation: message.conversationId,
          tab: 'conversations'
        }
      });
    }
  };

  const removeNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {notifications.map(notification => {
        const { message } = notification;
        const isGroupMessage = message.conversationType === 'group';
        
        return (
          <div
            key={notification.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm cursor-pointer transform transition-all duration-300 hover:scale-105 animate-slide-in"
            onClick={() => handleNotificationClick(notification)}
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderColor: 'var(--color-border-default)',
              color: 'var(--color-text-primary)'
            }}
          >
            <div className="flex items-start space-x-3">
              {/* Sender Avatar */}
              <div className="flex-shrink-0">
                <Avatar 
                  user={message.senderId}
                  size="sm"
                  showOnlineStatus={false}
                />
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-semibold truncate">
                      {message.senderId.fullName || message.senderId.username}
                    </p>
                    {isGroupMessage && (
                      <span className="text-xs px-2 py-1 rounded-full text-white"
                            style={{ backgroundColor: 'var(--color-primary)' }}>
                        Group
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                {/* Group name if applicable */}
                {isGroupMessage && message.groupName && (
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    in {message.groupName}
                  </p>
                )}

                {/* Message preview */}
                <p className="text-sm mb-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  {message.content || (message.attachments?.length > 0 ? 
                    `📎 ${message.attachments.length} attachment(s)` : 
                    'New message'
                  )}
                </p>

                {/* Timestamp */}
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {formatDistanceToNow(new Date(message.createdAt))} ago
                </p>
              </div>
            </div>

            {/* Notification indicator */}
            <div className="absolute top-2 left-2 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageNotification;
