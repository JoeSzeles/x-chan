
import { io } from 'socket.io-client';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

export const initializeSocket = (userId) => {
  if (!userId) {
    console.error('Cannot initialize socket without userId');
    return null;
  }

  try {
    // Determine the correct socket URL based on the environment
    const host = window.location.hostname;
    const port = '5000'; // Fixed port for the backend
    const socketUrl = `${window.location.protocol}//${host}:${port}`;

    console.log(`Attempting to connect socket to: ${socketUrl}`);

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
