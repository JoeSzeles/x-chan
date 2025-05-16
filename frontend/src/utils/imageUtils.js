export const getProxiedImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    // If it's already a proxied URL, return as is
    if (imageUrl.startsWith('/proxy-image')) return imageUrl;
    
    // If it's a relative URL, return as is
    if (imageUrl.startsWith('/')) return imageUrl;
    
    // If it's an external URL, proxy it
    try {
        const url = new URL(imageUrl);
        if (url.hostname !== window.location.hostname) {
            return `/proxy-image?url=${encodeURIComponent(imageUrl)}`;
        }
    } catch (error) {
        console.error('Error parsing image URL:', error);
    }
    
    return imageUrl;
};

export const isExternalImage = (imageUrl) => {
    if (!imageUrl) return false;
    
    try {
        const url = new URL(imageUrl);
        return url.hostname !== window.location.hostname;
    } catch (error) {
        return false;
    }
}; 