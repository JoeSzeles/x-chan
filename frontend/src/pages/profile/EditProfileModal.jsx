import { useEffect, useState } from "react";
import useUpdateUserProfile from "../../hooks/useUpdateUserProfile";
import { FaMapMarkerAlt } from "react-icons/fa";
import Select from 'react-select';
import countryList from 'react-select-country-list';
import { createPortal } from "react-dom";

const EditProfileModal = ({ authUser, onClose }) => {
	const [formData, setFormData] = useState({
		fullName: "",
		username: "",
		email: "",
		bio: "",
		link: "",
		newPassword: "",
		currentPassword: "",
		location: {
			country: "",
			countryCode: ""
		}
	});

	const { updateProfile, isUpdatingProfile } = useUpdateUserProfile();
	const countryOptions = countryList().getData();

	const handleInputChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleCountryChange = (selectedOption) => {
		console.log("Country selected:", selectedOption);
		setFormData({
			...formData,
			location: {
				country: selectedOption.label,
				countryCode: selectedOption.value
			}
		});
	};

	useEffect(() => {
		if (authUser) {
			console.log("Auth user data:", authUser);
			const initialLocation = authUser.location || {
				country: "",
				countryCode: ""
			};
			console.log("Initial location:", initialLocation);
			
			setFormData({
				fullName: authUser.fullName || "",
				username: authUser.username || "",
				email: authUser.email || "",
				bio: authUser.bio || "",
				link: authUser.link || "",
				newPassword: "",
				currentPassword: "",
				location: initialLocation
			});
		}
	}, [authUser]);

	// Get the current selected country option
	const selectedCountryOption = formData.location?.countryCode ? 
		countryOptions.find(option => option.value === formData.location.countryCode) : 
		null;

	console.log("Current formData:", formData);
	console.log("Selected country option:", selectedCountryOption);

	const customStyles = {
		control: (base) => ({
			...base,
			backgroundColor: 'rgba(39, 37, 37, 0.5)',
			borderColor: 'rgba(255, 255, 255, 0.1)',
			borderRadius: '0.5rem',
			padding: '4px',
			'&:hover': {
				borderColor: 'rgba(255, 255, 255, 0.2)'
			}
		}),
		menu: (base) => ({
			...base,
			backgroundColor: 'rgba(39, 37, 37, 0.95)',
			backdropFilter: 'blur(12px)',
			WebkitBackdropFilter: 'blur(12px)',
			zIndex: 9999
		}),
		option: (base, state) => ({
			...base,
			backgroundColor: state.isFocused ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
			color: 'rgb(229, 231, 235)',
			':active': {
				backgroundColor: 'rgba(255, 255, 255, 0.2)'
			}
		}),
		singleValue: (base) => ({
			...base,
			color: 'rgb(229, 231, 235)'
		}),
		input: (base) => ({
			...base,
			color: 'rgb(229, 231, 235)'
		})
	};

	return createPortal(
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 999999 }}>
			<div 
				className="bg-[#1e1e1e]/70 backdrop-blur-md rounded-lg p-6 w-full max-w-2xl mx-4 relative border border-white/10" 
				style={{
					backgroundColor: 'rgba(30, 30, 30, 0.7)',
					backdropFilter: 'blur(12px)',
					WebkitBackdropFilter: 'blur(12px)',
				}}
			>
				<div className="flex justify-between items-center mb-6">
					<div className="flex items-center gap-4">
						<img 
							src="/assets/xchan.png" 
							alt="X Logo" 
							className="w-8 h-8 object-contain"
						/>
						<h3 className="text-xl font-bold text-white">Update Profile</h3>
					</div>
					<button onClick={onClose} className="text-gray-400 hover:text-white text-xl">
						×
					</button>
				</div>

				<form
					className="flex flex-col gap-4"
					onSubmit={async (e) => {
						e.preventDefault();
						console.log("Submitting form data:", formData);
						await updateProfile(formData);
						onClose();
					}}
				>
					<div className="flex flex-wrap gap-4">
						<input
							type="text"
							placeholder="Full Name"
							className="flex-1 p-3 rounded-lg bg-[#272525]/50 backdrop-blur-sm border border-white/10 focus:border-[#1d9bf0] focus:outline-none text-white placeholder-gray-500 min-h-[48px]"
							value={formData.fullName}
							name="fullName"
							onChange={handleInputChange}
						/>
						<input
							type="text"
							placeholder="Username"
							className="flex-1 p-3 rounded-lg bg-[#272525]/50 backdrop-blur-sm border border-white/10 focus:border-[#1d9bf0] focus:outline-none text-white placeholder-gray-500 min-h-[48px]"
							value={formData.username}
							name="username"
							onChange={handleInputChange}
						/>
					</div>

					<input
						type="email"
						placeholder="Email"
						className="w-full p-3 rounded-lg bg-[#272525]/50 backdrop-blur-sm border border-white/10 focus:border-[#1d9bf0] focus:outline-none text-white placeholder-gray-500 min-h-[48px]"
						value={formData.email}
						name="email"
						onChange={handleInputChange}
					/>

					<textarea
						placeholder="Bio"
						className="w-full p-3 rounded-lg bg-[#272525]/50 backdrop-blur-sm border border-white/10 focus:border-[#1d9bf0] focus:outline-none text-white placeholder-gray-500 resize-none min-h-[120px]"
						value={formData.bio}
						name="bio"
						onChange={handleInputChange}
					/>

					<div className="flex flex-wrap gap-4">
						<input
							type="password"
							placeholder="Current Password"
							className="flex-1 p-3 rounded-lg bg-[#272525]/50 backdrop-blur-sm border border-white/10 focus:border-[#1d9bf0] focus:outline-none text-white placeholder-gray-500 min-h-[48px]"
							value={formData.currentPassword}
							name="currentPassword"
							onChange={handleInputChange}
						/>
						<input
							type="password"
							placeholder="New Password"
							className="flex-1 p-3 rounded-lg bg-[#272525]/50 backdrop-blur-sm border border-white/10 focus:border-[#1d9bf0] focus:outline-none text-white placeholder-gray-500 min-h-[48px]"
							value={formData.newPassword}
							name="newPassword"
							onChange={handleInputChange}
						/>
					</div>

					<div className="flex flex-wrap gap-4">
						<input
							type="text"
							placeholder="Link"
							className="flex-1 p-3 rounded-lg bg-[#272525]/50 backdrop-blur-sm border border-white/10 focus:border-[#1d9bf0] focus:outline-none text-white placeholder-gray-500 min-h-[48px]"
							value={formData.link}
							name="link"
							onChange={handleInputChange}
						/>
						<div className="flex-1">
							<Select
								options={countryOptions}
								value={selectedCountryOption}
								onChange={handleCountryChange}
								placeholder="Select Country"
								styles={customStyles}
								className="react-select-container min-h-[48px]"
								classNamePrefix="react-select"
								isClearable={true}
							/>
						</div>
					</div>

					<div className="flex gap-3 mt-4">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-4 py-3 rounded-full bg-gray-700/50 backdrop-blur-sm hover:bg-gray-600/50 text-white border border-white/10"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isUpdatingProfile}
							className="flex-1 px-4 py-3 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:opacity-50 text-white"
						>
							{isUpdatingProfile ? "Updating..." : "Update"}
						</button>
					</div>
				</form>
			</div>
		</div>,
		document.body
	);
};

export default EditProfileModal;
