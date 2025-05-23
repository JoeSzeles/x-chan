import { io } from 'socket.io-client';

let socket = null;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;
const reconnectDelay = 3000; // 3 seconds delay between reconnection attempts

export const initSocket = () => {
  if (socket && socket.connected) return socket;

  const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

  try {
    socket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: reconnectDelay,
      timeout: 10000,
      transports: ['websocket', 'polling'],
      forceNew: true,
      withCredentials: true
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully');
      reconnectAttempts = 0;
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
      } else {
        console.error('Max reconnection attempts reached');
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        socket.connect();
      }
    });

    return socket;
  } catch (error) {
    console.error('Error initializing socket:', error);
    return null;
  }
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};