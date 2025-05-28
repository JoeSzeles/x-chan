
import React, { useEffect, useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import socketService from '../../services/socket';

const ChatWindow = ({ conversation, authUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const currentUserId = authUser?._id;

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/messages/${conversation._id}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(data);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conversation?._id) {
      fetchMessages();
      socketService.connect();
      socketService.joinConversation(conversation._id);

      const handleNewMessage = (message) => {
        setMessages((prev) => {
          // Prevent duplicate messages by checking if message already exists
          const messageExists = prev.some(msg => msg._id === message._id);
          if (messageExists) {
            return prev;
          }
          return [...prev, message];
        });
      };

      socketService.onNewMessage(handleNewMessage);

      // Scroll to bottom after initial load with a small delay
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      }, 100);

      return () => {
        socketService.leaveConversation(conversation._id);
        socketService.offNewMessage(handleNewMessage);
      };
    }
  }, [conversation?._id]);

  useEffect(() => {
    // Only auto-scroll if user is near the bottom or if it's a new message from current user
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (messagesContainer && messages.length > 0) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      // Auto-scroll if user is near bottom or if the last message is from current user
      const lastMessage = messages[messages.length - 1];
      const isOwnMessage = lastMessage?.senderId._id === currentUserId;
      
      if (isNearBottom || isOwnMessage) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, currentUserId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage;
    setNewMessage(''); // Clear input immediately for better UX

    try {
      setSending(true);
      const response = await fetch(`/api/messages/${conversation._id}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content: messageContent })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send message');
      }

      const messageData = await response.json();
      
      // Add message to local state immediately
      setMessages((prev) => [...prev, messageData]);
      
      // Send via socket for real-time updates to other participants
      socketService.sendMessage(messageData);
      
      inputRef.current?.focus();
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
      // Restore message content if sending failed
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const otherParticipant = conversation.participants.find(
    (p) => p._id !== currentUserId
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-main)' }}>
        <div className="text-center" style={{ color: 'var(--color-text-secondary)' }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
          Loading messages...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--color-bg-main)' }}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b" style={{ 
        borderColor: 'var(--color-border-default)', 
        backgroundColor: 'var(--color-bg-card)' 
      }}>
        <div className="flex items-center space-x-3">
          <img
            src={otherParticipant?.profileImg || otherParticipant?.profilePicture || '/avatar-placeholder.png'}
            alt={otherParticipant?.username}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {otherParticipant?.fullName || otherParticipant?.username}
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              @{otherParticipant?.username}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: 'var(--color-bg-main)' }}>
        {error && (
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error-text)' }}>
            <p className="text-sm font-medium mb-2">Error: {error}</p>
            <button
              onClick={fetchMessages}
              className="text-xs px-3 py-1 rounded transition-colors duration-300"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-text-light)'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {messages.length === 0 && !error ? (
          <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="text-lg mb-2">No messages yet</p>
            <p className="text-sm">Start the conversation by sending a message below!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.senderId._id === currentUserId;
            const showAvatar = index === 0 || messages[index - 1].senderId._id !== message.senderId._id;
            
            return (
              <div key={message._id} className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
                {/* Avatar */}
                <div className="w-10 h-10 flex-shrink-0">
                  {showAvatar && !isOwnMessage && (
                    <img
                      src={message.senderId.profileImg || '/avatar-placeholder.png'}
                      alt={message.senderId.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                </div>

                {/* Message Content */}
                <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'mr-3' : 'ml-0'}`}>
                  {showAvatar && (
                    <div className={`flex items-center space-x-2 mb-1 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {isOwnMessage ? 'You' : message.senderId.username}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {formatDistanceToNow(new Date(message.createdAt))} ago
                      </span>
                    </div>
                  )}
                  
                  <div
                    className={`px-4 py-2 rounded-lg break-words ${isOwnMessage ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                    style={{
                      backgroundColor: isOwnMessage 
                        ? 'var(--color-primary)' 
                        : 'var(--color-bg-card)',
                      color: isOwnMessage 
                        ? 'var(--color-text-light)' 
                        : 'var(--color-text-primary)',
                    }}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0 p-4 border-t" style={{ 
        borderColor: 'var(--color-border-default)', 
        backgroundColor: 'var(--color-bg-card)' 
      }}>
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message @${otherParticipant?.username}...`}
              disabled={sending}
              className="w-full px-4 py-3 rounded-lg border focus:outline-none transition-colors duration-300 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-input-bg)',
                color: 'var(--color-input-text)',
                borderColor: 'var(--color-input-border)',
                borderRadius: '24px'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-border-focus)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-input-border)'}
            />
            {/* Character count or typing indicator could go here */}
          </div>
          
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-6 py-3 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            style={{
              backgroundColor: newMessage.trim() ? 'var(--color-primary)' : 'var(--color-bg-card)',
              color: newMessage.trim() ? 'var(--color-text-light)' : 'var(--color-text-secondary)',
              minWidth: '56px'
            }}
            onMouseEnter={(e) => {
              if (!e.target.disabled && newMessage.trim()) {
                e.target.style.backgroundColor = 'var(--color-primary-dark)';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.target.disabled && newMessage.trim()) {
                e.target.style.backgroundColor = 'var(--color-primary)';
              }
            }}
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            )}
          </button>
        </form>
        
        {/* Optional: Typing indicator */}
        <div className="mt-2 h-4">
          {/* Add typing indicator here if needed */}
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
