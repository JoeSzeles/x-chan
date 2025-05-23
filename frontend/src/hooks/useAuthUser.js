import { useState, useEffect } from 'react';

export const useAuthUser = () => {
    const [authUser, setAuthUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            console.log("Fetching user data...");
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/auth/profile', { // Changed endpoint here
                    credentials: 'include',
                    headers: token ? {
                        'Authorization': `Bearer ${token}`
                    } : {}
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData?.message || `Failed to fetch user profile (status: ${res.status})`);
                }

                const data = await res.json();
                setAuthUser(data);
                setError(null);
            } catch (err) {
                console.error('Auth profile fetch error:', err.message);
                setAuthUser(null);
                localStorage.removeItem('token');
                setError(err.message || 'Failed to fetch user profile');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    return { authUser, loading, error };
};