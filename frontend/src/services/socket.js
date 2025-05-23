
/**
 * Socket.io service for handling real-time communications
 */

import { io } from 'socket.io-client';

let socket = null;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;
const reconnectDelay = 3000; // 3 seconds delay between reconnection attempts
let pendingReconnectTimer = null;

/**
 * Initialize the socket connection
 * @returns {Object|null} The socket instance or null if initialization failed
 */
export const initSocket = () => {
  if (socket && socket.connected) {
    console.log("Socket already connected, reusing existing connection");
    return socket;
  }

  try {
    // Clear any pending reconnection attempts
    if (pendingReconnectTimer) {
      clearTimeout(pendingReconnectTimer);
      pendingReconnectTimer = null;
    }

    // Use the current origin if no specific URL is provided
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    console.log(`Initializing socket connection to ${socketUrl}`);

    socket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: reconnectDelay,
      timeout: 20000, // Increased timeout for better reliability
      transports: ['websocket', 'polling'],
      forceNew: false, // Don't force new connection if one exists
      withCredentials: true,
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully', {
        id: socket.id,
        transport: socket.io.engine.transport.name
      });
      reconnectAttempts = 0;
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        
        // Schedule manual reconnect if auto-reconnect fails
        pendingReconnectTimer = setTimeout(() => {
          console.log("Attempting manual reconnection...");
          socket.connect();
        }, reconnectDelay * 2);
      } else {
        console.error('Max reconnection attempts reached');
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);

      if (reason === 'io server disconnect' || reason === 'transport close') {
        // Server initiated disconnect or connection lost, try to reconnect
        pendingReconnectTimer = setTimeout(() => {
          console.log("Attempting reconnection after disconnect...");
          socket.connect();
        }, reconnectDelay);
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      // Don't automatically reconnect on error, wait for disconnect event
    });

    return socket;
  } catch (error) {
    console.error('Error initializing socket:', error);
    
    // Schedule retry for initialization errors
    pendingReconnectTimer = setTimeout(() => {
      console.log("Retrying socket initialization after error...");
      initSocket();
    }, reconnectDelay * 2);
    
    return null;
  }
};

/**
 * Get the existing socket instance or initialize a new one
 * @returns {Object|null} The socket instance or null if initialization failed
 */
export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  
  // If socket exists but isn't connected, reconnect
  if (socket && !socket.connected) {
    console.log("Socket exists but not connected, reconnecting...");
    socket.connect();
  }
  
  return socket;
};

// For backward compatibility
export const getSocketInstance = getSocket;

/**
 * Close the socket connection
 */
export const closeSocket = () => {
  if (socket) {
    console.log("Closing socket connection");
    
    // Clear any pending reconnections
    if (pendingReconnectTimer) {
      clearTimeout(pendingReconnectTimer);
      pendingReconnectTimer = null;
    }
    
    socket.disconnect();
    socket = null;
  }
};

/**
 * Safely emit a socket event with error handling
 * @param {string} event - The event name
 * @param {any} data - The data to send
 * @param {Function} callback - Optional callback for acknowledgment
 * @returns {boolean} - Whether the emit was successful
 */
export const safeEmit = (event, data, callback) => {
  try {
    const socketInstance = getSocket();
    if (!socketInstance) {
      console.error(`Cannot emit ${event}: Socket not available`);
      return false;
    }
    
    if (!socketInstance.connected) {
      console.warn(`Socket not connected when emitting ${event}, reconnecting...`);
      socketInstance.connect();
    }
    
    socketInstance.emit(event, data, callback);
    return true;
  } catch (error) {
    console.error(`Error emitting socket event ${event}:`, error);
    return false;
  }
};
