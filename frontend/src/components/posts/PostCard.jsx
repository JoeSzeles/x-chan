import { FaRegComment, FaRegHeart, FaHeart } from 'react-icons/fa';
import { BiRepost } from 'react-icons/bi';
import RepostButton from '../common/RepostButton';

                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={() => handleCommentClick(post._id)}
                                className="flex items-center space-x-1 hover:text-blue-500"
                            >
                                <FaRegComment />
                                <span>{post.comments?.length || 0}</span>
                            </button>
                            <button 
                                onClick={() => handleLikeClick(post._id)}
                                className="flex items-center space-x-1 hover:text-red-500"
                            >
                                {post.likes?.includes(userData?._id) ? (
                                    <FaHeart className="text-red-500" />
                                ) : (
                                    <FaRegHeart />
                                )}
                                <span>{post.likes?.length || 0}</span>
                            </button>
                            <RepostButton 
                                itemId={post._id}
                                type="post"
                                repostCount={post.reposts?.length || 0}
                                isReposted={post.reposts?.includes(userData?._id)}
                                onRepost={() => {
                                    // Refresh post data after repost
                                    queryClient.invalidateQueries(['post', post._id]);
                                }}
                            />
                        </div>
                    </div> 