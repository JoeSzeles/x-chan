// Get country flag emoji from country code
export const getCountryFlag = (userProfile, ipAddress) => {
    // If user has a country code in their profile, use that
    if (userProfile?.location?.countryCode) {
        const codePoints = userProfile.location.countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt());
        return String.fromCodePoint(...codePoints);
    }
    
    // If no country code in profile, return empty string
    return '';
};

// Get country from IP (this should be handled by backend)
export const getCountryFromIP = (ip) => {
    // This is a placeholder - actual implementation should be handled by backend
    return 'US';
}; 