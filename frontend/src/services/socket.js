
import { io } from 'socket.io-client';

let socket;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export const initSocket = () => {
  if (socket && socket.connected) return socket;

  // Use window.location.origin to connect to the current domain
  // This ensures proper connection in both development and production
  const baseUrl = window.location.origin;
  
  console.log('Connecting to socket server at:', baseUrl);

  socket = io(baseUrl, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    timeout: 20000,
    withCredentials: true,
    autoConnect: true
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully:', socket.id);
    reconnectAttempts = 0;
    const userId = localStorage.getItem('userId');
    if (userId) {
      socket.emit('joinNotifications', userId);
      console.log(`Joined notification room for user ${userId}`);
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    reconnectAttempts++;

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
    } else {
      console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      // If websocket fails, try polling
      if (socket.io.opts.transports[0] === 'websocket') {
        console.log('Switching to polling transport');
        socket.io.opts.transports = ['polling', 'websocket'];
      }
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      // Server initiated disconnect, try to reconnect
      socket.connect();
    }
  });

  socket.io.on("error", (error) => {
    console.error('Socket IO error:', error);
  });

  return socket;
};

export const getSocketInstance = () => {
  return socket || initSocket();
};

export const joinNotificationRoom = (userId) => {
  if (!socket || !socket.connected) initSocket();
  if (userId && socket) {
    socket.emit('joinNotifications', userId);
    console.log(`Manually joined notification room for user ${userId}`);
  }
};

export const leaveNotificationRoom = (userId) => {
  if (userId && socket && socket.connected) {
    socket.emit('leaveNotifications', userId);
    console.log(`Left notification room for user ${userId}`);
  }
};

export const disconnectSocket = () => {
  if (socket) {
    const userId = localStorage.getItem('userId');
    if (userId) {
      socket.emit('leaveNotifications', userId);
    }
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected');
  }
};
