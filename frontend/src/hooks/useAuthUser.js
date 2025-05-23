import { create } from 'zustand';
import axios from 'axios';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Create a custom axios instance with interceptors for auth
const authAxios = axios.create();

// Track auth refresh state
let isRefreshing = false;
let refreshPromise = null;
let failedQueue = [];

// Process the queue of failed requests
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Add response interceptor to handle 401 errors
authAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return authAxios(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Try to refresh session
      try {
        const store = useAuthStore.getState();
        await store.refreshUser(true); // force refresh

        // Update the authorization header
        const token = localStorage.getItem('token');
        if (token) {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
        }

        processQueue(null, token);
        return authAxios(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For 502 errors, wait and retry once
    if (error.response?.status === 502 && !originalRequest._retryServer) {
      originalRequest._retryServer = true;

      // Wait 2 seconds before retry
      return new Promise(resolve => {
        setTimeout(() => resolve(authAxios(originalRequest)), 2000);
      });
    }

    return Promise.reject(error);
  }
);

export const useAuthStore = create((set, get) => ({
    user: JSON.parse(localStorage.getItem('userData')) || null,
    isLoading: false,
    error: null,
    lastRefreshed: null,

    login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authAxios.post('/api/auth/login', credentials, { withCredentials: true });
            const { user, token } = response.data;

            localStorage.setItem('userData', JSON.stringify(user));
            localStorage.setItem('token', token);

            set({ user, isLoading: false, lastRefreshed: Date.now() });

            // Set up session refresh interval
            startAutoRefresh();

            return user;
        } catch (error) {
            const message = error.response?.data?.error || 'Login failed';
            set({ error: message, isLoading: false });
            throw new Error(message);
        }
    },

    logout: async () => {
        stopAutoRefresh();

        try {
            await authAxios.post('/api/auth/logout', {}, { withCredentials: true });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('userData');
            localStorage.removeItem('token');
            set({ user: null, lastRefreshed: null });
        }
    },

    register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authAxios.post('/api/auth/signup', userData);
            const { user, token } = response.data;

            localStorage.setItem('userData', JSON.stringify(user));
            localStorage.setItem('token', token);

            set({ user, isLoading: false, lastRefreshed: Date.now() });

            // Set up session refresh interval
            startAutoRefresh();

            return user;
        } catch (error) {
            const message = error.response?.data?.error || 'Registration failed';
            set({ error: message, isLoading: false });
            throw new Error(message);
        }
    },

    updateProfile: async (userData) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authAxios.put('/api/users/profile', userData, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const updatedUser = response.data;
            localStorage.setItem('userData', JSON.stringify(updatedUser));

            set({ user: updatedUser, isLoading: false });
            return updatedUser;
        } catch (error) {
            const message = error.response?.data?.error || 'Failed to update profile';
            set({ error: message, isLoading: false });
            throw new Error(message);
        }
    },

    refreshUser: async (force = false) => {
        const state = get();
        const now = Date.now();

        // Don't refresh if it's been less than 1 minute since last refresh, unless forced
        if (!force && state.lastRefreshed && (now - state.lastRefreshed < 60000)) {
            console.log('[Auth] Skipping refresh - too soon');
            return state.user;
        }

        try {
            const response = await authAxios.get('/api/auth/me', {
                withCredentials: true,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const userData = response.data;
            localStorage.setItem('userData', JSON.stringify(userData));
            set({ user: userData, lastRefreshed: now });
            return userData;
        } catch (error) {
            console.error('Error refreshing user data:', error);
            if (error.response?.status === 401) {
                localStorage.removeItem('userData');
                localStorage.removeItem('token');
                set({ user: null, lastRefreshed: null });
                stopAutoRefresh();
            }
            throw error;
        }
    },

    setUser: (user) => set({ user })
}));

// Auto-refresh session
let refreshInterval = null;

const startAutoRefresh = () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    // Refresh every 10 minutes
    refreshInterval = setInterval(() => {
        const store = useAuthStore.getState();
        console.log('[Auth] Performing auto-refresh');
        store.refreshUser().catch(err => {
            console.error('[Auth] Auto-refresh failed:', err);
        });
    }, 10 * 60 * 1000); // 10 minutes
};

const stopAutoRefresh = () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
};

export const useAuthUser = () => {
    const { user, isLoading, error, login, logout, register, updateProfile, refreshUser } = useAuthStore();
    const navigate = useNavigate();

    // Start session management when component mounts
    useEffect(() => {
        if (user) {
            // Initial refresh of user data
            refreshUser()
                .then(() => {
                    // Start auto-refresh
                    startAutoRefresh();
                })
                .catch(() => {
                    navigate('/login');
                });

            // Clean up on unmount
            return () => {
                // Don't stop auto-refresh on component unmount
            };
        }
    }, []);

    return { user, isLoading, error, login, logout, register, updateProfile, refreshUser };
};