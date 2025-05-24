import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const useFollow = () => {
	const queryClient = useQueryClient();

	const { mutate: follow, isPending } = useMutation({
		mutationFn: async (userId) => {
			try {
				const res = await fetch(`/api/users/follow/${userId}`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include", // Important for authentication
				});

				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Something went wrong!");
				}
				return data;
			} catch (error) {
				throw new Error(error.message);
			}
		},
		onSuccess: (data) => {
			// Invalidate relevant queries to refresh data
			Promise.all([
				queryClient.invalidateQueries({ queryKey: ["suggestedUsers"] }),
				queryClient.invalidateQueries({ queryKey: ["authUser"] }),
				queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
				queryClient.invalidateQueries({ queryKey: ["followers"] }),
				queryClient.invalidateQueries({ queryKey: ["following"] }),
			]);
			
			toast.success(data?.message || "Follow status updated successfully");
		},
		onError: (error) => {
			console.error("Follow error:", error);
			toast.error(error.message || "Failed to update follow status");
		},
	});

	return { follow, isPending };
};

export default useFollow;
