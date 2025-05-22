import { io } from 'socket.io-client';

let socket;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export const initSocket = () => {
  if (socket && socket.connected) return socket;

  // Use window.location.origin to ensure we connect to the same domain
  const baseUrl = window.location.origin.includes('localhost') ? 
    'http://0.0.0.0:5000' : 
    window.location.origin;

  console.log('Connecting to socket server at:', baseUrl);

  socket = io(baseUrl, {
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    timeout: 10000,
    withCredentials: true,
    forceNew: true,
    autoConnect: true
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully');
    reconnectAttempts = 0;
    const userId = localStorage.getItem('userId');
    if (userId) {
      socket.emit('joinNotifications', userId);
      console.log(`Joined notification room for user ${userId}`);
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    reconnectAttempts++;

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
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