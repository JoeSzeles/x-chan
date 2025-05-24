import React from 'react';
import { Link } from 'react-router-dom';
import { FaUser, FaUserPlus, FaUserMinus } from 'react-icons/fa';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

const UserCard = ({ user, isCompact = false }) => {
    const queryClient = useQueryClient();

    const { mutate: followUser } = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/follow/${user._id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Something went wrong');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            toast.success(user.isFollowing ? 'Unfollowed successfully' : 'Followed successfully');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    if (isCompact) {
        return (
            <div className="p-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                        {user.profileImg ? (
                            <img
                                src={user.profileImg}
                                alt={user.username}
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            <FaUser className="w-6 h-6 text-gray-400" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <Link to={`/profile/${user.username}`} className="block">
                            <p className="font-bold truncate">{user.fullName || user.name}</p>
                            <p className="text-gray-500 text-sm truncate">@{user.username}</p>
                        </Link>
                    </div>
                    <button
                        onClick={() => followUser()}
                        className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                            user.isFollowing ? 'text-red-500' : 'text-blue-500'
                        }`}
                    >
                        {user.isFollowing ? <FaUserMinus /> : <FaUserPlus />}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 border-b border-gray-700">
            <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                    {user.profileImg ? (
                        <img
                            src={user.profileImg}
                            alt={user.username}
                            className="w-full h-full rounded-full object-cover"
                        />
                    ) : (
                        <FaUser className="w-8 h-8 text-gray-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <Link to={`/profile/${user.username}`} className="block">
                        <p className="font-bold text-lg">{user.fullName || user.name}</p>
                        <p className="text-gray-500">@{user.username}</p>
                    </Link>
                    {user.bio && (
                        <p className="mt-2 text-gray-300">{user.bio}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm">
                        <Link 
                            to={`/profile/${user.username}/followers`}
                            className="text-gray-500 hover:text-blue-500 transition-colors"
                        >
                            <span className="font-semibold">{user.followers?.length || 0}</span> followers
                        </Link>
                        <Link 
                            to={`/profile/${user.username}/following`}
                            className="text-gray-500 hover:text-blue-500 transition-colors"
                        >
                            <span className="font-semibold">{user.following?.length || 0}</span> following
                        </Link>
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        followUser(user._id);
                    }}
                    className={`px-4 py-2 rounded-full hover:bg-gray-700 transition-colors ${
                        user.isFollowing ? 'text-red-500' : 'text-blue-500'
                    }`}
                    disabled={isPending}
                >
                    {isPending ? 'Processing...' : (user.isFollowing ? 'Unfollow' : 'Follow')}
                </button>
            </div>
        </div>
    );
};

export default UserCard; 