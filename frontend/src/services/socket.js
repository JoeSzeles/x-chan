
import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.messageCallbacks = new Set();
    this.presenceCallbacks = new Set();
    this.onlineUsers = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimer = null;
    this.heartbeatInterval = null;
  }

  connect() {
    if (this.socket && this.isConnected) {
      console.log('✅ Socket already connected');
      return;
    }

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const token = localStorage.getItem('token');
    console.log('🔌 Connecting socket with token:', !!token);
    
    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    try {
      this.socket = io(window.location.origin, {
        auth: {
          token: token
        },
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 15000,
        forceNew: true,
        upgrade: true,
        rememberUpgrade: false
      });

      this.setupSocketListeners();
    } catch (error) {
      console.error('❌ Error creating socket:', error);
      this.scheduleReconnect();
    }
  }

  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Clear reconnect timer on successful connection
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Start heartbeat to keep connection alive
      this.startHeartbeat();

      // Re-register message callbacks if any were added before connection
      if (this.messageCallbacks.size > 0) {
        this.socket.off('new_message');
        this.socket.on('new_message', (message) => {
          console.log('📨 Received new message via socket:', message);
          
          this.messageCallbacks.forEach(cb => {
            try {
              cb(message);
            } catch (error) {
              console.error('Error in message callback:', error);
            }
          });
        });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.isConnected = false;
      
      // Stop heartbeat
      this.stopHeartbeat();
      
      // Only auto-reconnect for specific reasons
      if (reason === 'transport close' || reason === 'transport error' || reason === 'ping timeout') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      this.isConnected = false;
      this.scheduleReconnect();
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection failed:', error);
    });

    // Handle user presence events
    this.socket.on('user_online', (userId) => {
      console.log('👤 User came online:', userId);
      this.onlineUsers.add(userId);
      this.presenceCallbacks.forEach(callback => {
        try {
          callback({ type: 'online', userId });
        } catch (error) {
          console.error('Error in presence callback:', error);
        }
      });
    });

    this.socket.on('user_offline', (userId) => {
      console.log('👤 User went offline:', userId);
      this.onlineUsers.delete(userId);
      this.presenceCallbacks.forEach(callback => {
        try {
          callback({ type: 'offline', userId });
        } catch (error) {
          console.error('Error in presence callback:', error);
        }
      });
    });

    this.socket.on('online_users', (users) => {
      console.log('👥 Online users list:', users);
      this.onlineUsers = new Set(users);
      this.presenceCallbacks.forEach(callback => {
        try {
          callback({ type: 'list', users });
        } catch (error) {
          console.error('Error in presence callback:', error);
        }
      });
    });
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    console.log(`⏰ Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        try {
          this.socket.emit('ping', Date.now());
        } catch (error) {
          console.error('Error sending heartbeat:', error);
        }
      }
    }, 25000); // Send ping every 25 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  joinConversation(conversationId) {
    if (this.socket && this.isConnected) {
      try {
        this.socket.emit('join_conversation', conversationId);
      } catch (error) {
        console.error('Error joining conversation:', error);
      }
    }
  }

  leaveConversation(conversationId) {
    if (this.socket && this.isConnected) {
      try {
        this.socket.emit('leave_conversation', conversationId);
      } catch (error) {
        console.error('Error leaving conversation:', error);
      }
    }
  }

  sendMessage(message) {
    if (this.socket && this.isConnected) {
      try {
        console.log('📤 Sending message via socket:', message);
        this.socket.emit('new_message', message, (acknowledgment) => {
          if (acknowledgment) {
            console.log('📬 Message sent acknowledgment:', acknowledgment);
          }
        });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else {
      console.warn('⚠️ Cannot send message: socket not connected or invalid');
      // Try to reconnect if not connected
      if (!this.isConnected) {
        this.connect();
      }
    }
  }

  // Listen for typing indicators
  onTyping(callback) {
    if (this.socket) {
      try {
        this.socket.on('user_typing', callback);
      } catch (error) {
        console.error('Error setting up typing listener:', error);
      }
    }
  }

  offTyping(callback) {
    if (this.socket) {
      try {
        this.socket.off('user_typing', callback);
      } catch (error) {
        console.error('Error removing typing listener:', error);
      }
    }
  }

  sendTyping(conversationId, isTyping) {
    if (this.socket && this.isConnected) {
      try {
        this.socket.emit('typing', { conversationId, isTyping });
      } catch (error) {
        console.error('Error sending typing indicator:', error);
      }
    }
  }

  onNewMessage(callback) {
    if (this.socket) {
      try {
        // Only remove and re-add if this is the first callback
        if (this.messageCallbacks.size === 0) {
          this.socket.off('new_message');
          
          this.socket.on('new_message', (message) => {
            console.log('📨 Received new message via socket:', message);
            
            // Call all registered callbacks
            this.messageCallbacks.forEach(cb => {
              try {
                cb(message);
              } catch (error) {
                console.error('Error in message callback:', error);
              }
            });
          });
        }
        
        this.messageCallbacks.add(callback);
      } catch (error) {
        console.error('Error setting up message listener:', error);
        this.messageCallbacks.add(callback);
      }
    } else {
      console.warn('⚠️ Socket not ready for onNewMessage, storing callback for later');
      this.messageCallbacks.add(callback);
    }
  }

  offNewMessage(callback) {
    if (this.socket && this.messageCallbacks.has(callback)) {
      this.messageCallbacks.delete(callback);
      
      // If no more callbacks, remove the socket listener
      if (this.messageCallbacks.size === 0) {
        try {
          this.socket.off('new_message');
        } catch (error) {
          console.error('Error removing message listener:', error);
        }
      }
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
      try {
        this.socket.emit('get_online_users');
      } catch (error) {
        console.error('Error requesting online users:', error);
      }
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
