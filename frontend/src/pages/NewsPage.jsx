import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from 'react';
import { toast } from 'react-hot-toast';

const NewsPage = () => {
    const [selectedBot, setSelectedBot] = useState(null);
    const queryClient = useQueryClient();

    // Update the updateArticles mutation
    const updateArticlesMutation = useMutation({
        mutationFn: async () => {
            try {
                const res = await fetch(`/api/newsbot/${selectedBot?._id}/update`, {
                    method: 'POST',
                    credentials: 'include',
                });
                
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Failed to update articles');
                }
                
                const data = await res.json();
                if (!data.success) {
                    throw new Error(data.error || 'Failed to update articles');
                }
                
                // Ensure we have valid data before accessing properties
                const articles = data.data?.articles || [];
                const newArticles = data.data?.newArticles || [];
                
                return {
                    ...data.data,
                    articles,
                    newArticles
                };
            } catch (error) {
                console.error('Error updating articles:', error);
                throw error;
            }
        },
        onSuccess: (data) => {
            // Ensure we have valid data before accessing properties
            const newArticlesCount = data?.newArticles?.length || 0;
            const totalArticles = data?.articles?.length || 0;
            
            if (newArticlesCount > 0) {
                toast.success(`Found ${newArticlesCount} new articles!`, {
                    duration: 3000,
                    position: "bottom-right",
                    style: {
                        background: '#1a1a1a',
                        color: '#fff',
                        border: '1px solid #333'
                    }
                });
            } else {
                toast.success(`No new articles found. Total articles: ${totalArticles}`, {
                    duration: 3000,
                    position: "bottom-right",
                    style: {
                        background: '#1a1a1a',
                        color: '#fff',
                        border: '1px solid #333'
                    }
                });
            }
            
            // Invalidate queries to refresh the data
            queryClient.invalidateQueries(["botArticles", selectedBot?._id]);
        },
        onError: (error) => {
            console.error('Update articles error:', error);
            toast.error(error.message || "Failed to update articles", {
                duration: 3000,
                position: "bottom-right",
                style: {
                    background: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid #333'
                }
            });
        }
    });

    return (
        <div>
            {/* Rest of the component code */}
        </div>
    );
};

export default NewsPage; 