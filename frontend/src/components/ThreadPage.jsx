import React, { useState, useCallback, useEffect } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-hot-toast';

const ThreadPage = () => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000; // 3 seconds

    const connectSocket = useCallback(() => {
        if (socket) {
            socket.disconnect();
        }

        const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
            reconnection: true,
            reconnectionAttempts: maxReconnectAttempts,
            reconnectionDelay: reconnectDelay,
            timeout: 10000,
            transports: ['websocket', 'polling'],
            forceNew: true,
        });

        newSocket.on('connect', () => {
            console.log('Socket connected successfully');
            setIsConnected(true);
            setReconnectAttempts(0);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            setIsConnected(false);
            
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, try to reconnect
                newSocket.connect();
            }
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setReconnectAttempts(prev => prev + 1);
            
            if (reconnectAttempts >= maxReconnectAttempts) {
                toast.error('Failed to connect to server. Please refresh the page.');
                newSocket.disconnect();
            }
        });

        setSocket(newSocket);

        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [reconnectAttempts]);

    useEffect(() => {
        const cleanup = connectSocket();
        return cleanup;
    }, [connectSocket]);

    return (
        <div className="container mx-auto px-4 py-8">
            {!isConnected && (
                <div className="fixed top-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
                    Reconnecting to server... Attempt {reconnectAttempts + 1}/{maxReconnectAttempts}
                </div>
            )}
            {/* ... rest of the JSX ... */}
        </div>
    );
};

export default ThreadPage; 