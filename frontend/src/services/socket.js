import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (!this.socket) {
      const socketUrl = window.location.hostname.includes('replit.dev') 
        ? `wss://${window.location.host}`
        : 'http://0.0.0.0:5000';

      this.socket = io(socketUrl, {
        transports: ['polling', 'websocket'],
        path: '/socket.io/',
        withCredentials: true,
        secure: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        timeout: 20000,
        autoConnect: true,
        forceNew: true
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