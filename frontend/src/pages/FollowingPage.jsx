import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuthUser } from "../hooks/useAuthUser";
import UserCard from "../components/common/UserCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import PageHeader from "../components/common/PageHeader";
import Breadcrumb from "../components/common/Breadcrumb";

const FollowingPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { username } = useParams();
    const { data: authUser } = useAuthUser();

    // Get initial tab from URL params or default to 'following'
    const searchParams = new URLSearchParams(location.search);
    const initialTab = searchParams.get('tab') || 'following';
    const [activeTab, setActiveTab] = useState(initialTab);

    // Determine which user's following/followers to show
    // Wait for authUser to load if no username is provided (sidebar navigation)
    const targetUsername = username || (authUser?.username);
    const isOwnProfile = !username || username === authUser?.username;

    // Show loading if we're waiting for authUser and no username param
    const isWaitingForAuth = !username && !authUser;

    console.log('FollowingPage state:', {
        username,
        authUser: authUser?.username,
        targetUsername,
        isWaitingForAuth,
        isOwnProfile
    });

    const { data: followingUsers, isLoading: loadingFollowing, error: followingError } = useQuery({
        queryKey: ["following", targetUsername],
        queryFn: async () => {
            console.log('Fetching following users for:', targetUsername);
            const res = await fetch(`/api/users/${targetUsername}/following`, {
                credentials: "include",
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error('Error fetching following:', res.status, errorData);
                throw new Error(errorData.error || "Failed to fetch following users");
            }

            const data = await res.json();
            console.log('Following users data:', data);
            return data;
        },
        enabled: !!targetUsername,
        retry: 2,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const { data: followerUsers, isLoading: loadingFollowers, error: followersError } = useQuery({
        queryKey: ["followers", targetUsername],
        queryFn: async () => {
            console.log('Fetching followers for:', targetUsername);
            const res = await fetch(`/api/users/${targetUsername}/followers`, {
                credentials: "include",
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error('Error fetching followers:', res.status, errorData);
                throw new Error(errorData.error || "Failed to fetch followers");
            }

            const data = await res.json();
            console.log('Followers data:', data);
            return data;
        },
        enabled: !!targetUsername,
        retry: 2,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        // Update URL without full page reload
        const newSearchParams = new URLSearchParams(location.search);
        newSearchParams.set('tab', tab);
        navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
    };

    const currentData = activeTab === 'following' ? followingUsers : followerUsers;
    const isLoading = activeTab === 'following' ? loadingFollowing : loadingFollowers;

    // Show loading if we're waiting for auth user to load
    if (isWaitingForAuth) {
        return (
            <div className="flex-[4_4_0] border-r border-gray-700 min-h-screen bg-[#121212]">
                <div className="flex justify-center items-center h-64">
                    <LoadingSpinner size="lg" />
                    <p className="ml-4 text-gray-400">Loading user data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-[4_4_0] border-r border-gray-700 min-h-screen bg-[#121212]">
            {/* Breadcrumb Navigation */}
            <Breadcrumb 
                items={[
                    { label: isOwnProfile ? 'Following' : `${targetUsername}'s Following` }
                ]}
            />

            {/* Header */}
            <PageHeader>
                <div className="flex w-full justify-between items-center">
                    <h1 className="text-xl font-bold">
                        {isOwnProfile ? 'Your Connections' : `${targetUsername}'s Connections`}
                    </h1>
                </div>
            </PageHeader>

            {/* Tabs */}
            <div className="flex w-full border-b border-gray-700">
                <div
                    className={`flex justify-center flex-1 p-3 hover:bg-[#1e1e1e] transition duration-300 relative cursor-pointer ${
                        activeTab === "following" ? "text-primary" : "text-gray-400"
                    }`}
                    onClick={() => handleTabChange("following")}
                >
                    Following
                    {activeTab === "following" && (
                        <div className="absolute bottom-0 w-10 h-1 rounded-full bg-primary" />
                    )}
                </div>
                <div
                    className={`flex justify-center flex-1 p-3 hover:bg-[#1e1e1e] transition duration-300 relative cursor-pointer ${
                        activeTab === "followers" ? "text-primary" : "text-gray-400"
                    }`}
                    onClick={() => handleTabChange("followers")}
                >
                    Followers
                    {activeTab === "followers" && (
                        <div className="absolute bottom-0 w-10 h-1 rounded-full bg-primary" />
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : (followingError || followersError) ? (
                    <div className="text-center text-red-500 mt-8">
                        <p>Error loading {activeTab}</p>
                        <p className="text-sm mt-2">
                            {activeTab === 'following' ? followingError?.message : followersError?.message}
                        </p>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Retry
                        </button>
                    </div>
                ) : !currentData || currentData.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        <p>
                            {activeTab === 'following' 
                                ? (isOwnProfile ? "You're not following anyone yet" : `${targetUsername} isn't following anyone yet`)
                                : (isOwnProfile ? "You don't have any followers yet" : `${targetUsername} doesn't have any followers yet`)
                            }
                        </p>
                        <p className="text-sm mt-2">
                            {activeTab === 'following' && isOwnProfile && "Start following users to see them here"}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-0">
                        {currentData.map((user) => (
                            <UserCard 
                                key={user._id} 
                                user={user} 
                                isCompact={false}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FollowingPage;