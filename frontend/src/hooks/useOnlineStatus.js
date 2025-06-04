
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import socketService from '../services/socket';

export const useOnlineStatus = () => {
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [currentUserId, setCurrentUserId] = useState(null);

  // Get current user ID from auth token
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

  // Fetch online users from API (same as WhosOnline)
  const { data: apiOnlineUsers } = useQuery({
    queryKey: ["onlineUsers"],
    queryFn: async () => {
      const res = await fetch('/api/users/online');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch online users");
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000, // Consider data stale after 25 seconds
  });

  useEffect(() => {
    const userId = getCurrentUserId();
    setCurrentUserId(userId);

    // Update online users from API data
    if (apiOnlineUsers && Array.isArray(apiOnlineUsers)) {
      const userIds = apiOnlineUsers.map(user => user._id);
      const newSet = new Set(userIds);
      
      // Always consider current user as online
      if (userId) {
        newSet.add(userId);
      }
      
      setOnlineUsers(newSet);
    }
  }, [apiOnlineUsers]);

  useEffect(() => {
    const userId = getCurrentUserId();
    
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

    // Subscribe to presence changes for real-time updates
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
