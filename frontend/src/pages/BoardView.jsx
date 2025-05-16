import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { FaList, FaThLarge, FaSpinner } from 'react-icons/fa';
import ThreadCard from '../components/ThreadCard';

const BoardView = () => {
    const { board } = useParams();
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // Default to grid view

    useEffect(() => {
        const fetchThreads = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/leech/4chan/${board}/catalog`);
                if (response.data.success) {
                    setThreads(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching threads:', error);
                setError(error.response?.data?.error || 'Failed to fetch threads');
            } finally {
                setLoading(false);
            }
        };

        fetchThreads();
    }, [board]);

    const handleRepost = async (threadId, repostType, targetBoard) => {
        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/leech/4chan/${board}/convert/${threadId}`,
                {
                    repostType,
                    targetBoard
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );
        } catch (error) {
            console.error('Error reposting:', error);
            throw error;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <FaSpinner className="animate-spin text-4xl text-blue-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    /{board}/ - {board.toUpperCase()}
                </h1>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                        <FaList />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                        <FaThLarge />
                    </button>
                </div>
            </div>

            <div className={viewMode === 'grid' ? 'grid grid-cols-5 gap-4' : 'space-y-4'}>
                {threads.map((thread) => (
                    <ThreadCard
                        key={thread.id}
                        thread={thread}
                        onRepost={handleRepost}
                    />
                ))}
            </div>
        </div>
    );
};

export default BoardView; 