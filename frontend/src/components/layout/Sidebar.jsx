import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FaHome, FaRegBell, FaRegEnvelope, FaBookmark, FaRegListAlt, FaRegUser, FaEllipsisH, FaFeather } from "react-icons/fa";
import PostPopup from "../common/PostPopup";
import WhosOnline from "../common/WhosOnline";

const Sidebar = () => {
    const [showPostPopup, setShowPostPopup] = useState(false);
    const { data: authUser } = useQuery({ queryKey: ["authUser"] });
    
    const { data: notifications } = useQuery({
        queryKey: ["notifications"],
        queryFn: async () => {
            const res = await fetch('/api/notifications');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch notifications");
            return data;
        },
        enabled: !!authUser,
    });

    const unreadCount = notifications?.filter(n => !n.read).length || 0;

    return (
        <div className="w-64 h-screen bg-black border-r border-gray-700 flex flex-col">
            {/* Logo */}
            <div className="p-4 border-b border-gray-700">
                <Link to="/">
                    <img src="/logo.png" alt="Logo" className="h-8" />
                </Link>
            </div>

            {/* Navigation */}
            <div className="p-4 flex-1 overflow-y-auto">
                <Link to="/" className="flex items-center gap-4 p-3 text-white hover:bg-gray-800 rounded-xl transition-colors">
                    <FaHome size={24} />
                    <span className="text-xl font-semibold">Home</span>
                </Link>
                <Link to="/notifications" className="flex items-center gap-4 p-3 text-white hover:bg-gray-800 rounded-xl transition-colors relative">
                    <FaRegBell size={24} />
                    <span className="text-xl font-semibold">Notifications</span>
                    {unreadCount > 0 && (
                        <div className="absolute top-2 left-6 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold border-2 border-black">
                            {unreadCount}
                        </div>
                    )}
                </Link>
                <Link to="/messages" className="flex items-center gap-4 p-3 text-white hover:bg-gray-800 rounded-xl transition-colors">
                    <FaRegEnvelope size={24} />
                    <span className="text-xl font-semibold">Messages</span>
                </Link>
                <Link to="/bookmarks" className="flex items-center gap-4 p-3 text-white hover:bg-gray-800 rounded-xl transition-colors">
                    <FaBookmark size={24} />
                    <span className="text-xl font-semibold">Bookmarks</span>
                </Link>
                <Link to="/lists" className="flex items-center gap-4 p-3 text-white hover:bg-gray-800 rounded-xl transition-colors">
                    <FaRegListAlt size={24} />
                    <span className="text-xl font-semibold">Lists</span>
                </Link>
                <Link to={`/profile/${authUser?.username}`} className="flex items-center gap-4 p-3 text-white hover:bg-gray-800 rounded-xl transition-colors">
                    <FaRegUser size={24} />
                    <span className="text-xl font-semibold">Profile</span>
                </Link>
                <Link to="/more" className="flex items-center gap-4 p-3 text-white hover:bg-gray-800 rounded-xl transition-colors">
                    <FaEllipsisH size={24} />
                    <span className="text-xl font-semibold">More</span>
                </Link>
            </div>

            {/* Who's Online Section */}
            <div className="px-4 py-2 border-t border-gray-700">
                <WhosOnline />
            </div>

            {/* POST BUTTON */}
            <div className="p-4">
                <button
                    onClick={() => setShowPostPopup(true)}
                    className="w-full bg-blue-500 text-white rounded-full py-4 px-6 text-xl font-bold flex items-center justify-center gap-3 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/50 animate-pulse"
                >
                    <FaFeather size={28} />
                    <span>POST</span>
                </button>
            </div>

            {/* User Profile */}
            <div className="p-4 border-t border-gray-700">
                <Link
                    to={`/profile/${authUser?.username}`}
                    className="flex items-center gap-4 p-3 text-white hover:bg-gray-800 rounded-xl transition-colors"
                >
                    <img
                        src={authUser?.profileImg || "/avatar-placeholder.png"}
                        alt="Profile"
                        className="w-12 h-12 rounded-full border-2 border-gray-700"
                    />
                    <div>
                        <p className="font-bold text-lg">{authUser?.fullName}</p>
                        <p className="text-gray-400">@{authUser?.username}</p>
                    </div>
                </Link>
            </div>

            {/* Post Popup */}
            {showPostPopup && (
                <PostPopup
                    onClose={() => setShowPostPopup(false)}
                />
            )}
        </div>
    );
};

export default Sidebar; 