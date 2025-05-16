// Basic validation functions
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const isValidUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
};

export const isValidPassword = (password) => {
    return password && password.length >= 6;
};

export const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

export const isValidVideoId = (videoId) => {
    // Basic YouTube video ID validation
    const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
    return videoIdRegex.test(videoId);
};

export const isValidImageUrl = (url) => {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
};

export const validateCoverPhotoData = (data) => {
    if (!data || typeof data !== 'object') return false;
    if (!['image', 'video', 'content'].includes(data.type)) return false;
    if (!data.content) return false;
    
    if (data.type === 'video' && !isValidVideoId(data.content)) return false;
    if (data.type === 'image' && !isValidImageUrl(data.content)) return false;
    
    return true;
}; 