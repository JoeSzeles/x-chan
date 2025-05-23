import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";

import useFollow from "../../hooks/useFollow";
import useSearch from "../../hooks/useSearch";

import RightPanelSkeleton from "../skeletons/RightPanelSkeleton";
import LoadingSpinner from "./LoadingSpinner";
import WhosOnline from "./WhosOnline";
import LiveBoard from "./LiveBoard";

const RightPanel = ({ isWideMode }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [showResults, setShowResults] = useState(false);
	const searchRef = useRef(null);
	const { data: searchResults, isLoading: isSearching } = useSearch(searchQuery);
	const { data: suggestedUsers, isLoading } = useQuery({
		queryKey: ["suggestedUsers"],
		queryFn: async () => {
			try {
				const res = await fetch("/api/users/suggested");
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Something went wrong!");
				}
				return data;
			} catch (error) {
				throw new Error(error.message);
			}
		},
	});

	const { follow, isPending } = useFollow();

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (searchRef.current && !searchRef.current.contains(event.target)) {
				setShowResults(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value);
		setShowResults(true);
	};

	const clearSearch = () => {
		setSearchQuery("");
		setShowResults(false);
	};

	return (
		<div className={`${isWideMode ? 'w-80' : 'hidden md:block md:w-64 lg:w-80'} h-screen`}>
			<div 
				className={`bg-[#15202b] p-4 rounded-md ${isWideMode ? 'border-l border-gray-700' : ''}`} 
				style={{ 
					maxHeight: '100vh', 
					height: '100vh',
					scrollbarWidth: 'thin',
					scrollbarColor: '#4a5568 #1a202c',
					overflowY: 'auto',
					overflowX: 'hidden',
					position: 'fixed',
					width: isWideMode ? '320px' : '256px',
					right: '0',
					top: '0',
					bottom: '0',
					zIndex: 10,
					paddingBottom: '60px'
				}}
			>
				{/* Search Bar */}
				<div className="relative mb-4" ref={searchRef}>
					<FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
					<input
						type="text"
						placeholder="Search Twitter"
						className="w-full bg-[#1e1e1e] text-white pl-10 pr-10 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1da1f2]"
						value={searchQuery}
						onChange={handleSearchChange}
						onFocus={() => setShowResults(true)}
					/>
					{searchQuery && (
						<button
							onClick={clearSearch}
							className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
						>
							<FaTimes />
						</button>
					)}
					{/* Search Results Dropdown */}
					{showResults && searchQuery && (
						<div className="absolute top-full left-0 right-0 mt-2 bg-[#15202b] rounded-lg shadow-lg border border-gray-700 max-h-96 overflow-y-auto z-50">
							{isSearching ? (
								<div className="p-4 flex justify-center">
									<LoadingSpinner size="sm" />
								</div>
							) : searchResults?.length > 0 ? (
								searchResults.map((user) => (
									<Link
										key={user._id}
										to={`/profile/${user.username}`}
										className="flex items-center gap-3 p-3 hover:bg-[#1e1e1e] border-b border-gray-700 last:border-b-0"
										onClick={() => setShowResults(false)}
									>
										<div className="avatar">
											<div className="w-10 rounded-full">
												<img src={user.profileImg || "/avatar-placeholder.png"} alt={user.fullName} />
											</div>
										</div>
										<div className="flex flex-col">
											<span className="font-semibold">{user.fullName}</span>
											<span className="text-sm text-gray-500">@{user.username}</span>
										</div>
									</Link>
								))
							) : (
								<div className="p-4 text-center text-gray-500">
									No results found
								</div>
							)}
						</div>
					)}
				</div>

				{/* Who's Online Section */}
				<div className="mb-6">
					<WhosOnline />
				</div>

				{/* Live Board Section */}
				<div className="mb-6">
					<LiveBoard />
				</div>

				<p className='font-bold mb-4'>Who to follow</p>
				<div className='flex flex-col gap-4'>
					{/* item */}
					{isLoading && (
						<>
							<RightPanelSkeleton />
							<RightPanelSkeleton />
							<RightPanelSkeleton />
							<RightPanelSkeleton />
						</>
					)}
					{!isLoading && suggestedUsers?.length > 0 && suggestedUsers?.map((user) => (
						<div
							className='flex items-center justify-between gap-4'
							key={user._id}
						>
							<div className='flex gap-2 items-center'>
								<div className='avatar'>
									<div className='w-10 h-10 relative rounded-full bg-[#1e1e1e] p-0.5'>
										<div className='w-full h-full rounded-full overflow-hidden flex items-center justify-center border-2 border-gray-700'>
											<img 
												src={user.profileImg || "/avatar-placeholder.png"} 
												className="w-full h-full object-cover" 
												alt={user.fullName}
												onError={(e) => {
													e.target.src = "/avatar-placeholder.png";
												}}
											/>
										</div>
									</div>
								</div>
								<div className='flex flex-col'>
									<Link 
										to={`/profile/${user.username}`}
										className='font-semibold tracking-tight truncate w-28 hover:underline'
									>
										{user.fullName}
									</Link>
									<span className='text-sm text-slate-500'>@{user.username}</span>
								</div>
							</div>
							<div>
								<button
									className='bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white rounded-full px-3 py-1 text-sm font-semibold transition-all shadow-[0_0_10px_rgba(29,155,240,0.3)] hover:shadow-[0_0_15px_rgba(29,155,240,0.5)]'
									onClick={() => follow(user._id)}
								>
									{isPending ? <LoadingSpinner size='sm' /> : "Follow"}
								</button>
							</div>
						</div>
					))}
					{!isLoading && (!suggestedUsers || suggestedUsers.length === 0) && (
						<p className="text-gray-500 text-center">No suggestions available</p>
					)}
				</div>
			</div>
		</div>
	);
};

export default RightPanel;