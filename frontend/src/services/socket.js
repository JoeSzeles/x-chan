import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (!this.socket) {
      this.socket = io(window.location.origin, {
        transports: ['polling', 'websocket'],
        path: '/socket.io/',
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
        forceNew: true,
        withCredentials: true
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