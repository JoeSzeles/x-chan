const searchService = {
    searchUsers: async (query) => {
        if (!query || query.trim().length === 0) {
            return [];
        }

        try {
            console.log('searchService: Searching users with query:', query);
            
            const response = await fetch(`/api/search/users?q=${encodeURIComponent(query.trim())}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            console.log('searchService: Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('searchService: Error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('searchService: Search results:', data);
            return data;
        } catch (error) {
            console.error('searchService: Error searching users:', error);
            throw new Error(error.message || 'Failed to search users');
        }
    },

    searchPosts: async (query) => {
        if (!query || query.trim().length === 0) {
            return [];
        }

        try {
            console.log('searchService: Searching posts with query:', query);
            
            const response = await fetch(`/api/search/posts?q=${encodeURIComponent(query.trim())}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('searchService: Error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('searchService: Post search results:', data);
            return data;
        } catch (error) {
            console.error('searchService: Error searching posts:', error);
            throw new Error(error.message || 'Failed to search posts');
        }
    }
};

export default searchService; 