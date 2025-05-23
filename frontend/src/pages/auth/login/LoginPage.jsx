import { Link } from "react-router-dom";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

const LoginPage = () => {
	const [inputs, setInputs] = useState({
		username: "",
		password: "",
	});

	const queryClient = useQueryClient();
	const { mutate: login, isPending } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch("/api/auth/login", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: 'include',
					body: JSON.stringify(inputs),
				});
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				// Store the token and user data in localStorage
				if (data.token) {
				localStorage.setItem("token", data.token);
					localStorage.setItem("userData", JSON.stringify(data));
					console.log('[LoginPage] Stored token and user data');
				}
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["authUser"] });
			toast.success("Login successful!");
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const handleSubmit = async (e) => {
		e.preventDefault();
		login();
	};

	return (
		<div className='flex flex-col items-center justify-center min-h-screen'>
			<div className='flex flex-col items-center gap-8 w-full max-w-md p-8 rounded-lg bg-[#1e1e1e]'>
				<img 
					src="/assets/xchan.png" 
					alt="XChan Logo" 
					className='w-32 h-32 object-contain'
				/>
				<h1 className='text-3xl font-bold'>Sign in to XChan</h1>
				<form className='flex flex-col gap-4 w-full' onSubmit={handleSubmit}>
					<input
						type='text'
						placeholder='Username'
						className='input h-12 bg-[#272525] border border-gray-700 rounded-lg px-4 w-full text-lg'
						value={inputs.username}
						onChange={(e) => setInputs({ ...inputs, username: e.target.value })}
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
						{isPending ? <LoadingSpinner /> : "Log in"}
					</button>
				</form>

				<p className='text-slate-500'>
					Don't have an account?{" "}
					<Link to='/signup' className='text-primary hover:underline'>
						Sign up
					</Link>
				</p>
			</div>
		</div>
	);
};

export default LoginPage;