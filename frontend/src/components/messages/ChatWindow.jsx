
import React, { useEffect, useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import socketService from '../../services/socket';

const ChatWindow = ({ conversation, authUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const currentUserId = authUser?._id;

  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '👎'];

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

  const markAsRead = async () => {
    try {
      await fetch(`/api/messages/conversations/${conversation._id}/mark-read`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  useEffect(() => {
    if (conversation?._id) {
      fetchMessages();
      
      // Ensure socket is connected
      if (!socketService.isConnected) {
        socketService.connect();
      }
      
      socketService.joinConversation(conversation._id);

      // Mark messages as read when opening conversation
      markAsRead();

      const handleNewMessage = (message) => {
        console.log('Received new message:', message);
        
        // Process messages for the current conversation
        if (message.conversationId === conversation._id) {
          // Don't add messages sent by current user (they're already added optimistically)
          if (message.senderId._id === currentUserId) {
            console.log('Message from current user, already displayed');
            return;
          }
          
          setMessages((prev) => {
            // Prevent duplicate messages by checking if message already exists
            const messageExists = prev.some(msg => msg._id === message._id);
            if (messageExists) {
              console.log('Message already exists, skipping');
              return prev;
            }
            console.log('Adding new message from other user to state');
            return [...prev, message];
          });
          
          // Mark as read immediately since conversation is open
          setTimeout(markAsRead, 500);
        } else {
          // Message is for a different conversation, just log it
          console.log('Message for different conversation, will be handled by notification system');
        }
      };

      socketService.onNewMessage(handleNewMessage);

      return () => {
        socketService.leaveConversation(conversation._id);
        socketService.offNewMessage(handleNewMessage);
      };
    }
  }, [conversation?._id, currentUserId]);

  

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && selectedFiles.length === 0) || sending) return;

    const messageContent = newMessage;
    const filesToUpload = [...selectedFiles];
    
    // Clear inputs immediately for better UX
    setNewMessage('');
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      setSending(true);
      setUploadingFiles(filesToUpload.length > 0);

      let attachments = [];
      
      // Upload files if any
      if (filesToUpload.length > 0) {
        attachments = await uploadFiles(filesToUpload);
      }

      const response = await fetch(`/api/messages/${conversation._id}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          content: messageContent,
          attachments: attachments
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send message');
      }

      const messageData = await response.json();
      
      // Add message to local state immediately for better UX
      setMessages((prev) => [...prev, messageData]);
      
      // Send via socket for real-time updates to other participants
      socketService.sendMessage(messageData);
      
      inputRef.current?.focus();
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
      // Restore message content and files if sending failed
      setNewMessage(messageContent);
      setSelectedFiles(filesToUpload);
    } finally {
      setSending(false);
      setUploadingFiles(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const response = await fetch(`/api/messages/conversations/${conversation._id}/messages/${messageId}/reactions`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ emoji })
      });

      if (response.ok) {
        const updatedMessage = await response.json();
        setMessages(prev => prev.map(msg => 
          msg._id === messageId ? updatedMessage : msg
        ));
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
    setShowEmojiPicker(null);
  };

  const handleEditMessage = async (messageId) => {
    try {
      const response = await fetch(`/api/messages/conversations/${conversation._id}/messages/${messageId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content: editContent })
      });

      if (response.ok) {
        const updatedMessage = await response.json();
        setMessages(prev => prev.map(msg => 
          msg._id === messageId ? updatedMessage : msg
        ));
        setEditingMessage(null);
        setEditContent('');
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    try {
      const response = await fetch(`/api/messages/conversations/${conversation._id}/messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const startEditing = (message) => {
    setEditingMessage(message._id);
    setEditContent(message.content);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      alert('You can only upload up to 5 files at once');
      return;
    }
    setSelectedFiles(files);
  };

  const uploadFiles = async (files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`/api/messages/conversations/${conversation._id}/upload`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload files');
    }

    const data = await response.json();
    return data.attachments;
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
                  
                  <div className="group relative">
                    {editingMessage === message._id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border"
                          style={{
                            backgroundColor: 'var(--color-input-bg)',
                            borderColor: 'var(--color-input-border)',
                            color: 'var(--color-input-text)'
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleEditMessage(message._id);
                            } else if (e.key === 'Escape') {
                              setEditingMessage(null);
                              setEditContent('');
                            }
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleEditMessage(message._id)}
                          className="px-3 py-1 text-xs rounded"
                          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-light)' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingMessage(null);
                            setEditContent('');
                          }}
                          className="px-3 py-1 text-xs rounded"
                          style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-text-light)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
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
                          {/* Text content */}
                          {message.content && (
                            <p className="text-sm whitespace-pre-wrap mb-2">{message.content}</p>
                          )}
                          
                          {/* File attachments */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="space-y-2">
                              {message.attachments.map((attachment, idx) => (
                                <div key={idx} className="attachment">
                                  {attachment.fileType === 'image' ? (
                                    <img
                                      src={attachment.url}
                                      alt={attachment.filename}
                                      className="max-w-xs rounded-lg cursor-pointer"
                                      onClick={() => window.open(attachment.url, '_blank')}
                                    />
                                  ) : attachment.fileType === 'video' ? (
                                    <video
                                      src={attachment.url}
                                      controls
                                      className="max-w-xs rounded-lg"
                                    />
                                  ) : attachment.fileType === 'audio' ? (
                                    <audio
                                      src={attachment.url}
                                      controls
                                      className="w-full max-w-xs"
                                    />
                                  ) : (
                                    <a
                                      href={attachment.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                      <div className="flex-shrink-0">
                                        📄
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                          {attachment.filename}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {formatFileSize(attachment.fileSize)}
                                        </p>
                                      </div>
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {message.isEdited && (
                            <span className="text-xs opacity-70 ml-2">(edited)</span>
                          )}
                        </div>
                        
                        {/* Reactions */}
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {message.reactions.map((reaction, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleReaction(message._id, reaction.emoji)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                                  reaction.users.includes(currentUserId)
                                    ? 'bg-blue-100 text-blue-600 border border-blue-300'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                <span>{reaction.emoji}</span>
                                <span>{reaction.count}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Action buttons (show on hover) */}
                        <div className={`absolute ${isOwnMessage ? 'left-0' : 'right-0'} top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg shadow-lg p-1 flex gap-1`}>
                          {/* Emoji picker button */}
                          <div className="relative">
                            <button
                              onClick={() => setShowEmojiPicker(showEmojiPicker === message._id ? null : message._id)}
                              className="p-1 hover:bg-gray-100 rounded text-sm"
                              title="Add reaction"
                            >
                              😊
                            </button>
                            {showEmojiPicker === message._id && (
                              <div className="absolute bottom-full mb-1 bg-white border rounded-lg p-2 shadow-lg flex gap-1 z-10">
                                {commonEmojis.map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(message._id, emoji)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Edit/Delete buttons for own messages */}
                          {isOwnMessage && (
                            <>
                              <button
                                onClick={() => startEditing(message)}
                                className="p-1 hover:bg-gray-100 rounded text-xs"
                                title="Edit message"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(message._id)}
                                className="p-1 hover:bg-gray-100 rounded text-xs"
                                title="Delete message"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
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
        {/* Selected files preview */}
        {selectedFiles.length > 0 && (
          <div className="mb-3 p-3 border rounded-lg" style={{ 
            backgroundColor: 'var(--color-bg-main)',
            borderColor: 'var(--color-border-default)'
          }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Selected Files ({selectedFiles.length}/5)
              </span>
              <button
                onClick={() => {
                  setSelectedFiles([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">
                      {file.type.startsWith('image/') ? '🖼️' : 
                       file.type.startsWith('video/') ? '🎥' : 
                       file.type.startsWith('audio/') ? '🎵' : '📄'}
                    </span>
                    <span className="text-sm font-medium text-gray-700 truncate max-w-xs">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <button
                    onClick={() => removeSelectedFile(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
          
          {/* File upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploadingFiles}
            className="p-3 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-default)'
            }}
            title="Attach files"
          >
            📎
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          />
          
          <button
            type="submit"
            disabled={(!newMessage.trim() && selectedFiles.length === 0) || sending || uploadingFiles}
            className="px-6 py-3 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            style={{
              backgroundColor: (newMessage.trim() || selectedFiles.length > 0) ? 'var(--color-primary)' : 'var(--color-bg-card)',
              color: (newMessage.trim() || selectedFiles.length > 0) ? 'var(--color-text-light)' : 'var(--color-text-secondary)',
              minWidth: '56px'
            }}
            onMouseEnter={(e) => {
              if (!e.target.disabled && (newMessage.trim() || selectedFiles.length > 0)) {
                e.target.style.backgroundColor = 'var(--color-primary-dark)';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.target.disabled && (newMessage.trim() || selectedFiles.length > 0)) {
                e.target.style.backgroundColor = 'var(--color-primary)';
              }
            }}
          >
            {(sending || uploadingFiles) ? (
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
