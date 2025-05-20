import { useState, useEffect } from 'react';

export const useAuthUser = () => {
    const [authUser, setAuthUser] = useState(null);
    const [loading, setLoading] = useState(true);

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
                } else {
                    setAuthUser(null);
                    localStorage.removeItem('token');
                }
            } catch (error) {
                console.error('Error fetching user:', error);
                setAuthUser(null);
                localStorage.removeItem('token');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    return { authUser, loading };
};