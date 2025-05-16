import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import { FaUsers, FaComments } from 'react-icons/fa';

const BoardsList = ({ viewMode }) => {
    const { data: boards, isLoading } = useQuery({
        queryKey: ['boards'],
        queryFn: async () => {
            const res = await fetch('/api/boards', {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to fetch boards');
            const data = await res.json();
            return data;
        }
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!boards || boards.length === 0) {
        return (
            <div className="text-center text-gray-500 py-8">
                No boards available
            </div>
        );
    }

    return (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"}>
            {boards.map((board) => (
                <Link
                    key={board._id}
                    to={`/boards/${board.name}`}
                    className={`bg-[#1e1e1e] rounded-lg overflow-hidden hover:bg-[#2a2a2a] transition-colors ${
                        viewMode === "grid" ? "h-[200px]" : ""
                    }`}
                >
                    {board.image && (
                        <div className={`${viewMode === "grid" ? "h-32" : "h-24"} relative`}>
                            <img
                                src={board.image}
                                alt={board.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://via.placeholder.com/400x200?text=No+Image';
                                }}
                            />
                        </div>
                    )}
                    <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                            {board.icon && (
                                <img
                                    src={board.icon}
                                    alt={board.name}
                                    className="w-10 h-10 rounded-full"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://via.placeholder.com/40?text=Icon';
                                    }}
                                />
                            )}
                            <div>
                                <h3 className="text-lg font-semibold">{board.name}</h3>
                                <p className="text-sm text-gray-400">{board.description}</p>
                            </div>
                        </div>
                        
                        <div className="flex gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                                <FaUsers className="w-4 h-4" />
                                <span>{board.followers?.length || 0} members</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <FaComments className="w-4 h-4" />
                                <span>{board.posts?.length || 0} posts</span>
                            </div>
                        </div>

                        {viewMode === "list" && (
                            <div className="mt-3 pt-3 border-t border-gray-700">
                                <p className="text-sm text-gray-400">
                                    Last activity: {new Date(board.updatedAt || board.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        )}
                    </div>
                </Link>
            ))}
        </div>
    );
};

export default BoardsList; 