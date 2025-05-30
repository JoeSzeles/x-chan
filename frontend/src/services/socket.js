import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.messageCallbacks = new Set();
    this.presenceCallbacks = new Set();
    this.onlineUsers = new Set();
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

    // Handle user presence events
    this.socket.on('user_online', (userId) => {
      console.log('👤 User came online:', userId);
      this.onlineUsers.add(userId);
      this.presenceCallbacks.forEach(callback => callback({ type: 'online', userId }));
    });

    this.socket.on('user_offline', (userId) => {
      console.log('👤 User went offline:', userId);
      this.onlineUsers.delete(userId);
      this.presenceCallbacks.forEach(callback => callback({ type: 'offline', userId }));
    });

    this.socket.on('online_users', (users) => {
      console.log('👥 Online users list:', users);
      this.onlineUsers = new Set(users);
      this.presenceCallbacks.forEach(callback => callback({ type: 'list', users }));
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
      // Don't remove existing listeners, just add the new one
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

  // Presence management methods
  onPresenceChange(callback) {
    this.presenceCallbacks.add(callback);
  }

  offPresenceChange(callback) {
    this.presenceCallbacks.delete(callback);
  }

  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  getOnlineUsers() {
    return Array.from(this.onlineUsers);
  }

  // Request current online users list
  requestOnlineUsers() {
    if (this.socket && this.isConnected) {
      this.socket.emit('get_online_users');
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