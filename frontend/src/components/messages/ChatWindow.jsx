import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import socketService from '../../services/socket';

const ChatWindow = ({ conversation, authUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const currentUserId = authUser?._id;

  useEffect(() => {
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
        setLoading(false);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError(err.message || 'Failed to fetch messages');
        setLoading(false);
      }
    };

    if (conversation?._id) {
      fetchMessages();
      socketService.connect();
      socketService.joinConversation(conversation._id);

      const handleNewMessage = (message) => {
        setMessages((prev) => [...prev, message]);
      };

      socketService.onNewMessage(handleNewMessage);

      return () => {
        socketService.leaveConversation(conversation._id);
        socketService.offNewMessage(handleNewMessage);
      };
    }
  }, [conversation?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(`/api/messages/${conversation._id}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content: newMessage })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send message');
      }

      const messageData = await response.json();
      socketService.sendMessage(messageData);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
    }
  };

  

  const otherParticipant = conversation.participants.find(
    (p) => p._id !== currentUserId
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-main)' }}>
        <div className="text-center" style={{ color: 'var(--color-text-secondary)' }}>
          Loading messages...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-main)' }}>
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchMessages}
            className="px-4 py-2 rounded-lg transition-colors duration-300"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-text-light)'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
		<div className="h-full flex flex-col" style={{ backgroundColor: 'var(--color-bg-main)' }}>
			{/* Header */}
			<div className="p-4 border-b" style={{ 
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
							{otherParticipant?.username}
						</h3>
						<p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
							@{otherParticipant?.username}
						</p>
					</div>
				</div>
			</div>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto p-4" ref={messagesEndRef}>
				{messages.map((message) => (
					<div
						key={message._id}
						className={`mb-4 flex ${
							message.senderId._id === currentUserId ? 'justify-end' : 'justify-start'
						}`}
					>
						<div
							className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg`}
							style={{
								backgroundColor: message.senderId._id === currentUserId 
									? 'var(--color-primary)' 
									: 'var(--color-bg-card)',
								color: message.senderId._id === currentUserId 
									? 'var(--color-text-light)' 
									: 'var(--color-text-primary)',
								borderRadius: 'var(--border-radius)'
							}}
						>
							<p className="text-sm">{message.content}</p>
							<p className="text-xs mt-1 opacity-70">
								{formatDistanceToNow(new Date(message.createdAt))} ago
							</p>
						</div>
					</div>
				))}
				<div ref={messagesEndRef} />
			</div>

			{/* Message input */}
			<div className="p-4 border-t" style={{ 
				borderColor: 'var(--color-border-default)', 
				backgroundColor: 'var(--color-bg-card)' 
			}}>
				<div className="flex space-x-2">
					<input
						type="text"
						value={newMessage}
						onChange={(e) => setNewMessage(e.target.value)}
						onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
						placeholder="Type a message..."
						className="flex-1 px-4 py-2 rounded-lg border focus:outline-none transition-colors duration-300"
						style={{
							backgroundColor: 'var(--color-input-bg)',
							color: 'var(--color-input-text)',
							borderColor: 'var(--color-input-border)',
							borderRadius: 'var(--border-radius)'
						}}
						onFocus={(e) => e.target.style.borderColor = 'var(--color-border-focus)'}
						onBlur={(e) => e.target.style.borderColor = 'var(--color-input-border)'}
					/>
					<button
						onClick={handleSendMessage}
						disabled={!newMessage.trim()}
						className="px-4 py-2 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
						style={{
							backgroundColor: 'var(--color-primary)',
							color: 'var(--color-text-light)',
							borderRadius: 'var(--border-radius)'
						}}
						onMouseEnter={(e) => !e.target.disabled && (e.target.style.backgroundColor = 'var(--color-primary-dark)')}
						onMouseLeave={(e) => !e.target.disabled && (e.target.style.backgroundColor = 'var(--color-primary)')}
					>
						Send
					</button>
				</div>
			</div>
		</div>
	);
};

export default ChatWindow;