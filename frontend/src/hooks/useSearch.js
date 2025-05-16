import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import searchService from '../services/searchService';

const useSearch = (query, type = 'users') => {
    const [debouncedQuery, setDebouncedQuery] = useState(query);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    return useQuery({
        queryKey: ['search', type, debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery.trim()) return [];
            return type === 'users' 
                ? await searchService.searchUsers(debouncedQuery)
                : await searchService.searchPosts(debouncedQuery);
        },
        enabled: !!debouncedQuery.trim(),
        staleTime: 30000,
    });
};

export default useSearch; 