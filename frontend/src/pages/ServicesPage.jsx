import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaPlus, FaSearch, FaFilter, FaSort } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageHeader from '../components/common/PageHeader';
import ServiceCard from '../components/services/ServiceCard';
import CreateServiceModal from '../components/services/CreateServiceModal';
import { useAuthUser } from '../hooks/useAuthUser';
import Breadcrumb from '../components/common/Breadcrumb';

const ServicesPage = () => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const { authUser } = useAuthUser();

    const categories = [
        { id: 'all', name: 'All Services' },
        { id: 'job-offers', name: 'Job Offers' },
        { id: 'job-seekers', name: 'Job Seekers' },
        { id: 'business', name: 'Business' },
        { id: 'other', name: 'Other' }
    ];

    const sortOptions = [
        { id: 'newest', name: 'Newest First' },
        { id: 'oldest', name: 'Oldest First' },
        { id: 'popular', name: 'Most Popular' }
    ];

    // Fetch services with filters
    const { data: services, isLoading } = useQuery({
        queryKey: ['services', selectedCategory, searchQuery, sortBy],
        queryFn: async () => {
            const queryParams = new URLSearchParams({
                category: selectedCategory,
                search: searchQuery,
                sort: sortBy
            });

            const res = await fetch(`/api/services?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch services');
            return data;
        }
    });

    return (
        <div className="flex-[4_4_0] border-r border-gray-700 min-h-screen">
            {/* Breadcrumb Navigation */}
            <Breadcrumb 
                items={[
                    { label: 'Services' }
                ]}
            />

            <PageHeader>
                <div className="flex items-center justify-between w-full">
                    <h1 className="text-2xl font-bold">Services</h1>
                    {authUser && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors"
                        >
                            <FaPlus className="w-4 h-4" />
                            <span>Post Service</span>
                        </button>
                    )}
                </div>
            </PageHeader>

            {/* Filters and Search */}
            <div className="p-4 border-b border-gray-700">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search services..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div className="flex items-center gap-2">
                        <FaFilter className="text-gray-400" />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {categories.map(category => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <FaSort className="text-gray-400" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {sortOptions.map(option => (
                                <option key={option.id} value={option.id}>
                                    {option.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Services Grid */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <LoadingSpinner />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {services?.map(service => (
                        <ServiceCard key={service._id} service={service} />
                    ))}
                    {services?.length === 0 && (
                        <div className="col-span-full text-center py-8 text-gray-500">
                            No services found
                        </div>
                    )}
                </div>
            )}

            {/* Create Service Modal */}
            {showCreateModal && (
                <CreateServiceModal
                    onClose={() => setShowCreateModal(false)}
                />
            )}
        </div>
    );
};

export default ServicesPage; 