
import { io } from 'socket.io-client';

let socket = null;

export const initializeSocket = (userId) => {
  try {
    if (socket) {
      console.log('Socket already initialized');
      return socket;
    }

    console.log('Initializing socket connection');
    socket = io({
      path: '/socket.io',
      transports: ['polling'],
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully');
      if (userId) {
        socket.emit('joinNotifications', userId);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
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

export const socketService = {
  subscribeToNewMessage: (callback) => {
    if (socket) socket.on('newMessage', callback);
  },
  unsubscribeFromNewMessage: (callback) => {
    if (socket) socket.off('newMessage', callback);
  },
  joinConversation: (conversationId) => {
    if (socket) socket.emit('joinConversation', conversationId);
  },
  leaveConversation: (conversationId) => {
    if (socket) socket.emit('leaveConversation', conversationId);
  },
  sendMessage: (message) => {
    if (socket) socket.emit('sendMessage', message);
  }
};

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  socketService
};
