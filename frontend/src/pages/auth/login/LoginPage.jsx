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
				console.log('[LoginPage] Attempting login with:', { username: inputs.username });
				
				const res = await fetch("/api/auth/login", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: 'include',
					body: JSON.stringify(inputs),
				});
				
				const data = await res.json();
				console.log('[LoginPage] Login response:', { status: res.status, ok: res.ok });
				
				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				
				// Store the token and user data in localStorage
				if (data.token) {
					localStorage.setItem("token", data.token);
					localStorage.setItem("userData", JSON.stringify(data));
					console.log('[LoginPage] Stored token and user data', { userId: data._id });
					
					// Set token in cookie as well (belt and suspenders approach)
					document.cookie = `jwt=${data.token}; path=/; max-age=604800; SameSite=Lax`;
				} else {
					console.warn('[LoginPage] No token received in login response');
				}
				
				return data;
			} catch (error) {
				console.error('[LoginPage] Login error:', error);
				throw new Error(error.message || "Authentication failed");
			}
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["authUser"] });
			toast.success("Login successful!");
			
			// Force page reload to ensure all components recognize the authentication
			setTimeout(() => {
				window.location.href = '/';
			}, 300);
		},
		onError: (error) => {
			console.error('[LoginPage] Login mutation error:', error);
			toast.error(error.message || "Failed to log in");
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
					src="/src/components/images/xchan.png" 
					alt="4Chan Logo" 
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
