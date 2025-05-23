import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const useFollow = () => {
	const queryClient = useQueryClient();

	const { mutate: follow, isPending } = useMutation({
		mutationFn: async (userId) => {
			try {
				console.log("Following user with ID:", userId);
				const res = await fetch(`/api/users/follow/${userId}`, {
					method: "POST",
					credentials: "include",
					headers: {
						"Content-Type": "application/json"
					}
				});

				const data = await res.json();
				if (!res.ok) {
					console.error("Follow error response:", data);
					throw new Error(data.error || "Something went wrong!");
				}
				console.log("Follow success response:", data);
				return data;
			} catch (error) {
				console.error("Follow error:", error);
				throw new Error(error.message);
			}
		},
		onSuccess: (data) => {
			console.log("Follow mutation successful:", data);
			// Invalidate related queries
			Promise.all([
				queryClient.invalidateQueries({ queryKey: ["suggestedUsers"] }),
				queryClient.invalidateQueries({ queryKey: ["authUser"] }),
				queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
				queryClient.invalidateQueries({ queryKey: ["onlineUsers"] })
			]);
			
			// Show success message
			toast.success(data.message || "Follow status updated");
		},
		onError: (error) => {
			console.error("Follow mutation error:", error);
			toast.error(error.message || "Failed to update follow status");
		},
	});

	return { follow, isPending };
};

export default useFollow;
