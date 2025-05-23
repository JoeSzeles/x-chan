import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FaCircle } from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';

const WhosOnline = () => {
    const queryClient = useQueryClient();
    const { data: authUser } = useQuery({ queryKey: ["authUser"] });
    
    const { data: onlineUsers, isLoading } = useQuery({
        queryKey: ["onlineUsers"],
        queryFn: async () => {
            const res = await fetch('/api/users/online');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch online users");
            return data;
        },
        enabled: !!authUser,
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    return (
        <div className='bg-[#1e1e1e] rounded-xl p-4'>
            <p className='font-bold mb-4 text-white'>Who's Online</p>
            <div className='flex flex-col gap-4'>
                {isLoading && (
                    <div className="flex justify-center py-4">
                        <LoadingSpinner size="sm" />
                    </div>
                )}
                {!isLoading && onlineUsers?.length > 0 && onlineUsers.map((user) => (
                    <div
                        className='flex items-center justify-between gap-4'
                        key={user._id}
                    >
                        <div className='flex gap-2 items-center'>
                            <Link 
                                to={`/profile/${user.username}`}
                                className='avatar group'
                            >
                                <div className='w-10 h-10 relative rounded-full bg-[#1e1e1e] p-0.5'>
                                    <div className='w-full h-full rounded-full overflow-hidden flex items-center justify-center border-2 border-gray-700 group-hover:border-blue-500 transition-colors duration-200'>
                                        <img 
                                            src={user.profileImg || "/avatar-placeholder.png"} 
                                            className="w-full h-full object-cover" 
                                            alt={user.fullName}
                                            onError={(e) => {
                                                e.target.src = "/avatar-placeholder.png";
                                            }}
                                        />
                                    </div>
                                    <FaCircle 
                                        className="absolute bottom-0 right-0 text-green-500 text-xs" 
                                        style={{ 
                                            filter: 'drop-shadow(0 0 2px rgba(34, 197, 94, 0.5))'
                                        }}
                                    />
                                </div>
                            </Link>
                            <div className='flex flex-col'>
                                <Link 
                                    to={`/profile/${user.username}`}
                                    className='font-semibold tracking-tight truncate w-28 text-white hover:text-blue-500 transition-colors duration-200'
                                >
                                    {user.fullName}
                                </Link>
                                <span className='text-sm text-slate-500'>@{user.username}</span>
                            </div>
                        </div>
                        {authUser && authUser._id !== user._id && (
                            <button
                                className='bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white rounded-full px-3 py-1 text-sm font-semibold transition-all'
                                onClick={async () => {
                                    try {
                                        const res = await fetch(`/api/users/follow/${user._id}`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json'
                                            }
                                        });
                                        
                                        if (!res.ok) {
                                            const errorData = await res.json();
                                            throw new Error(errorData.error || 'Failed to follow user');
                                        }
                                        
                                        // Force refetch
                                        await queryClient.invalidateQueries(["onlineUsers"]);
                                        await queryClient.invalidateQueries(["authUser"]);
                                        await queryClient.invalidateQueries(["suggestedUsers"]);
                                    } catch (error) {
                                        console.error('Error following user:', error);
                                    }
                                }}
                            >
                                {authUser.following?.includes(user._id) ? 'Unfollow' : 'Follow'}
                            </button>
                        )}
                    </div>
                ))}
                {!isLoading && (!onlineUsers || onlineUsers.length === 0) && (
                    <p className="text-gray-500 text-center">No users currently online</p>
                )}
            </div>
        </div>
    );
};

export default WhosOnline; 