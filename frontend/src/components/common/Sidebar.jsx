import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    FaHome, FaUser, FaBell, FaHashtag, FaBookmark, 
    FaCog, FaSignOutAlt, FaPlus, FaNewspaper 
} from 'react-icons/fa';
import { BsChatDots } from 'react-icons/bs';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../redux/slices/authSlice';
import axios from 'axios';

const Sidebar = ({ isWideMode }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
    const [showFullMenu, setShowFullMenu] = useState(false);
    const { authUser } = useSelector(state => state.auth);

    const handleCreatePostClick = () => {
        setIsCreatePostModalOpen(true);
    };

    const handleCloseCreatePostModal = () => {
        setIsCreatePostModalOpen(false);
    };

    const handleLogout = async () => {
        try {
            await axios.post('/api/auth/logout');
            dispatch(logout());
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    const toggleFullMenu = () => {
        setShowFullMenu(prev => !prev);
    };

    const menuItems = [
        { icon: <FaHome className="text-xl" />, label: 'Home', path: '/', hideOnCollapse: false },
        { icon: <FaBell className="text-xl" />, label: 'Notifications', path: '/notifications', hideOnCollapse: false },
        { icon: <FaHashtag className="text-xl" />, label: 'Explore', path: '/explore', hideOnCollapse: false },
        { icon: <FaNewspaper className="text-xl" />, label: 'News', path: '/news', hideOnCollapse: false },
        { icon: <BsChatDots className="text-xl" />, label: 'Messages', path: '/messages', hideOnCollapse: false },
        { icon: <FaBookmark className="text-xl" />, label: 'Bookmarks', path: '/bookmarks', hideOnCollapse: false },
        { icon: <FaUser className="text-xl" />, label: 'Profile', path: `/profile/${authUser?.username}`, hideOnCollapse: false },
        { icon: <FaCog className="text-xl" />, label: 'Settings', path: '/settings', hideOnCollapse: true },
    ];

    return (
        <div className={`${isWideMode ? 'w-64' : 'w-20'} bg-[#1e1e1e] h-screen fixed left-0 z-50 transition-all duration-200 ease-in-out px-2 py-3 overflow-y-auto border-r border-[#333] scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-[#1e1e1e]`}>
            <div className="mb-5 flex justify-center">
                <Link to="/" className="flex items-center justify-center p-2">
                    <img 
                        src="/avatar-placeholder.png" 
                        alt="XChan" 
                        className={`${isWideMode ? 'w-10 h-10' : 'w-8 h-8'} rounded-full border-2 border-gray-700`}
                    />
                    {isWideMode && (
                        <span className="ml-2 text-xl font-bold text-white">XChan</span>
                    )}
                </Link>
            </div>

            <div className="flex flex-col space-y-1">
                {menuItems.map((item, index) => (
                    (!item.hideOnCollapse || isWideMode) && (
                        <Link
                            key={index}
                            to={item.path}
                            className={`flex items-center py-3 px-3 rounded-full transition-colors duration-200 ${
                                isActive(item.path)
                                    ? 'bg-primary text-white'
                                    : 'text-gray-300 hover:bg-[#333] hover:text-white'
                            }`}
                        >
                            <div className="flex items-center justify-center">
                                {item.icon}
                            </div>
                            {isWideMode && <span className="ml-4">{item.label}</span>}
                        </Link>
                    )
                ))}

                <button
                    onClick={handleLogout}
                    className="flex items-center py-3 px-3 rounded-full text-gray-300 hover:bg-[#333] hover:text-white transition-colors duration-200"
                >
                    <FaSignOutAlt className="text-xl" />
                    {isWideMode && <span className="ml-4">Logout</span>}
                </button>
            </div>

            <div className="absolute bottom-5 left-0 right-0 px-2">
                <button
                    onClick={handleCreatePostClick}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-full transition-colors duration-200 flex items-center justify-center"
                >
                    <FaPlus className="mr-2" />
                    {isWideMode && <span>Post</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;