import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import Avatar from './Avatar';

const WhosOnline = () => {
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
                            <Avatar 
                                user={user}
                                size="md"
                                showOnlineStatus={true}
                                className="hover:border-blue-500"
                            />
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