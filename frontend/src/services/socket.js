import { io } from 'socket.io-client';

let socket;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

export const initializeSocket = (userId) => {
  if (!userId) {
    console.error('Cannot initialize socket without userId');
    return null;
  }

  try {
    // Determine the correct socket URL based on the environment
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    const host = window.location.hostname;
    const port = process.env.NODE_ENV === 'production' ? '' : ':5000';
    const socketUrl = `${protocol}://${host}${port}`;

    console.log(`Attempting to connect socket to: ${socketUrl}`);

    // Create socket connection with more robust configuration
    socket = io(socketUrl, {
      transports: ['polling'], // Start with polling only for reliability
      forceNew: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      timeout: 30000,
      path: '/socket.io',
      withCredentials: true
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully');
      reconnectAttempts = 0;
      socket.emit('joinNotifications', userId);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      reconnectAttempts++;

      console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('Max reconnection attempts reached');
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
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
  }
};