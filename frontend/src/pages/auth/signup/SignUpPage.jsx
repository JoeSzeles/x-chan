import { Link } from "react-router-dom";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

const SignUpPage = () => {
	const [inputs, setInputs] = useState({
		fullName: "",
		username: "",
		password: "",
		email: "",
	});

	const { mutate: signup, isPending } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch("/api/auth/signup", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(inputs),
				});
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: () => {
			toast.success("Account created successfully. Please log in.");
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const handleSubmit = async (e) => {
		e.preventDefault();
		signup();
	};

	return (
		<div className='flex flex-col items-center justify-center min-h-screen'>
			<div className='flex flex-col items-center gap-8 w-full max-w-md p-8 rounded-lg bg-[#1e1e1e]'>
				<img 
					src="/src/components/images/xchan.png" 
					alt="4Chan Logo" 
					className='w-32 h-32 object-contain'
				/>
				<h1 className='text-3xl font-bold'>Create your account</h1>
				<form className='flex flex-col gap-4 w-full' onSubmit={handleSubmit}>
					<input
						type='text'
						placeholder='Full Name'
						className='input h-12 bg-[#272525] border border-gray-700 rounded-lg px-4 w-full text-lg'
						value={inputs.fullName}
						onChange={(e) => setInputs({ ...inputs, fullName: e.target.value })}
					/>
					<input
						type='text'
						placeholder='Username'
						className='input h-12 bg-[#272525] border border-gray-700 rounded-lg px-4 w-full text-lg'
						value={inputs.username}
						onChange={(e) => setInputs({ ...inputs, username: e.target.value })}
					/>
					<input
						type='email'
						placeholder='Email'
						className='input h-12 bg-[#272525] border border-gray-700 rounded-lg px-4 w-full text-lg'
						value={inputs.email}
						onChange={(e) => setInputs({ ...inputs, email: e.target.value })}
					/>
					<input
						type='password'
						placeholder='Password'
						className='input h-12 bg-[#272525] border border-gray-700 rounded-lg px-4 w-full text-lg'
						value={inputs.password}
						onChange={(e) => setInputs({ ...inputs, password: e.target.value })}
					/>
					<button
						className='btn btn-primary w-full h-12 rounded-lg text-lg font-bold disabled:opacity-70'
						disabled={isPending}
					>
						{isPending ? <LoadingSpinner /> : "Sign up"}
					</button>
				</form>

				<p className='text-slate-500'>
					Already have an account?{" "}
					<Link to='/login' className='text-primary hover:underline'>
						Log in
					</Link>
				</p>
			</div>
		</div>
	);
};

export default SignUpPage;
