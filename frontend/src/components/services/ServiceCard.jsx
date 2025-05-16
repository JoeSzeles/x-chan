import React from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaComment, FaEye, FaMapMarkerAlt, FaTag } from 'react-icons/fa';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useAuthUser } from '../../hooks/useAuthUser';

const ServiceCard = ({ service }) => {
    const { authUser } = useAuthUser();
    const queryClient = useQueryClient();

    // Like/Unlike mutation
    const likeMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/services/${service._id}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to like service');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['services']);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const isLiked = authUser && service.likes.includes(authUser._id);

    const handleLike = () => {
        if (!authUser) {
            toast.error('Please login to like services');
            return;
        }
        likeMutation.mutate();
    };

    return (
        <div className="bg-[#1e1e1e] rounded-lg overflow-hidden hover:bg-[#2a2a2a] transition-colors">
            {/* Service Image */}
            {service.images && service.images.length > 0 && (
                <div className="relative h-48">
                    <img
                        src={service.images[0]}
                        alt={service.title}
                        className="w-full h-full object-cover"
                    />
                </div>
            )}

            {/* Service Content */}
            <div className="p-4">
                {/* Category Badge */}
                <div className="mb-2">
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-500 text-white rounded-full">
                        {service.category}
                    </span>
                </div>

                {/* Title */}
                <Link to={`/services/${service._id}`} className="block">
                    <h3 className="text-lg font-semibold mb-2 hover:text-blue-400 transition-colors">
                        {service.title}
                    </h3>
                </Link>

                {/* Content Preview */}
                <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {service.content}
                </p>

                {/* Location and Price */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    {service.location && (
                        <div className="flex items-center gap-1">
                            <FaMapMarkerAlt className="w-4 h-4" />
                            <span>{service.location}</span>
                        </div>
                    )}
                    {service.price && (
                        <div className="font-semibold text-green-500">
                            ${service.price}
                        </div>
                    )}
                </div>

                {/* Tags */}
                {service.tags && service.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {service.tags.map((tag, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full"
                            >
                                <FaTag className="w-3 h-3" />
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Stats and Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleLike}
                            className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                            {isLiked ? (
                                <FaHeart className="w-4 h-4 text-red-500" />
                            ) : (
                                <FaRegHeart className="w-4 h-4" />
                            )}
                            <span>{service.likes.length}</span>
                        </button>
                        <div className="flex items-center gap-1 text-gray-400">
                            <FaComment className="w-4 h-4" />
                            <span>{service.comments.length}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                            <FaEye className="w-4 h-4" />
                            <span>{service.views}</span>
                        </div>
                    </div>

                    {/* Creator Info */}
                    <Link
                        to={`/profile/${service.creator.username}`}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <img
                            src={service.creator.profilePicture || '/default-avatar.png'}
                            alt={service.creator.username}
                            className="w-6 h-6 rounded-full"
                        />
                        <span className="text-sm text-gray-400">
                            {service.creator.username}
                        </span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ServiceCard; 