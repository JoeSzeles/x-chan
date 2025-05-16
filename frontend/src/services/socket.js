import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
        if (!this.socket) {
            this.socket = io(SOCKET_URL, {
                path: '/socket.io/',
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 2000,
                timeout: 20000,
                withCredentials: true,
                autoConnect: true,
                forceNew: true,
                secure: true
            });

      this.socket.on('connect', () => {
        console.log('Connected to socket server');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        if (error.message.includes('xhr poll error')) {
          console.log('Polling error, retrying...');
          this.socket.io.opts.transports = ['polling'];
          this.socket.connect();
        }
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
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

  joinConversation(conversationId) {
    if (this.socket) {
      this.socket.emit('joinConversation', conversationId);
    }
  }

  leaveConversation(conversationId) {
    if (this.socket) {
      this.socket.emit('leaveConversation', conversationId);
    }
  }

  sendMessage(data) {
    if (this.socket) {
      this.socket.emit('sendMessage', data);
    }
  }

  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('newMessage', callback);
    }
  }

  offNewMessage(callback) {
    if (this.socket) {
      this.socket.off('newMessage', callback);
    }
  }
}

export const socketService = new SocketService();