import { MdHomeFilled } from "react-icons/md";
import { IoNotifications } from "react-icons/io5";
import { FaUser, FaFeather, FaBookmark, FaList, FaCog } from "react-icons/fa";
import { BiLogOut } from "react-icons/bi";
import { BsNewspaper, BsChatDots, BsGrid3X3 } from "react-icons/bs";
import { RiServiceLine } from "react-icons/ri";
import { Link, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PostPopup from "./PostPopup";
import { useState } from "react";

const Sidebar = ({ isWideMode }) => {
	const [showPostPopup, setShowPostPopup] = useState(false);
	const queryClient = useQueryClient();
	const location = useLocation();
	const { mutate: logout } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch("/api/auth/logout", {
					method: "POST",
				});
				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				// Remove the token from localStorage
				localStorage.removeItem("token");
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["authUser"] });
		},
		onError: () => {
			toast.error("Logout failed");
		},
	});
	const { data: authUser } = useQuery({ queryKey: ["authUser"] });

	const isActive = (path) => {
		return location.pathname === path;
	};

	return (
		<div className={`${isWideMode ? 'w-64' : 'md:flex-[2_2_0] w-18 max-w-52'}`}>
			<div className={`sticky top-0 left-0 h-screen overflow-y-auto flex flex-col ${isWideMode ? 'border-r border-gray-700' : ''} ${isWideMode ? 'w-64' : 'w-20 md:w-full'}`} style={{ overflowY: 'auto', maxHeight: '100vh' }}>
				<Link to='/' className='flex justify-center md:justify-start p-6'>
					<div className='w-16 h-16 rounded-full hover:bg-stone-900 transition-all duration-200 flex items-center justify-center'>
						<img 
							src="/xchan_small.png" 
							alt="XChan Logo" 
							className='w-12 h-12'
							onError={(e) => {
								console.error("Logo failed to load from path:", e.target.src);
								// Try direct hardcoded URL with no origin
								e.target.src = "/avatar-placeholder.png";
							}}
						/>
					</div>
				</Link>
				<ul className='flex flex-col gap-3 mt-4'>
					<li className='flex justify-center md:justify-start'>
						<Link
							to='/'
							className={`nav-button ${isActive('/') ? 'active' : ''}`}
						>
							<MdHomeFilled className='w-8 h-8' />
							<span className='text-lg hidden md:block'>Home</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link
							to='/notifications'
							className={`nav-button ${isActive('/notifications') ? 'active' : ''}`}
						>
							<IoNotifications className='w-6 h-6' />
							<span className='text-lg hidden md:block'>Notifications</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link
							to='/news'
							className={`nav-button ${isActive('/news') ? 'active' : ''}`}
						>
							<BsNewspaper className='w-6 h-6' />
							<span className='text-lg hidden md:block'>News</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link
							to='/bookmarks'
							className={`nav-button ${isActive('/bookmarks') ? 'active' : ''}`}
						>
							<FaBookmark className='w-6 h-6' />
							<span className='text-lg hidden md:block'>Bookmarks</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link
							to='/lists'
							className={`nav-button ${isActive('/lists') ? 'active' : ''}`}
						>
							<FaList className='w-6 h-6' />
							<span className='text-lg hidden md:block'>Lists</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link
							to='/messages'
							className={`nav-button ${isActive('/messages') ? 'active' : ''}`}
						>
							<BsChatDots className='w-6 h-6' />
							<span className='text-lg hidden md:block'>Messages</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link
							to='/services'
							className={`nav-button ${isActive('/services') ? 'active' : ''}`}
						>
							<RiServiceLine className='w-6 h-6' />
							<span className='text-lg hidden md:block'>Services</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link
							to='/boards'
							className={`nav-button ${isActive('/boards') ? 'active' : ''}`}
						>
							<BsGrid3X3 className='w-6 h-6' />
							<span className='text-lg hidden md:block'>Boards</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link
							to='/settings'
							className={`nav-button ${isActive('/settings') ? 'active' : ''}`}
						>
							<FaCog className='w-6 h-6' />
							<span className='text-lg hidden md:block'>Settings</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link
							to={`/profile/${authUser?.username}`}
							className={`nav-button ${isActive(`/profile/${authUser?.username}`) ? 'active' : ''}`}
						>
							<FaUser className='w-6 h-6' />
							<span className='text-lg hidden md:block'>Profile</span>
						</Link>
					</li>
				</ul>

				{authUser && (
					<div className='mt-auto mb-10'>
						{/* Post Button */}
						<div className="px-4 mb-4">
							<button
								onClick={() => setShowPostPopup(true)}
								className="w-full bg-blue-500 text-white rounded-full py-2.5 px-4 font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2 text-base shadow-[0_0_10px_rgba(59,130,246,0.5)] hover:shadow-[0_0_15px_rgba(59,130,246,0.7)]"
							>
								<FaFeather size={20} />
								<span className="hidden md:block">Post</span>
							</button>
						</div>

						<div className='flex items-center gap-2 p-2 rounded-full hover:bg-[#181818] transition-all duration-300'>
							<div className='avatar'>
								<div className='w-10 h-10 rounded-full overflow-hidden relative'>
									<div className='absolute inset-0 border-2 border-gray-300 rounded-full'></div>
									<img 
										src={authUser?.profileImg || "/avatar-placeholder.png"} 
										className="w-full h-full object-cover"
									/>
								</div>
							</div>
							<div className='hidden md:block flex-1'>
								<p className='text-white font-bold text-sm'>{authUser?.fullName}</p>
								<p className='text-slate-500 text-sm'>@{authUser?.username}</p>
							</div>
						</div>
						<button 
							className="nav-button mt-2"
							onClick={(e) => {
								e.preventDefault();
								logout();
							}}
						>
							<BiLogOut className='w-5 h-5' />
							<span className='text-lg hidden md:block'>Logout</span>
						</button>
					</div>
				)}

				{/* Post Popup */}
				{showPostPopup && (
					<PostPopup
						onClose={() => setShowPostPopup(false)}
					/>
				)}
			</div>
		</div>
	);
};

export default Sidebar;
