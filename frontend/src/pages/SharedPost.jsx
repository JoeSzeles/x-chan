import { useQuery } from "@tanstack/react-query";
import { useParams, Navigate } from "react-router-dom";
import Post from "../components/common/Post";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useQuery as useAuthQuery } from "@tanstack/react-query";

const SharedPost = () => {
    const { postId } = useParams();

    // Get auth user if exists
    const { data: authUser } = useAuthQuery({
        queryKey: ["authUser"],
        queryFn: async () => {
            try {
                const res = await fetch("/api/auth/me");
                const data = await res.json();
                if (data.error) return null;
                if (!res.ok) {
                    throw new Error(data.error || "Something went wrong");
                }
                return data;
            } catch (error) {
                return null;
            }
        },
        retry: false,
    });

    const { data: post, isLoading, error } = useQuery({
        queryKey: ["sharedPost", postId],
        queryFn: async () => {
            try {
                const res = await fetch(`/api/posts/${postId}`);
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || "Something went wrong");
                }
                return data;
            } catch (error) {
                throw new Error(error);
            }
        },
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (error) {
        return <Navigate to="/" />;
    }

    if (!post) {
        return <Navigate to="/" />;
    }

    return (
        <div className="max-w-2xl mx-auto p-4">
            <Post post={post} />
        </div>
    );
};

export default SharedPost; 