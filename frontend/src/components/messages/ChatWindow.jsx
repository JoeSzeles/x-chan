import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { initSocket, getSocketInstance } from '../../services/socket';

const ChatWindow = ({ conversation }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const currentUserId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`/api/messages/${conversation._id}`, {
          withCredentials: true
        });
        setMessages(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to fetch messages');
        setLoading(false);
      }
    };

    if (conversation?._id) {
      fetchMessages();
      
      // Initialize socket connection
      const socket = initSocket();
      
      if (socket) {
        // Join conversation room
        socket.emit('joinConversation', conversation._id);
        
        // Listen for new messages
        const handleNewMessage = (message) => {
          setMessages((prev) => [...prev, message]);
        };
        
        socket.on('newMessage', handleNewMessage);
        
        return () => {
          socket.emit('leaveConversation', conversation._id);
          socket.off('newMessage', handleNewMessage);
        };
      }
    }
  }, [conversation?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await axios.post(
        `/api/messages/${conversation._id}`,
        { content: newMessage },
        { withCredentials: true }
      );

      // Emit message via socket
      const socket = getSocketInstance();
      if (socket) {
        socket.emit('sendMessage', {
          conversationId: conversation._id,
          message: response.data
        });
      }
      
      setNewMessage('');
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  if (loading) {
    return <div className="p-4">Loading messages...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  const otherParticipant = conversation.participants.find(
    (p) => p._id !== currentUserId
  );

  return (
		<div className="h-full flex flex-col" style={{ backgroundColor: 'var(--color-bg-main)' }}>
			{/* Header */}
			<div className="p-4 border-b" style={{ 
				borderColor: 'var(--color-border-default)', 
				backgroundColor: 'var(--color-bg-card)' 
			}}>
				<div className="flex items-center space-x-3">
					<img
						src={otherParticipant?.profilePicture || otherParticipant?.profileImg || '/avatar-placeholder.png'}
						alt={otherParticipant?.username}
						className="w-10 h-10 rounded-full object-cover"
						onError={(e) => {
							e.target.src = '/avatar-placeholder.png';
						}}
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