import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (!this.socket) {
      this.socket = io('/', {
        path: '/socket.io/',
        transports: ['polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 30000,
        forceNew: true,
        withCredentials: true,
        upgrade: false
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
        if (reason === 'io server disconnect') {
          this.socket.connect();
        }
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();

export const initializeSocket = (userId) => {
  try {
    if (socket && socket.connected) {
      console.log('Socket already initialized and connected');
      if (userId) {
        // Make sure we're joined to the right notification room even if socket is already connected
        socket.emit('joinNotifications', userId);
      }
      return socket;
    }

    // Close existing socket if disconnected
    if (socket) {
      socket.close();
      socket = null;
    }

    console.log('Initializing socket connection with backend');

    // Create socket with better error handling and reconnection logic
    socket = io({
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully', socket.id);
      if (userId) {
        socket.emit('joinNotifications', userId);
        console.log(`Joined notification room for user: ${userId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${reason}`);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts.`);
      if (userId) {
        socket.emit('joinNotifications', userId);
        console.log(`Rejoined notification room for user: ${userId}`);
      }
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Attempting to reconnect socket: attempt ${attemptNumber}`);
    });

    socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });

    socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed.');
    });


    return socket;
  } catch (error) {
    console.error('Error initializing socket:', error);
    return null;
  }
};

let socket;