import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useAuthUser } from "../../hooks/useAuthUser";
import { FaMapMarkerAlt } from "react-icons/fa";
import Avatar from "./Avatar";

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
                    <Avatar 
                        user={user} 
                        size={isCompact ? 'md' : 'lg'} 
                        showOnlineStatus={true}
                        className="hover:border-gray-500 transition-colors"
                    />

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