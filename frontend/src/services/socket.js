import { io } from 'socket.io-client';

let socket = null;

export const initializeSocket = (userId) => {
  try {
    if (socket && socket.connected) {
      console.log('Socket already initialized and connected');
      return socket;
    }

    // Close existing socket if disconnected
    if (socket) {
      socket.close();
      socket = null;
    }

    console.log('Initializing socket connection with backend');

    // Get auth token from localStorage
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    console.log('Socket initialization with user:', { 
      userId, 
      hasToken: !!token,
      userDataId: userData?._id 
    });

    // Create socket with better error handling and reconnection logic
    socket = io({
      path: '/socket.io',
      transports: ['polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
      withCredentials: true,
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully', socket.id);
      if (userId) {
        socket.emit('joinNotifications', userId);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      console.log('Connection details:', {
        readyState: socket.io?.engine?.readyState,
        transport: socket.io?.engine?.transport?.name,
        uri: socket.io?.uri
      });
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log(`Socket reconnection attempt ${attempt}`);
    });

    socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after all attempts');
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);

      if (reason === 'io server disconnect') {
        // Server initiated disconnect - try reconnect manually
        setTimeout(() => {
          console.log('Attempting manual reconnection after server disconnect');
          socket.connect();
        }, 3000);
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
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
    console.log('Socket disconnected by user action');
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