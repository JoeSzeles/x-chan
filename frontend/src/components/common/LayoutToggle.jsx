import { FaExpand, FaCompress } from 'react-icons/fa';

const LayoutToggle = ({ isWideMode, onToggle }) => {
    return (
        <button
            onClick={onToggle}
            className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors text-white"
            title={isWideMode ? "Switch to normal view" : "Switch to wide view"}
        >
            {isWideMode ? <FaCompress className="w-4 h-4" /> : <FaExpand className="w-4 h-4" />}
        </button>
    );
};

export default LayoutToggle; 