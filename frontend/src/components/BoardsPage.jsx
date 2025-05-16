import React, { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { LoadingSpinner } from "../LoadingSpinner";

const BoardsPage = () => {
    const { data: boards, isLoading } = useQuery({
        queryKey: ["boards"],
        queryFn: async () => {
            const res = await fetch("/api/boards");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },
    });

    const { data: authUser } = useQuery({ queryKey: ["authUser"] });
    const queryClient = useQueryClient();

    // Memoize the board follower checks
    const boardFollowStatus = useMemo(() => {
        if (!boards || !authUser) return new Map();
        
        return new Map(
            boards.map(board => [
                board._id,
                board.followers?.includes(authUser._id) || false
            ])
        );
    }, [boards, authUser]);

    // Memoize the follow/unfollow mutation
    const { mutate: toggleFollow } = useMutation({
        mutationFn: async (boardId) => {
            const res = await fetch(`/api/boards/${boardId}/follow`, {
                method: "POST",
                credentials: "include",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },
        onSuccess: (data, boardId) => {
            queryClient.setQueryData(["boards"], (oldData) => {
                if (!oldData) return oldData;
                return oldData.map((board) => {
                    if (board._id === boardId) {
                        return {
                            ...board,
                            followers: data.followers,
                        };
                    }
                    return board;
                });
            });
        },
    });

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Boards</h1>
            {isLoading ? (
                <div className="flex justify-center">
                    <LoadingSpinner />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {boards?.map((board) => (
                        <div key={board._id} className="bg-[#1e1e1e] rounded-lg p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold">{board.name}</h2>
                                <button
                                    onClick={() => toggleFollow(board._id)}
                                    className={`px-4 py-2 rounded ${
                                        boardFollowStatus.get(board._id)
                                            ? "bg-red-500 hover:bg-red-600"
                                            : "bg-blue-500 hover:bg-blue-600"
                                    }`}
                                >
                                    {boardFollowStatus.get(board._id) ? "Unfollow" : "Follow"}
                                </button>
                            </div>
                            <p className="text-gray-400 mb-4">{board.description}</p>
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>{board.followers?.length || 0} followers</span>
                                <span>{board.posts?.length || 0} posts</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BoardsPage; 