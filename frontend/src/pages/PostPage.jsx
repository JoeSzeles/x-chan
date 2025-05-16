import { useParams } from "react-router-dom";
import ThreadView from "../components/common/ThreadView";

const PostPage = () => {
	const { postId, commentId } = useParams();

    return (
		<div className="max-w-3xl mx-auto p-4 w-full">
			<ThreadView postId={postId} commentId={commentId} />
        </div>
    );
};

export default PostPage; 