import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { initializeSocket } from '../../services/socket';

const ChatWindow = ({ conversation }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const currentUserId = localStorage.getItem('userId');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`/api/messages/${conversation._id}`, {
          withCredentials: true
        });
        setMessages(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch messages');
        setLoading(false);
      }
    };

    if (conversation?._id && currentUserId) {
      fetchMessages();

      // Initialize socket connection
      const socketInstance = initializeSocket(currentUserId);
      setSocket(socketInstance);

      if (socketInstance) {
        socketInstance.emit('joinConversation', conversation._id);

        // Listen for new messages
        socketInstance.on('newMessage', (message) => {
          setMessages((prev) => [...prev, message]);
        });
      }

      return () => {
        if (socketInstance) {
          socketInstance.emit('leaveConversation', conversation._id);
          socketInstance.off('newMessage');
        }
      };
    }
  }, [conversation?._id, currentUserId]);

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

      // If we have a socket connection, emit the message
      if (socket) {
        socket.emit('sendMessage', {
          conversationId: conversation._id,
          message: response.data
        });
      }

      // Add the message to our local state
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
    } catch (err) {
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
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-3">
          <img
            src={otherParticipant?.profilePicture || '/default-avatar.png'}
            alt={otherParticipant?.username}
            className="w-10 h-10 rounded-full object-cover"
          />
          <h2 className="text-lg font-medium">{otherParticipant?.username}</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`flex ${
              message.senderId._id === currentUserId ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.senderId._id === currentUserId
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <span className="text-xs opacity-70">
                {formatDistanceToNow(new Date(message.createdAt), {
                  addSuffix: true
                })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded-full hover:bg-blue-600 focus:outline-none"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;