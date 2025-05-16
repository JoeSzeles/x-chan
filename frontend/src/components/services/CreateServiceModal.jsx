import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaTimes, FaImage, FaMapMarkerAlt, FaTag } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const CreateServiceModal = ({ onClose }) => {
    const [formData, setFormData] = useState({
        category: 'job-offers',
        title: '',
        content: '',
        images: [],
        price: '',
        location: '',
        contactInfo: {
            email: '',
            phone: '',
            website: ''
        },
        tags: []
    });
    const [tagInput, setTagInput] = useState('');
    const queryClient = useQueryClient();

    const categories = [
        { id: 'job-offers', name: 'Job Offers' },
        { id: 'job-seekers', name: 'Job Seekers' },
        { id: 'business', name: 'Business' },
        { id: 'other', name: 'Other' }
    ];

    // Create service mutation
    const createServiceMutation = useMutation({
        mutationFn: async (serviceData) => {
            const res = await fetch('/api/services', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(serviceData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create service');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['services']);
            toast.success('Service created successfully!');
            onClose();
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        createServiceMutation.mutate(formData);
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        // Here you would typically upload the images to your storage service
        // and get back the URLs. For now, we'll just use the file names
        const imageUrls = files.map(file => URL.createObjectURL(file));
        setFormData(prev => ({
            ...prev,
            images: [...prev.images, ...imageUrls]
        }));
    };

    const handleAddTag = (e) => {
        e.preventDefault();
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, tagInput.trim()]
            }));
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#1e1e1e] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">Create Service</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <FaTimes className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Category
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Title
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        {/* Content */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Description
                            </label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                                required
                            />
                        </div>

                        {/* Images */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Images
                            </label>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                                    <FaImage className="w-4 h-4" />
                                    <span>Upload Images</span>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            {formData.images.length > 0 && (
                                <div className="grid grid-cols-3 gap-4 mt-4">
                                    {formData.images.map((image, index) => (
                                        <div key={index} className="relative">
                                            <img
                                                src={image}
                                                alt={`Upload ${index + 1}`}
                                                className="w-full h-24 object-cover rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    images: prev.images.filter((_, i) => i !== index)
                                                }))}
                                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                                            >
                                                <FaTimes className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Price and Location */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Price
                                </label>
                                <input
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Optional"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Location
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                        className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Optional"
                                    />
                                    <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-400">Contact Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.contactInfo.email}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            contactInfo: { ...prev.contactInfo, email: e.target.value }
                                        }))}
                                        className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Optional"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.contactInfo.phone}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            contactInfo: { ...prev.contactInfo, phone: e.target.value }
                                        }))}
                                        className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Optional"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Website
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.contactInfo.website}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            contactInfo: { ...prev.contactInfo, website: e.target.value }
                                        }))}
                                        className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Tags
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Add tags..."
                                />
                                <button
                                    type="button"
                                    onClick={handleAddTag}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                            {formData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-300 rounded-full text-sm"
                                        >
                                            <FaTag className="w-3 h-3" />
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(tag)}
                                                className="ml-1 hover:text-red-500 transition-colors"
                                            >
                                                <FaTimes className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                                disabled={createServiceMutation.isLoading}
                            >
                                {createServiceMutation.isLoading ? 'Creating...' : 'Create Service'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateServiceModal; 