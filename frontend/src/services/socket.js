
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (!this.socket) {
      const socketOptions = {
        transports: ['polling', 'websocket'],
        path: '/socket.io',
        withCredentials: true,
        secure: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
        rejectUnauthorized: false,
        extraHeaders: {
          'Access-Control-Allow-Origin': '*'
        }
      };

      console.log('[Socket] Initializing with options:', socketOptions);
      this.socket = io('/', socketOptions);

      this.socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', {
          message: error.message,
          description: error.description,
          type: error.type,
          stack: error.stack
        });
      });

      this.socket.on('connect_timeout', (timeout) => {
        console.error('[Socket] Connection timeout:', timeout);
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('[Socket] Reconnection attempt:', attemptNumber);
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('[Socket] Reconnection error:', error);
      });

      this.socket.on('reconnect_failed', () => {
        console.error('[Socket] Reconnection failed');
      });

      this.socket.on('error', (error) => {
        console.error('[Socket] General error:', error);
      });

      this.socket.on('connect', () => {
        console.log('[Socket] Connected successfully:', {
          id: this.socket.id,
          transport: this.socket.io.engine.transport.name
        });
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', {
          reason,
          wasConnected: this.socket.connected,
          id: this.socket.id
        });
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
