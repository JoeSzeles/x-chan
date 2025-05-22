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

// Validate cover photo data
export const validateCoverPhotoData = (data) => {
    if (!data) return false;

    // Check if type is provided and is either 'image' or 'video'
    if (!data.type || !['image', 'video'].includes(data.type)) {
        console.log('Invalid cover photo type:', data.type);
        return false;
    }

    // Check if content is provided
    if (!data.content) {
        console.log('Missing cover photo content');
        return false;
    }

    // For videos, ensure it's a valid YouTube ID or URL
    if (data.type === 'video') {
        // Basic validation for YouTube ID format
        const youtubeIdRegex = /^[a-zA-Z0-9_-]{11}$/;
        const youtubeUrlRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;

        if (!youtubeIdRegex.test(data.content) && !youtubeUrlRegex.test(data.content)) {
            console.log('Invalid YouTube video ID or URL:', data.content);
            return false;
        }
    }

    return true;
};