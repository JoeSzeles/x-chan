import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    try {
      if (!this.socket) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = process.env.NODE_ENV === 'production' ? window.location.port : '5000';
        
        this.socket = io(`${protocol}//${host}:${port}`, {
          path: '/socket.io/',
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 3,
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
    } catch (e) {
        console.log(e)
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