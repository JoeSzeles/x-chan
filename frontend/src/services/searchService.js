import axios from 'axios';

const searchService = {
    searchUsers: async (query) => {
        try {
            console.log('Searching users with query:', query);
            const response = await axios.get(`/api/search/users?q=${encodeURIComponent(query)}`);
            console.log('Search results:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error searching users:', error);
            throw new Error(error.response?.data?.error || 'Failed to search users');
        }
    },

    searchPosts: async (query) => {
        try {
            console.log('Searching posts with query:', query);
            const response = await axios.get(`/api/search/posts?q=${encodeURIComponent(query)}`);
            console.log('Search results:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error searching posts:', error);
            throw new Error(error.response?.data?.error || 'Failed to search posts');
        }
    }
};

export default searchService; 