import { useState } from "react";
import { FaSync, FaList, FaTh, FaHome, FaNewspaper, FaComments, FaUserFriends, FaGlobe, FaCog, FaPlus } from "react-icons/fa";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import Posts from "../../components/common/Posts";
import PageHeader from "../../components/common/PageHeader";
import NewsCards from "../../components/news/NewsCards";
import BoardsList from "../../components/boards/BoardsList";
import ServicesList from "../../components/services/ServicesList";
import Breadcrumb from "../../components/common/Breadcrumb";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import FollowingUsers from "../../components/common/FollowingUsers";

const HomePage = ({ isWideMode }) => {
	const [activeCategory, setActiveCategory] = useState("myPosts");
	const [viewMode, setViewMode] = useState("list");
	const [isLoading, setIsLoading] = useState(false);
	const queryClient = useQueryClient();

	const categories = [
		{ id: "myPosts", label: "My Posts", icon: <FaHome /> },
		{ id: "news", label: "News", icon: <FaNewspaper /> },
		{ id: "boards", label: "Boards & Threads", icon: <FaComments /> },
		{ id: "following", label: "Following", icon: <FaUserFriends /> },
		{ id: "public", label: "Public Feed", icon: <FaGlobe /> },
		{ id: "services", label: "Services", icon: <FaCog /> }
	];

	const handleReload = () => {
		setIsLoading(true);
		queryClient.invalidateQueries({ queryKey: ["feed"] });
		toast.success("Content refreshed");
		setTimeout(() => setIsLoading(false), 500);
	};

	const handleCategoryChange = (categoryId) => {
		setIsLoading(true);
		setActiveCategory(categoryId);
		setTimeout(() => setIsLoading(false), 500);
	};

	const renderContent = () => {
		switch (activeCategory) {
			case "myPosts":
				return <Posts feedType="myPosts" isWideMode={isWideMode} viewMode={viewMode} />;
			case "news":
				return <NewsCards viewMode={viewMode} />;
			case "boards":
				return <BoardsList viewMode={viewMode} />;
			case "following":
				return <FollowingUsers viewMode={viewMode} />;
			case "public":
				return <Posts feedType="public" isWideMode={isWideMode} viewMode={viewMode} />;
			case "services":
				return <ServicesList viewMode={viewMode} />;
			default:
				return <Posts feedType="myPosts" isWideMode={isWideMode} viewMode={viewMode} />;
		}
	};

	return (
		<div className={`${isWideMode ? 'flex-1' : 'flex-[4_4_0] mr-auto'} border-r border-gray-700 min-h-screen bg-[#121212]`}>
			{/* Breadcrumb Navigation */}
			<Breadcrumb 
				items={[
					{ label: activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1) }
				]}
			/>

			{/* Header */}
			<PageHeader>
				<div className='flex w-full justify-between items-center'>
					<div className='flex flex-1 overflow-x-auto scrollbar-hide'>
						{categories.map((category) => (
							<div
								key={category.id}
								className={`flex items-center justify-center flex-1 p-3 hover:bg-[#1e1e1e] transition duration-300 cursor-pointer relative whitespace-nowrap gap-2 ${
									activeCategory === category.id ? 'text-primary' : 'text-gray-400'
								}`}
								onClick={() => handleCategoryChange(category.id)}
							>
								{category.icon}
								<span>{category.label}</span>
								{activeCategory === category.id && (
									<div className='absolute bottom-0 w-10 h-1 rounded-full bg-primary'></div>
								)}
							</div>
						))}
					</div>
					
					{/* Action Buttons */}
					<div className='flex items-center gap-3 ml-4'>
						<button
							onClick={() => setViewMode("list")}
							className={`p-2 rounded-full hover:bg-[#1e1e1e] transition-colors ${
								viewMode === "list" ? "text-primary" : "text-gray-400"
							}`}
							title="List View"
						>
							<FaList className='w-4 h-4' />
						</button>
						<button
							onClick={() => setViewMode("grid")}
							className={`p-2 rounded-full hover:bg-[#1e1e1e] transition-colors ${
								viewMode === "grid" ? "text-primary" : "text-gray-400"
							}`}
							title="Grid View"
						>
							<FaTh className='w-4 h-4' />
						</button>
						<button
							onClick={handleReload}
							className='p-2 rounded-full hover:bg-[#1e1e1e] transition-colors text-gray-400'
							title="Refresh Content"
						>
							<FaSync className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
						</button>
						<button
							className='flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full hover:bg-primary/90 transition-colors'
							title="Create Post"
						>
							<FaPlus className='w-4 h-4' />
							<span>Create Post</span>
						</button>
					</div>
				</div>
			</PageHeader>

			{/* Content */}
			<div className="p-4">
				{isLoading ? (
					<div className="flex justify-center items-center h-64">
						<LoadingSpinner size="lg" />
					</div>
				) : (
					renderContent()
				)}
			</div>
		</div>
	);
};

export default HomePage;
