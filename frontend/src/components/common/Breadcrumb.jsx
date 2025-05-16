import { Link } from 'react-router-dom';
import { FaChevronRight, FaHome } from 'react-icons/fa';

const Breadcrumb = ({ items }) => {
    return (
        <div className="px-4 py-2 border-b border-gray-700 bg-[#1a1a1a]">
            <nav className="flex items-center space-x-2 text-sm">
                <Link to="/" className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                    <FaHome className="w-3 h-3" />
                    <span>Home</span>
                </Link>
                {items.map((item, index) => (
                    <div key={index} className="flex items-center">
                        <FaChevronRight className="w-3 h-3 text-gray-600" />
                        {item.link ? (
                            <Link to={item.link} className="ml-2 text-blue-400 hover:text-blue-300 transition-colors">
                                {item.label}
                            </Link>
                        ) : (
                            <span className="ml-2 text-blue-400 font-medium">{item.label}</span>
                        )}
                    </div>
                ))}
            </nav>
        </div>
    );
};

export default Breadcrumb; 