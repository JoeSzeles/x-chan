
import { useQuery } from "@tanstack/react-query";
import { useAuthUser } from "../../hooks/useAuthUser";
import UserCard from "./UserCard";
import LoadingSpinner from "./LoadingSpinner";

const FollowingUsers = ({ viewMode = "list" }) => {
    const { data: authUser } = useAuthUser();

    const { data: followingUsers, isLoading, error } = useQuery({
        queryKey: ["following", authUser?.username],
        queryFn: async () => {
            if (!authUser?.username) return [];
            
            const res = await fetch(`/api/users/${authUser.username}/following`, {
                credentials: "include",
            });
            
            if (!res.ok) {
                throw new Error("Failed to fetch following users");
            }
            
            return res.json();
        },
        enabled: !!authUser?.username,
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center text-gray-500 mt-8">
                <p>Error loading following users</p>
            </div>
        );
    }

    if (!followingUsers || followingUsers.length === 0) {
        return (
            <div className="text-center text-gray-500 mt-8">
                <p>You're not following anyone yet</p>
                <p className="text-sm mt-2">Start following users to see them here</p>
            </div>
        );
    }

    return (
        <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' 
            : 'space-y-0'
        }>
            {followingUsers.map((user) => (
                <UserCard 
                    key={user._id} 
                    user={user} 
                    isCompact={viewMode === 'grid'}
                />
            ))}
        </div>
    );
};

export default FollowingUsers;
