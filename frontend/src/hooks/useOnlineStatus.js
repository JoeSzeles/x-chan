
import { useState, useEffect } from 'react';
import socketService from '../services/socket';

export const useOnlineStatus = () => {
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    // Get current user ID from auth token or localStorage
    const getCurrentUserId = () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.userId;
        }
      } catch (error) {
        console.log('Error getting current user ID:', error);
      }
      return null;
    };

    const userId = getCurrentUserId();
    setCurrentUserId(userId);

    const handlePresenceChange = (event) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        
        switch (event.type) {
          case 'online':
            newSet.add(event.userId);
            break;
          case 'offline':
            newSet.delete(event.userId);
            break;
          case 'list':
            const listSet = new Set(event.users);
            // Always consider current user as online if we have their ID
            if (userId) {
              listSet.add(userId);
            }
            return listSet;
          default:
            break;
        }
        
        // Always consider current user as online
        if (userId) {
          newSet.add(userId);
        }
        
        return newSet;
      });
    };

    // Subscribe to presence changes
    socketService.onPresenceChange(handlePresenceChange);
    
    // Request current online users when component mounts
    if (socketService.isConnected) {
      socketService.requestOnlineUsers();
    }

    // Also set current user as online immediately
    if (userId) {
      setOnlineUsers(prev => new Set([...prev, userId]));
    }

    return () => {
      socketService.offPresenceChange(handlePresenceChange);
    };
  }, []);

  const isUserOnline = (userId) => {
    // Current user is always considered online
    if (userId === currentUserId) {
      return true;
    }
    return onlineUsers.has(userId);
  };

  return {
    onlineUsers: Array.from(onlineUsers),
    isUserOnline,
    currentUserId
  };
};
