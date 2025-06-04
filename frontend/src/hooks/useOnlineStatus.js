
import { useState, useEffect } from 'react';
import socketService from '../services/socket';

export const useOnlineStatus = () => {
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
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
            return new Set(event.users);
          default:
            break;
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

    return () => {
      socketService.offPresenceChange(handlePresenceChange);
    };
  }, []);

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  return {
    onlineUsers: Array.from(onlineUsers),
    isUserOnline
  };
};
