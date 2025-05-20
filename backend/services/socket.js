// This is a placeholder, as the original file was empty.
// Replace this with your actual code.

const io = require('socket.io-client');

class SocketHandler {
    constructor() {
        const socketOptions = {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 5000,
            timeout: 10000
        };

        console.log('[Socket] Creating socket with options:', {
            ...socketOptions,
            timestamp: new Date().toISOString()
        });
        this.socket = io('/', socketOptions);

        this.socket.on('connect', () => {
            console.log('[Socket] Connected to server.');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected from server. Reason:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error);
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`[Socket] Attempting to reconnect: ${attemptNumber}`);
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`[Socket] Reconnected successfully after ${attemptNumber} attempts.`);
        });

        this.socket.on('reconnect_error', (error) => {
            console.error('[Socket] Reconnection error:', error);
        });

        this.socket.on('reconnect_failed', () => {
            console.error('[Socket] Reconnection failed.');
        });
    }

    sendMessage(event, data) {
        this.socket.emit(event, data);
    }

    onMessage(event, callback) {
        this.socket.on(event, callback);
    }
}

module.exports = SocketHandler;