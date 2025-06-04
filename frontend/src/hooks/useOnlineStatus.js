
import { useState, useEffect } from 'react';
import socketService from '../services/socket';

export const useOnlineStatus = () => {
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    const handlePresenceChange = (event) => {
      console.log('🟢 Presence change event:', event);
      
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        
        switch (event.type) {
          case 'online':
            newSet.add(event.userId);
            console.log('👋 User came online:', event.userId);
            break;
          case 'offline':
            newSet.delete(event.userId);
            console.log('👋 User went offline:', event.userId);
            break;
          case 'list':
            console.log('📋 Received online users list:', event.users);
            return new Set(event.users);
          default:
            console.warn('⚠️ Unknown presence event type:', event.type);
            break;
        }
        
        console.log('📊 Updated online users:', Array.from(newSet));
        return newSet;
      });
    };

    // Subscribe to presence changes
    socketService.onPresenceChange(handlePresenceChange);
    
    // Request current online users when component mounts
    if (socketService.isConnected) {
      console.log('🔌 Socket connected, requesting online users');
      socketService.requestOnlineUsers();
    } else {
      console.log('🔌 Socket not connected, will request online users when connected');
    }

    // Also request online users when socket connects
    const handleSocketConnect = () => {
      console.log('🔌 Socket connected, requesting online users');
      socketService.requestOnlineUsers();
    };

    socketService.on('connect', handleSocketConnect);

    return () => {
      socketService.offPresenceChange(handlePresenceChange);
      socketService.off('connect', handleSocketConnect);
    };
  }, []);

  const isUserOnline = (userId) => {
    const online = onlineUsers.has(userId);
    console.log(`🔍 Checking if user ${userId} is online:`, online);
    return online;
  };

  return {
    onlineUsers: Array.from(onlineUsers),
    isUserOnline
  };
};
