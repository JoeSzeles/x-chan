import { io } from 'socket.io-client';

// Create a singleton socket instance
let socket = null;

// Initialize the socket connection
export const initializeSocket = (userId) => {
  if (socket && socket.connected) {
    // If already connected and authenticated, just join rooms
    if (userId) {
      socket.emit('joinNotifications', userId);
    }
    return socket;
  }

  // Create new socket connection with better error handling
  socket = io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
    withCredentials: true
  });

  // Set up connection handlers
  socket.on('connect', () => {
    console.log('[Socket] Connected successfully');
    if (userId) {
      socket.emit('joinNotifications', userId);
    }
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('error', (error) => {
    console.error('[Socket] Error:', error);
  });

  return socket;
};

// Get the current socket instance
export const getSocket = () => {
  return socket;
};

// Close the socket connection
export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Helper functions for notification-related events
export const joinNotificationRoom = (userId) => {
  if (socket && userId) {
    socket.emit('joinNotifications', userId);
  }
};

export const leaveNotificationRoom = (userId) => {
  if (socket && userId) {
    socket.emit('leaveNotifications', userId);
  }
};

// Helper for bot-related events
export const joinBotRoom = (botId) => {
  if (socket && botId) {
    socket.emit('joinBotRoom', botId);
  }
};