import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import Posts from "../../components/common/Posts";
import ProfileHeaderSkeleton from "../../components/skeletons/ProfileHeaderSkeleton";
import EditProfileModal from "./EditProfileModal";
import InteractiveCoverPhoto from '../../components/profile/InteractiveCoverPhoto';
import ProfilePicture from '../../components/profile/ProfilePicture';
import MediaPage from "./MediaPage";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumb from "../../components/common/Breadcrumb";

import { POSTS } from "../../utils/db/dummy";

import { FaArrowLeft } from "react-icons/fa6";
import { IoCalendarOutline } from "react-icons/io5";
import { FaLink } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import { FaMapMarkerAlt } from "react-icons/fa";
import { formatMemberSinceDate } from "../../utils/date";

import useFollow from "../../hooks/useFollow";
import useUpdateUserProfile from "../../hooks/useUpdateUserProfile";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const ProfilePage = () => {
	const [coverImg, setCoverImg] = useState(null);
	const [profileImg, setProfileImg] = useState(null);
	const [feedType, setFeedType] = useState("posts");
	const [showEditProfileModal, setShowEditProfileModal] = useState(false);
	const [coverData, setCoverData] = useState(null);
	const [activeTab, setActiveTab] = useState("posts");

	const coverImgRef = useRef(null);
	const profileImgRef = useRef(null);

	const { username } = useParams();

	const { follow, isPending } = useFollow();
	const { data: authUser } = useQuery({ queryKey: ["authUser"] });

	const {
		data: user,
		isLoading,
		refetch,
		isRefetching,
	} = useQuery({
		queryKey: ["user", username],
		queryFn: async () => {
			try {
				const res = await fetch(`/api/users/profile/${username}`);
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				console.log("Fetched user data:", data);
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
	});

	const { isUpdatingProfile, updateProfile } = useUpdateUserProfile();

	const isMyProfile = authUser._id === user?._id;
	const memberSinceDate = formatMemberSinceDate(user?.createdAt);
	const amIFollowing = authUser?.following.includes(user?._id);

	const queryClient = useQueryClient();

	const handleImgChange = (e, state) => {
		const file = e.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = () => {
				state === "coverImg" && setCoverImg(reader.result);
				state === "profileImg" && setProfileImg(reader.result);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleCoverUpdate = async (data) => {
        try {
            console.log('ProfilePage: handleCoverUpdate called with data:', data);
            setCoverData(data);

            const requestBody = {
                type: data.type,
                content: data.content,
                metadata: {
                    videoId: data.type === 'video' ? data.content : undefined,
                    source: data.type === 'video' ? 'youtube' : 'upload'
                }
            };

            const response = await fetch('/api/cover-photo/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(requestBody)
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format from server');
            }

            const responseData = await response.json();

            if (!response.ok || !responseData.success) {
                throw new Error(responseData?.error || 'Failed to update cover photo');
            }

            if (responseData.user) {
                queryClient.setQueryData(['user', username], responseData.user);
            }

            await refetch();
            toast.success('Cover photo updated successfully');

        } catch (error) {
            console.error('ProfilePage: Error updating cover photo:', error);
            // Only show error toast if it's not a background update
            if (data.showToast !== false) {
                toast.error(error.message || 'Failed to update cover photo');
            }
        }
    };

	const handleProfileUpdate = async (data) => {
        try {
            const formData = new FormData();
            formData.append('profileImg', data.content);

            const response = await fetch('/api/users/update-profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const updatedData = await response.json();

            if (!response.ok) {
                throw new Error(updatedData.error || 'Failed to update profile picture');
            }

            queryClient.setQueryData(['user', username], (oldData) => ({
                ...oldData,
                profileImg: updatedData.user.profileImg
            }));

            await refetch();
            toast.success('Profile picture updated successfully');

        } catch (error) {
            console.error('Error updating profile picture:', error);
            toast.error(error.message || 'Failed to update profile picture');
        }
    };

	useEffect(() => {
		console.log("Current user data:", user);
	}, [user]);

	useEffect(() => {
		refetch();
	}, [username, refetch]);

	const handleFollow = async (userId) => {
		try {
			const res = await fetch(`/api/users/follow/${userId}`, {
				method: "POST",
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Something went wrong");
			}
			toast.success(
				amIFollowing ? "Unfollowed successfully" : "Followed successfully"
			);
			queryClient.invalidateQueries({ queryKey: ["user", username] });
		} catch (error) {
			toast.error(error.message);
		}
	};

	if (isLoading) {
		return (
			<div className='flex justify-center items-center h-screen'>
				<LoadingSpinner size='lg' />
			</div>
		);
	}

	return (
		<>
			<div className='flex-[4_4_0]  border-r border-gray-700 min-h-screen '>
				{/* Breadcrumb Navigation */}
				<Breadcrumb 
					items={[
						{ label: 'Profile', link: '/profile' },
						{ label: user?.username || 'Loading...' }
					]}
				/>

				{/* HEADER */}
				{(isLoading || isRefetching) && <ProfileHeaderSkeleton />}
				{!isLoading && !isRefetching && !user && <p className='text-center text-lg mt-4'>User not found</p>}
				<div className='flex flex-col'>
					{!isLoading && !isRefetching && user && (
						<>
							<PageHeader>
								<div className='flex gap-10 items-center'>
									<Link to='/'>
										<FaArrowLeft className='w-4 h-4' />
									</Link>
									<div className='flex flex-col'>
										<p className='font-bold text-lg'>{user?.fullName}</p>
										<span className='text-sm text-slate-500'>{POSTS?.length} posts</span>
									</div>
								</div>
							</PageHeader>
							{/* COVER IMG */}
							<InteractiveCoverPhoto 
								user={user}
								isMyProfile={isMyProfile}
								onUpdate={handleCoverUpdate}
								/>

							{/* PROFILE PICTURE */}
							<ProfilePicture
								user={user}
								isMyProfile={isMyProfile}
								onUpdate={handleProfileUpdate}
												/>

							<div className='flex justify-end px-4 mt-5'>
								{isMyProfile && (
									<button
										className='btn btn-outline rounded-full btn-sm'
										onClick={() => setShowEditProfileModal(true)}
									>
										Edit profile
									</button>
								)}
								{!isMyProfile && (
									<button
										className='btn btn-outline rounded-full btn-sm'
										onClick={() => handleFollow(user?._id)}
									>
										{isPending && "Loading..."}
										{!isPending && amIFollowing && "Unfollow"}
										{!isPending && !amIFollowing && "Follow"}
									</button>
								)}
								{(coverImg || profileImg) && (
									<button
										className='btn btn-primary rounded-full btn-sm text-white px-4 ml-2'
										onClick={async () => {
											await updateProfile({ coverImg, profileImg });
											setProfileImg(null);
											setCoverImg(null);
										}}
									>
										{isUpdatingProfile ? "Updating..." : "Update"}
									</button>
								)}
							</div>

							{showEditProfileModal && (
								<EditProfileModal 
									authUser={authUser} 
									onClose={() => setShowEditProfileModal(false)}
								/>
							)}

							<div className='flex flex-col gap-4 mt-14 px-4'>
								<div className='flex flex-col'>
									<span className='font-bold text-lg'>{user?.fullName}</span>
									<span className='text-sm text-slate-500'>@{user?.username}</span>
									<span className='text-sm my-1'>{user?.bio}</span>
								</div>

								<div className='flex gap-2 flex-wrap'>
									{user?.link && (
										<div className='flex gap-1 items-center '>
											<>
												<FaLink className='w-3 h-3 text-slate-500' />
												<a
													href={user?.link}
													target='_blank'
													rel='noreferrer'
													className='text-sm text-blue-500 hover:underline'
												>
													{user?.link}
												</a>
											</>
										</div>
									)}
									<div className='flex gap-2 items-center'>
										<IoCalendarOutline className='w-4 h-4 text-slate-500' />
										<span className='text-sm text-slate-500'>{memberSinceDate}</span>
										{user?.location?.country && user?.location?.countryCode && (
											<>
												<span className='text-slate-500'>·</span>
												<FaMapMarkerAlt className='w-4 h-4 text-slate-500' />
												<span className='text-sm text-slate-500 flex items-center gap-1'>
													{user.location.country}
													<img
														src={`https://flagcdn.com/w20/${user.location.countryCode.toLowerCase()}.png`}
														alt={user.location.country}
														className="w-4 h-3 object-cover rounded-sm"
														onError={(e) => {
															console.log("Flag load error:", e);
															e.target.style.display = 'none';
														}}
													/>
												</span>
											</>
										)}
									</div>
								</div>
								<div className='flex gap-2'>
									<div className='flex gap-1 items-center'>
										<span className='font-bold text-xs'>{user?.following.length}</span>
										<span className='text-slate-500 text-xs'>Following</span>
									</div>
									<div className='flex gap-1 items-center'>
										<span className='font-bold text-xs'>{user?.followers.length}</span>
										<span className='text-slate-500 text-xs'>Followers</span>
									</div>
								</div>
							</div>
							<div className='flex w-full border-b border-gray-700 mt-4 overflow-x-auto'>
								<div
									className={`flex justify-center flex-1 p-3 hover:bg-secondary transition duration-300 relative cursor-pointer whitespace-nowrap ${
										activeTab === "posts" ? "text-white" : "text-slate-500"
									}`}
									onClick={() => setActiveTab("posts")}
								>
									Posts
									{activeTab === "posts" && (
										<div className='absolute bottom-0 w-10 h-1 rounded-full bg-primary' />
									)}
								</div>
								<div
									className={`flex justify-center flex-1 p-3 hover:bg-secondary transition duration-300 relative cursor-pointer whitespace-nowrap ${
										activeTab === "likes" ? "text-white" : "text-slate-500"
									}`}
									onClick={() => setActiveTab("likes")}
								>
									Likes
									{activeTab === "likes" && (
										<div className='absolute bottom-0 w-10 h-1 rounded-full bg-primary' />
									)}
								</div>
								<div
									className={`flex justify-center flex-1 p-3 hover:bg-secondary transition duration-300 relative cursor-pointer whitespace-nowrap ${
										activeTab === "replies" ? "text-white" : "text-slate-500"
									}`}
									onClick={() => setActiveTab("replies")}
								>
									Replies
									{activeTab === "replies" && (
										<div className='absolute bottom-0 w-10 h-1 rounded-full bg-primary' />
									)}
								</div>
								<div
									className={`flex justify-center flex-1 p-3 hover:bg-secondary transition duration-300 relative cursor-pointer whitespace-nowrap ${
										activeTab === "media" ? "text-white" : "text-slate-500"
									}`}
									onClick={() => setActiveTab("media")}
								>
									Media
									{activeTab === "media" && (
										<div className='absolute bottom-0 w-10 h-1 rounded-full bg-primary' />
									)}
								</div>
							</div>

							{/* Content */}
							{activeTab === "posts" && (
								<Posts feedType="posts" username={username} />
							)}
							{activeTab === "replies" && (
								<Posts feedType="replies" username={username} />
							)}
							{activeTab === "media" && (
								<MediaPage username={username} />
							)}
							{activeTab === "likes" && (
								<Posts feedType="likes" username={username} />
							)}
						</>
					)}
				</div>
			</div>
		</>
	);
};
export default ProfilePage;