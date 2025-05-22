
import { io } from 'socket.io-client';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

export const initializeSocket = (userId) => {
  if (!userId) {
    console.error('Cannot initialize socket without userId');
    return null;
  }

  // If we already have a socket instance, return it
  if (socket) {
    return socket;
  }

  try {
    // Determine the correct socket URL based on the environment
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    
    // For development in Replit, use a relative URL to leverage the Vite proxy
    const socketUrl = '/';

    console.log(`Attempting to connect socket to: ${socketUrl} (will be proxied)`);

    // Create socket connection with more robust configuration
    socket = io(socketUrl, {
      transports: ['polling', 'websocket'], // Start with polling then upgrade
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 2000,
      timeout: 20000,
      path: '/socket.io',
      withCredentials: true
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully');
      reconnectAttempts = 0;
      if (userId) {
        socket.emit('joinNotifications', userId);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error details:', error);
      reconnectAttempts++;
      
      console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('Max reconnection attempts reached');
      }
    });

    socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after maximum attempts');
    });

    socket.on('error', (error) => {
      console.error('[Socket] Socket error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Socket disconnected:', reason);
      
      if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'transport error') {
        console.log('[Socket] Polling error detected, attempting reconnect...');
      }
    });

    return socket;
  } catch (error) {
    console.error('Error initializing socket:', error);
    return null;
  }
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Add helper methods for the chat functionality
export const socketService = {
  connect: (userId) => initializeSocket(userId),
  joinConversation: (conversationId) => {
    if (socket) socket.emit('joinConversation', conversationId);
  },
  leaveConversation: (conversationId) => {
    if (socket) socket.emit('leaveConversation', conversationId);
  },
  sendMessage: (message) => {
    if (socket) socket.emit('sendMessage', message);
  },
  onNewMessage: (callback) => {
    if (socket) socket.on('newMessage', callback);
  },
  offNewMessage: (callback) => {
    if (socket) socket.off('newMessage', callback);
  }
};
