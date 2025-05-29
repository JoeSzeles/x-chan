import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.messageCallbacks = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  connect() {
    if (this.socket && this.isConnected) {
      console.log('Socket already connected');
      return;
    }

    const token = localStorage.getItem('token');
    console.log('Connecting socket with token:', !!token);
    
    this.socket = io(window.location.origin, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.isConnected = false;
      
      // Auto-reconnect for certain disconnect reasons
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        setTimeout(() => {
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            console.log('🔄 Attempting to reconnect...');
            this.reconnectAttempts++;
            this.connect();
          }
        }, 2000);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });
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
      // Remove any existing listeners first to prevent duplicates
      this.socket.off('new_message');
      this.socket.on('new_message', (message) => {
        console.log('📨 Received new message via socket:', message);
        callback(message);
      });
      this.messageCallbacks.add(callback);
    }
  }

  offNewMessage(callback) {
    if (this.socket) {
      this.socket.off('new_message', callback);
      this.messageCallbacks.delete(callback);
    }
  }

  // Improved message sending with acknowledgment
  sendMessage(message) {
    if (this.socket && this.isConnected) {
      console.log('📤 Sending message via socket:', message);
      this.socket.emit('send_message', {
        conversationId: message.conversationId,
        message: message
      }, (acknowledgment) => {
        console.log('📬 Message sent acknowledgment:', acknowledgment);
      });
    } else {
      console.warn('⚠️ Cannot send message: socket not connected');
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