import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const LoginForm = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const loginMutation = useMutation({
        mutationFn: async (credentials) => {
            const response = await axios.post('/api/auth/login', credentials);
            return response.data;
        },
        onSuccess: (data) => {
            if (data.token) {
                // Store token in localStorage
                localStorage.setItem('token', data.token);
                console.log('[LoginForm] Token stored successfully');

                // Store user data if available
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                }

                toast.success('Login successful!');
                navigate('/');
            } else {
                throw new Error('No token received from server');
            }
        },
        onError: (error) => {
            console.error('[LoginForm] Login error:', error);
            toast.error(error.response?.data?.error || 'Login failed');
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        loginMutation.mutate({ username, password });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                </label>
                <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                />
            </div>
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                </label>
                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                />
            </div>
            <button
                type="submit"
                disabled={loginMutation.isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                {loginMutation.isLoading ? 'Logging in...' : 'Login'}
            </button>
        </form>
    );
};

export default LoginForm;