import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (!this.socket) {
      const host = window.location.hostname;
      const port = '5000';
      const url = `${window.location.protocol}//${host}:${port}`;
      
      this.socket = io(url, {
        path: '/socket.io/',
        transports: ['polling', 'websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 60000,
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