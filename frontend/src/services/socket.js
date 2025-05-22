import { io } from 'socket.io-client';

let socket = null;

export const initializeSocket = (userId) => {
  try {
    // Always create a fresh connection
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    // Create socket with simpler configuration
    socket = io('/', {
      path: '/socket.io',
      transports: ['polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true,
      withCredentials: true
    });

    socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
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

// Create functions to subscribe/unsubscribe to events
const subscribeToEvent = (eventName, callback) => {
  if (socket) socket.on(eventName, callback);
};

const unsubscribeFromEvent = (eventName, callback) => {
  if (socket) socket.off(eventName, callback);
};

export const socketService = {
  subscribeToNewMessage: (callback) => subscribeToEvent('newMessage', callback),
  unsubscribeFromNewMessage: (callback) => unsubscribeFromEvent('newMessage', callback)
};

// Export a default object for compatibility
export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  socketService
};