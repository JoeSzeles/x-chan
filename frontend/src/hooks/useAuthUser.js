import { useState, useEffect } from 'react';

export const useAuthUser = () => {
    const [authUser, setAuthUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // Add error state

    useEffect(() => {
        const fetchUser = async () => {
            console.log("Fetching user data...");
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/auth/me', {
                    credentials: 'include',
                    headers: token ? {
                        'Authorization': `Bearer ${token}`
                    } : {}
                });
                const data = await res.json();
                if (res.ok) {
                    setAuthUser(data);
                    setError(null); // Clear any previous error
                } else {
                    setAuthUser(null);
                    localStorage.removeItem('token');
                    setError(data?.message || 'Not authorized'); // Set error message
                }
            } catch (error) {
                console.error('Error fetching user:', error);
                setAuthUser(null);
                localStorage.removeItem('token');
                setError('Failed to fetch user data.'); // Set a general error message
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    return { authUser, loading, error }; // Return the error state
};