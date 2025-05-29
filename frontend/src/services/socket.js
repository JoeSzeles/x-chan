import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    if (!this.socket || !this.isConnected) {
      const token = localStorage.getItem('token');
      this.socket = io(window.location.origin, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
        this.isConnected = true;
        
        // Store user ID for typing indicators
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            this.userId = payload.userId;
            // Also store it on the socket for backend access
            this.socket.userId = payload.userId;
            console.log('Socket user ID set:', payload.userId);
          } catch (e) {
            console.warn('Could not parse user ID from token');
          }
        }
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.isConnected = false;
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  joinConversation(conversationId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_conversation', conversationId);
    }
  }

  leaveConversation(conversationId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_conversation', conversationId);
    }
  }

  sendMessage(message) {
    if (this.socket && this.isConnected) {
      // Emit to specific conversation room
      this.socket.emit('send_message', {
        conversationId: message.conversationId,
        message: message
      });
    }
  }

  // Listen for typing indicators
  onTyping(callback) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  offTyping(callback) {
    if (this.socket) {
      this.socket.off('user_typing', callback);
    }
  }

  sendTyping(conversationId, isTyping) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing', { conversationId, isTyping });
    }
  }

  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  offNewMessage(callback) {
    if (this.socket) {
      this.socket.off('new_message', callback);
    }
  }
}

// Create singleton instance
const socketService = new SocketService();
export default socketService;

export const initSocket = () => {
  socketService.connect();
  return socketService;
};

export const getSocketInstance = () => {
  return socketService;
};