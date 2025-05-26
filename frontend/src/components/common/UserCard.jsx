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
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useAuthUser } from "../../hooks/useAuthUser";
import { FaMapMarkerAlt } from "react-icons/fa";

const UserCard = ({ user, isCompact = false }) => {
    const { data: authUser } = useAuthUser();
    const queryClient = useQueryClient();
    
    const isOwnProfile = authUser?._id === user?._id;
    const amIFollowing = authUser?.following.includes(user?._id);

    const { mutate: followUser, isPending } = useMutation({
        mutationFn: async (userId) => {
            const res = await fetch(`/api/users/follow/${userId}`, {
                method: "POST",
                credentials: "include",
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to follow/unfollow user");
            }
            
            return res.json();
        },
        onSuccess: () => {
            toast.success(amIFollowing ? "Unfollowed successfully" : "Followed successfully");
            queryClient.invalidateQueries({ queryKey: ["authUser"] });
            queryClient.invalidateQueries({ queryKey: ["following"] });
            queryClient.invalidateQueries({ queryKey: ["followers"] });
        },
        onError: (error) => {
            toast.error(error.message || "Something went wrong");
        },
    });

    const handleFollow = () => {
        if (!isOwnProfile) {
            followUser(user._id);
        }
    };

    return (
        <div className={`bg-[#1a1a1a] border border-gray-700 rounded-lg ${isCompact ? 'p-3' : 'p-4'} hover:bg-[#1e1e1e] transition-colors`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Profile Image */}
                    <Link to={`/profile/${user.username}`}>
                        <img
                            src={user.profileImg || "/avatar-placeholder.png"}
                            alt={user.fullName}
                            className={`${isCompact ? 'w-10 h-10' : 'w-12 h-12'} rounded-full border-2 border-gray-600 hover:border-gray-500 transition-colors`}
                        />
                    </Link>
                    
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                        <Link to={`/profile/${user.username}`}>
                            <p className={`font-bold text-white hover:underline truncate ${isCompact ? 'text-sm' : 'text-base'}`}>
                                {user.fullName}
                            </p>
                        </Link>
                        <p className={`text-gray-400 truncate ${isCompact ? 'text-xs' : 'text-sm'}`}>
                            @{user.username}
                        </p>
                        
                        {/* Bio */}
                        {!isCompact && user.bio && (
                            <p className="text-gray-300 text-sm mt-1 line-clamp-2">
                                {user.bio}
                            </p>
                        )}
                        
                        {/* Location */}
                        {!isCompact && user.location?.country && (
                            <div className="flex items-center gap-1 mt-1">
                                <FaMapMarkerAlt className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    {user.location.country}
                                    {user.location.countryCode && (
                                        <img
                                            src={`https://flagcdn.com/w20/${user.location.countryCode.toLowerCase()}.png`}
                                            alt={user.location.country}
                                            className="w-3 h-2 object-cover rounded-sm"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    )}
                                </span>
                            </div>
                        )}
                        
                        {/* Stats */}
                        {!isCompact && (
                            <div className="flex gap-3 mt-2">
                                <span className="text-xs text-gray-400">
                                    <span className="font-semibold text-white">{user.following?.length || 0}</span> Following
                                </span>
                                <span className="text-xs text-gray-400">
                                    <span className="font-semibold text-white">{user.followers?.length || 0}</span> Followers
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Follow Button */}
                {!isOwnProfile && (
                    <button
                        onClick={handleFollow}
                        disabled={isPending}
                        className={`px-4 py-2 rounded-full font-semibold text-sm transition-colors ${
                            amIFollowing
                                ? 'bg-transparent border border-gray-600 text-white hover:bg-red-600 hover:border-red-600'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isPending ? "..." : amIFollowing ? "Unfollow" : "Follow"}
                    </button>
                )}
            </div>
        </div>
    );
};

export default UserCard;
