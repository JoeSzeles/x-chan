import React, { useEffect, useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import socketService from '../../services/socket';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import Avatar from '../common/Avatar';
import YouTubeEmbed from '../common/YouTubeEmbed';
import { TwitterEmbed } from '../common/QuoteText';

const GroupChatWindow = ({ conversation, authUser }) => {
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
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableContacts, setAvailableContacts] = useState([]);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const notificationSoundRef = useRef(null);
  const currentUserId = authUser?._id;
  const { isUserOnline } = useOnlineStatus();

  // Auto-scroll to bottom function
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '👎'];

  // Enhanced notification sound functionality
  const playNotificationSound = () => {
    const soundsEnabled = localStorage.getItem('notificationSoundsEnabled') !== 'false';
    if (!soundsEnabled) return;

    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(e => {
        console.log('Could not play notification.mp3:', e);

        if (window.AudioContext || window.webkitAudioContext) {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        }
      });
    } catch (error) {
      console.log('Notification sound error:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/group-messages/${conversation._id}/messages`, {
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
      console.error('Error fetching group messages:', err);
      setError(err.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableContacts = async () => {
    try {
      const response = await fetch(`/api/users/${authUser.username}/following`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter out users already in the group
        const filtered = data.filter(user => 
          !conversation.participants.some(p => p._id === user._id)
        );
        setAvailableContacts(filtered);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch(`/api/group-messages/${conversation._id}/mark-read`, {
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

  const addMemberToGroup = async (userId) => {
    try {
      const response = await fetch(`/api/messages/group/${conversation._id}/add-member`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        const updatedConversation = await response.json();
        // Update conversation participants
        conversation.participants = updatedConversation.participants;
        setAvailableContacts(prev => prev.filter(user => user._id !== userId));
        setShowAddMember(false);
      }
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  const removeMemberFromGroup = async (userId) => {
    if (!confirm('Are you sure you want to remove this member from the group?')) return;

    try {
      const response = await fetch(`/api/group-messages/${conversation._id}/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const updatedConversation = await response.json();
        // Update conversation participants
        conversation.participants = updatedConversation.participants;
        // Add removed user back to available contacts
        fetchAvailableContacts();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group? You will no longer receive messages from this group.')) return;

    try {
      const response = await fetch(`/api/group-messages/${conversation._id}/leave`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        // Redirect to messages page or close the conversation
        window.location.href = '/messages';
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || 'Failed to leave group');
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      alert('Failed to leave group');
    }
  };

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (conversation?._id) {
      fetchMessages();
      fetchAvailableContacts();

      if (!socketService.isConnected) {
        console.log('🔌 Socket not connected, connecting...');
        socketService.connect();

        setTimeout(() => {
          if (socketService.isConnected) {
            console.log('✅ Socket connected, joining group conversation');
            socketService.joinConversation(conversation._id);
          }
        }, 1000);
      } else {
        console.log('✅ Socket already connected, joining group conversation');
        socketService.joinConversation(conversation._id);
      }

      markAsRead();

      const handleNewMessage = (message) => {
        console.log('📨 Received new group message:', message);

        if (message.conversationId === conversation._id) {
          console.log('✅ Message is for current group conversation');

          if (message.senderId._id !== currentUserId) {
            setMessages((prev) => {
              const isDuplicate = prev.some(msg => msg._id === message._id);
              if (isDuplicate) {
                console.log('⚠️ Duplicate message detected, skipping');
                return prev;
              }

              console.log('➕ Adding new group message from other user');
              playNotificationSound();

              const newMessages = [...prev, message].sort((a, b) => 
                new Date(a.createdAt) - new Date(b.createdAt)
              );

              setTimeout(scrollToBottom, 100);
              return newMessages;
            });

            setTimeout(markAsRead, 50);
          } else {
            console.log('📤 Message from current user, checking if already displayed');
            setMessages((prev) => {
              const exists = prev.some(msg => msg._id === message._id);
              if (!exists) {
                console.log('➕ Adding own group message (socket confirmation)');
                return [...prev, message].sort((a, b) => 
                  new Date(a.createdAt) - new Date(b.createdAt)
                );
              }
              return prev;
            });
          }
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

    setNewMessage('');
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      setSending(true);
      setUploadingFiles(filesToUpload.length > 0);

      let attachments = [];

      if (filesToUpload.length > 0) {
        attachments = await uploadFiles(filesToUpload);
      }

      const response = await fetch(`/api/group-messages/${conversation._id}/messages`, {
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
        console.error('📤 Group message send failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: response.url
        });
        throw new Error(errorData.error || `Failed to send message (${response.status})`);
      }

      const messageData = await response.json();
      console.log('📤 Group message sent successfully:', messageData);

      setMessages((prev) => {
        const exists = prev.some(msg => msg._id === messageData._id);
        if (exists) return prev;

        return [...prev, messageData].sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
      });

      if (socketService.isConnected) {
        socketService.sendMessage(messageData);
      } else {
        console.warn('⚠️ Socket not connected, message sent via API only');
      }

      setTimeout(scrollToBottom, 100);
      inputRef.current?.focus();
    } catch (err) {
      console.error('Error sending group message:', err);
      setError(err.message || 'Failed to send message');
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
      const response = await fetch(`/api/group-messages/${conversation._id}/messages/${messageId}/reactions`, {
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
      const response = await fetch(`/api/group-messages/${conversation._id}/messages/${messageId}`, {
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
      const response = await fetch(`/api/group-messages/${conversation._id}/messages/${messageId}`, {
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
    try {
      setUploadingFiles(true);

      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File "${file.name}" exceeds 5MB limit`);
        }
      }

      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      console.log('📎 Uploading files to:', `/api/group-messages/${conversation._id}/upload`);

      const response = await fetch(`/api/group-messages/${conversation._id}/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload files');
      }

      const data = await response.json();
      console.log('📎 Files uploaded successfully:', data.attachments);
      return data.attachments;
    } catch (error) {
      console.error('📎 File upload error:', error);
      throw error;
    } finally {
      setUploadingFiles(false);
    }
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-main)' }}>
        <div className="text-center" style={{ color: 'var(--color-text-secondary)' }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
          Loading group messages...
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex -space-x-2">
              {conversation.participants.slice(0, 3).map((participant, index) => (
                <Avatar
                  key={participant._id}
                  user={participant}
                  size="sm"
                  showOnlineStatus={true}
                  className={`border-2 border-white ${index > 0 ? 'ml-0' : ''}`}
                />
              ))}
              {conversation.participants.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-gray-500 border-2 border-white flex items-center justify-center text-xs text-white">
                  +{conversation.participants.length - 3}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {conversation.name || 'Group Chat'}
              </h3>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {conversation.participants.length} members
              </p>
            </div>
          </div>

          {/* Show different buttons based on admin status */}
          {(conversation.admins?.includes(currentUserId) || conversation.createdBy === currentUserId) ? (
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="px-3 py-1 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-text-light)'
              }}
            >
              Add Member
            </button>
          ) : (
            <button
              onClick={handleLeaveGroup}
              className="px-3 py-1 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: 'var(--color-secondary-red)',
                color: 'var(--color-text-light)'
              }}
            >
              Leave Group
            </button>
          )}
        </div>

        {/* Add Member Panel - Only show for admins */}
        {showAddMember && (conversation.admins?.includes(currentUserId) || conversation.createdBy === currentUserId) && (
          <div className="mt-4 p-3 border rounded-lg" style={{
            backgroundColor: 'var(--color-bg-main)',
            borderColor: 'var(--color-border-default)'
          }}>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Add Members Section */}
              <div>
                <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Add Members
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {availableContacts.length > 0 ? (
                    availableContacts.map(contact => (
                      <div key={contact._id} className="flex items-center justify-between p-2 rounded hover:bg-gray-100">
                        <div className="flex items-center space-x-2">
                          <Avatar user={contact} size="xs" />
                          <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {contact.username}
                          </span>
                        </div>
                        <button
                          onClick={() => addMemberToGroup(contact._id)}
                          className="px-2 py-1 text-xs rounded transition-colors"
                          style={{
                            backgroundColor: 'var(--color-primary)',
                            color: 'var(--color-text-light)'
                          }}
                        >
                          Add
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      No available contacts to add
                    </p>
                  )}
                </div>
              </div>

              {/* Current Members Section - Only show if user is admin */}
              {(conversation.admins?.includes(currentUserId) || conversation.createdBy === currentUserId) && (
                <div>
                  <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Current Members
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {conversation.participants.map(participant => (
                      <div key={participant._id} className="flex items-center justify-between p-2 rounded hover:bg-gray-100">
                        <div className="flex items-center space-x-2">
                          <Avatar user={participant} size="xs" />
                          <div className="flex flex-col">
                            <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                              {participant.username}
                              {participant._id === currentUserId && ' (You)'}
                            </span>
                            {(conversation.admins?.includes(participant._id) || conversation.createdBy === participant._id) && (
                              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                Admin
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Only show remove button for non-admin members and not for current user */}
                        {participant._id !== currentUserId && 
                         participant._id !== conversation.createdBy && 
                         !conversation.admins?.includes(participant._id) && (
                          <button
                            onClick={() => removeMemberFromGroup(participant._id)}
                            className="px-2 py-1 text-xs rounded transition-colors"
                            style={{
                              backgroundColor: 'var(--color-secondary-red)',
                              color: 'var(--color-text-light)'
                            }}
                            title="Remove member"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4" 
        style={{ backgroundColor: 'var(--color-bg-main)' }}
      >
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
            <p className="text-sm">Start the group conversation by sending a message below!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.senderId._id === currentUserId;
            const showAvatar = index === 0 || messages[index - 1].senderId._id !== message.senderId._id;

            return (
              <div key={message._id} className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
                {/* Avatar */}
                <div className="w-10 h-10 flex-shrink-0 relative">
                  {showAvatar && !isOwnMessage && (
                    <Avatar 
                      user={message.senderId}
                      size="sm"
                      showOnlineStatus={true}
                      showBorder={true}
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
                      <span className="text-xs" style={{ color: '#dc3545' }}>
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
                              ? 'rgba(29, 78, 216, 0.5)' 
                              : 'var(--color-bg-card)',
                            color: '#ffffff',
                          }}
                        >
                          {/* Text content with YouTube and Twitter embed support */}
                          {message.content && (
                            <div className="text-sm whitespace-pre-wrap mb-2">
                              {(() => {
                                const content = message.content;
                                const parts = content.split(/(https?:\/\/[^\s]+)/g);

                                return parts.map((part, index) => {
                                  if (part.match(/^https?:\/\/[^\s]+$/)) {
                                    const isYouTube = part.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)/);
                                    const isTwitter = part.match(/(?:twitter\.com|x\.com)\/\w+\/status\/\d+/);

                                    if (isYouTube) {
                                      return <YouTubeEmbed key={index} url={part} />;
                                    } else if (isTwitter) {
                                      return <TwitterEmbed key={index} url={part} />;
                                    } else {
                                      return (
                                        <a 
                                          key={index}
                                          href={part} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="text-red-400 hover:text-red-300 hover:underline break-words"
                                        >
                                          {part}
                                        </a>
                                      );
                                    }
                                  } else {
                                    return (
                                      <span 
                                        key={index}
                                        dangerouslySetInnerHTML={{
                                          __html: part
                                            .replace(/@(\w+)/g, '<a href="/profile/$1" class="text-red-400 hover:text-red-300 hover:underline">@$1</a>')
                                            .replace(/#(\w+)/g, '<a href="/hashtag/$1" class="text-red-400 hover:text-red-300 hover:underline">#$1</a>')
                                        }}
                                      />
                                    );
                                  }
                                });
                              })()}
                            </div>
                          )}

                          {/* File attachments */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="space-y-3 mt-2">
                              {message.attachments.map((attachment, idx) => (
                                <div key={idx} className="attachment">
                                  {attachment.fileType === 'image' ? (
                                    <div className="relative max-w-sm">
                                      <img
                                        src={attachment.url}
                                        alt={attachment.filename}
                                        className="w-full h-auto rounded-lg cursor-pointer shadow-md border"
                                        style={{ 
                                          maxHeight: '300px',
                                          objectFit: 'cover',
                                          borderColor: 'var(--color-border-default)'
                                        }}
                                        onClick={() => window.open(attachment.url, '_blank')}
                                        loading="lazy"
                                      />
                                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                        {attachment.filename}
                                      </div>
                                    </div>
                                  ) : attachment.fileType === 'video' ? (
                                    <div className="max-w-sm">
                                      <video
                                        src={attachment.url}
                                        controls
                                        className="w-full h-auto rounded-lg shadow-md border"
                                        style={{ 
                                          maxHeight: '300px',
                                          borderColor: 'var(--color-border-default)'
                                        }}
                                        preload="metadata"
                                      />
                                      <p className="text-xs mt-1 opacity-70">{attachment.filename}</p>
                                    </div>
                                  ) : attachment.fileType === 'audio' ? (
                                    <div className="max-w-sm p-3 rounded-lg border" style={{ 
                                      backgroundColor: 'var(--color-bg-main)',
                                      borderColor: 'var(--color-border-default)'
                                    }}>
                                      <div className="flex items-center space-x-2 mb-2">
                                        <span className="text-lg">🎵</span>
                                        <div>
                                          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                            {attachment.filename}
                                          </p>
                                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                            {formatFileSize(attachment.fileSize)}
                                          </p>
                                        </div>
                                      </div>
                                      <audio
                                        src={attachment.url}
                                        controls
                                        className="w-full"
                                        preload="metadata"
                                      />
                                    </div>
                                  ) : (
                                    <a
                                      href={attachment.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center space-x-3 p-3 rounded-lg border hover:shadow-md transition-all duration-200 max-w-sm"
                                      style={{
                                        backgroundColor: 'var(--color-bg-card)',
                                        borderColor: 'var(--color-border-default)'
                                      }}
                                    >
                                      <div className="flex-shrink-0 text-xl">
                                        {attachment.filename.endsWith('.pdf') ? '📄' :
                                         attachment.filename.match(/\.(doc|docx)$/i) ? '📝' :
                                         attachment.filename.endsWith('.txt') ? '📄' : '📎'}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                                          {attachment.filename}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                          {formatFileSize(attachment.fileSize)}
                                        </p>
                                      </div>
                                      <div className="flex-shrink-0">
                                        <svg className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
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

                          <div className={`text-xs mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`} style={{ color: '#dc3545' }}>
                            <span className="opacity-70">
                              {new Date(message.createdAt).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit'
                              })}
                              {message.isEdited && ' • edited'}
                            </span>
                          </div>
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
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Selected Files ({selectedFiles.length}/5)
              </span>
              <button
                onClick={() => {
                  setSelectedFiles([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-xs px-2 py-1 rounded transition-colors"
                style={{ 
                  color: 'var(--color-error-text)',
                  backgroundColor: 'var(--color-error-bg)'
                }}
              >
                Clear All
              </button>
            </div>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => {
                const isLarge = file.size > 5 * 1024 * 1024;
                return (
                  <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${isLarge ? 'border-red-300 bg-red-50' : ''}`} style={{ 
                    backgroundColor: isLarge ? 'var(--color-error-bg)' : 'var(--color-bg-card)',
                    borderColor: isLarge ? 'var(--color-error-border)' : 'var(--color-border-default)'
                  }}>
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">
                        {file.type.startsWith('image/') ? '🖼️' : 
                         file.type.startsWith('video/') ? '🎥' : 
                         file.type.startsWith('audio/') ? '🎵' : '📄'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate max-w-xs" style={{ 
                          color: isLarge ? 'var(--color-error-text)' : 'var(--color-text-primary)' 
                        }}>
                          {file.name}
                        </p>
                        <p className="text-xs" style={{ 
                          color: isLarge ? 'var(--color-error-text)' : 'var(--color-text-secondary)' 
                        }}>
                          {formatFileSize(file.size)}
                          {isLarge && ' - Exceeds 5MB limit!'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeSelectedFile(index)}
                      className="p-1 rounded hover:bg-opacity-80 transition-colors"
                      style={{ 
                        color: 'var(--color-error-text)',
                        backgroundColor: 'transparent'
                      }}
                      title="Remove file"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                );
              })}
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
              placeholder={`Message group...`}
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
      </div>
    </div>
  );
};

export default GroupChatWindow;