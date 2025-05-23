const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('[AuthService] No token found');
        return {
            'Content-Type': 'application/json'
        };
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

// Keep track of auth state
let isRefreshing = false;
let refreshPromise = null;
let failedRequests = [];

const handleAuthError = (error) => {
    console.error('[AuthService] Auth error:', error);

    // Handle 401 unauthorized errors
    if (error.response?.status === 401) {
        // Don't immediately logout - try to refresh the session first
        console.log('[AuthService] Authentication error, attempting to refresh session');
        return refreshSession().catch(() => {
            // Only logout if refresh fails
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            window.location.href = '/login';
        });
    }

    // Handle 502 bad gateway errors (server errors)
    if (error.response?.status === 502 || error.status === 502) {
        console.log('[AuthService] Server error, waiting before retry');
        // Don't logout immediately on server errors
        return new Promise((resolve, reject) => {
            setTimeout(() => reject(error), 2000);
        });
    }

    throw error;
};

// Function to refresh the auth session
const refreshSession = () => {
    // Prevent multiple refresh calls
    if (isRefreshing) {
        return refreshPromise;
    }

    console.log('[AuthService] Refreshing auth session');
    isRefreshing = true;

    refreshPromise = fetch('/api/auth/me', {
        credentials: 'include'
    })
    .then(res => {
        if (!res.ok) throw new Error('Session refresh failed');
        return res.json();
    })
    .then(data => {
        console.log('[AuthService] Session refreshed successfully');
        localStorage.setItem('userData', JSON.stringify(data));
        return data;
    })
    .catch(error => {
        console.error('[AuthService] Session refresh failed:', error);
        throw error;
    })
    .finally(() => {
        isRefreshing = false;
        refreshPromise = null;
    });

    return refreshPromise;
};

export const login = async (credentials) => {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(credentials)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Login failed');
        }

        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));

        // Set session refresh interval
        startSessionKeepAlive();

        return data;
    } catch (error) {
        console.error('[AuthService] Login error:', error);
        throw error;
    }
};

let keepAliveInterval = null;

// Function to periodically refresh the session
const startSessionKeepAlive = () => {
    // Clear any existing interval
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
    }

    // Refresh session every 10 minutes
    keepAliveInterval = setInterval(() => {
        console.log('[AuthService] Performing session keep-alive');
        refreshSession().catch(err => {
            console.error('[AuthService] Keep-alive failed:', err);
        });
    }, 10 * 60 * 1000); // 10 minutes
};

export const logout = async () => {
    // Clear the keep-alive interval
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }

    try {
        // Call logout API to clear server-side session
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
            headers: getAuthHeaders()
        });
    } catch (error) {
        console.error('[AuthService] Logout error:', error);
    } finally {
        // Always clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        window.location.href = '/login';
    }
};

export const getCurrentUser = async () => {
    try {
        // Check if we already have user data in storage
        const userData = localStorage.getItem('userData');
        if (userData) {
            try {
                // Start session keep-alive
                startSessionKeepAlive();
                return JSON.parse(userData);
            } catch (e) {
                console.error('[AuthService] Error parsing user data:', e);
                // Continue with fetch if parsing fails
            }
        }

        const response = await fetch('/api/auth/me', {
            headers: getAuthHeaders(),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to get current user');
        }

        const data = await response.json();
        localStorage.setItem('userData', JSON.stringify(data));

        // Start session keep-alive
        startSessionKeepAlive();

        return data;
    } catch (error) {
        console.error('[AuthService] Error fetching current user:', error);
        // Clear any invalid tokens to prevent repeated failed requests
        if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
        }
        throw error;
    }
};

export const updateProfile = async (userData) => {
    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            throw new Error('Failed to update profile');
        }

        const data = await response.json();
        localStorage.setItem('userData', JSON.stringify(data));
        return data;
    } catch (error) {
        handleAuthError(error);
    }
};