import { useState, useEffect } from 'react';
import socketService from '../services/socket';

export const useUnreadMessages = (authUser) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/messages/unread-count', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to play notification sound
  const playNotificationSound = () => {
    const audio = new Audio('/sounds/notification.mp3'); // Replace with your sound file path
    audio.play();
  };

  useEffect(() => {
    if (authUser) {
      fetchUnreadCount();

      // Listen for new messages via socket
      const handleNewMessage = (message) => {
        // Only increment if message is not from current user
        if (message.senderId._id !== authUser._id) {
          setUnreadCount(prev => prev + 1);
          // Play notification sound
          playNotificationSound();
        }
      };

      socketService.onNewMessage(handleNewMessage);

      // Refresh count every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);

      return () => {
        socketService.offNewMessage(handleNewMessage);
        clearInterval(interval);
      };
    }
  }, [authUser]);

  const markAsRead = () => {
    setUnreadCount(0);
  };

  const decrementCount = (count = 1) => {
    setUnreadCount(prev => Math.max(0, prev - count));
  };

  return {
    unreadCount,
    loading,
    fetchUnreadCount,
    markAsRead,
    decrementCount
  };
};