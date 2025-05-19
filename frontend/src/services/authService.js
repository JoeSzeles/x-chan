const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('[AuthService] No token found');
        return {};
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

const handleAuthError = (error) => {
    console.error('[AuthService] Auth error:', error);
    if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        window.location.href = '/login';
    }
    throw error;
};

export const login = async (credentials) => {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        if (!response.ok) {
            throw new Error('Login failed');
        }

        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        return data;
    } catch (error) {
        console.error('[AuthService] Login error:', error);
        throw error;
    }
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    window.location.href = '/login';
};

export const getCurrentUser = async () => {
    try {
        const response = await fetch('/api/auth/me', {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to get current user');
        }

        return await response.json();
    } catch (error) {
        handleAuthError(error);
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