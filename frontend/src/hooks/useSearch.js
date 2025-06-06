import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import searchService from '../services/searchService';

const useSearch = (query) => {
    const [debouncedQuery, setDebouncedQuery] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query?.trim() || '');
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    return useQuery({
        queryKey: ['search', debouncedQuery],
        queryFn: async () => {
            console.log('useSearch: Searching for:', debouncedQuery);
            const result = await searchService.searchUsers(debouncedQuery);
            console.log('useSearch: Search results:', result);
            return result;
        },
        enabled: !!debouncedQuery && debouncedQuery.length >= 2,
        staleTime: 1000 * 60 * 2, // 2 minutes
        retry: 2,
        retryDelay: 1000,
    });
};

export default useSearch;