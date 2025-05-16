import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import { FaCog, FaChartLine, FaRobot, FaTools } from 'react-icons/fa';

const ServicesList = ({ viewMode }) => {
    const { data: services, isLoading } = useQuery({
        queryKey: ['services'],
        queryFn: async () => {
            const res = await fetch('/api/services');
            if (!res.ok) throw new Error('Failed to fetch services');
            return res.json();
        }
    });

    const getServiceIcon = (type) => {
        switch (type) {
            case 'bot':
                return <FaRobot className="w-6 h-6" />;
            case 'analytics':
                return <FaChartLine className="w-6 h-6" />;
            case 'automation':
                return <FaTools className="w-6 h-6" />;
            default:
                return <FaCog className="w-6 h-6" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!services || services.length === 0) {
        return (
            <div className="text-center text-gray-500 py-8">
                No services available
            </div>
        );
    }

    return (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-4"}>
            {services.map((service) => (
                <Link
                    key={service._id}
                    to={`/services/${service._id}`}
                    className={`bg-[#1e1e1e] rounded-lg overflow-hidden hover:bg-[#2a2a2a] transition-colors ${
                        viewMode === "grid" ? "h-[180px]" : ""
                    }`}
                >
                    <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                {getServiceIcon(service.type)}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">{service.name}</h3>
                                <p className="text-sm text-gray-400">{service.description}</p>
                            </div>
                        </div>
                        
                        <div className="flex gap-4 text-sm text-gray-500">
                            <span className="px-2 py-1 bg-gray-800 rounded-full text-xs">
                                {service.type}
                            </span>
                            <span className="px-2 py-1 bg-gray-800 rounded-full text-xs">
                                {service.status}
                            </span>
                        </div>

                        {viewMode === "list" && (
                            <div className="mt-3 pt-3 border-t border-gray-700">
                                <p className="text-sm text-gray-400">
                                    Last updated: {new Date(service.lastUpdated).toLocaleDateString()}
                                </p>
                            </div>
                        )}
                    </div>
                </Link>
            ))}
        </div>
    );
};

export default ServicesList; 