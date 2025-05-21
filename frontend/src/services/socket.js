
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (!this.socket) {
      const socketUrl = window.location.hostname.includes('replit.dev') 
        ? `https://${window.location.host}`
        : 'https://0.0.0.0:5000';
      
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        path: '/socket.io/',
        withCredentials: true,
        secure: true
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
