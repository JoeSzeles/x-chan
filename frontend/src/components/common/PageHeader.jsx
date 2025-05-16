import { FaSync } from "react-icons/fa";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

const PageHeader = ({ title, children }) => {
	const queryClient = useQueryClient();

	const handleReload = () => {
		// Invalidate all queries to refresh the page content
		queryClient.invalidateQueries();
		toast.success("Content refreshed");
	};

	return (
		<div className='flex w-full border-b border-gray-700'>
			<div className='flex-1 p-3'>
				{title && <h1 className='text-xl font-bold'>{title}</h1>}
				{children}
			</div>
			<button
				onClick={handleReload}
				className='p-3 hover:bg-secondary transition duration-300 cursor-pointer'
				title="Refresh content"
			>
				<FaSync className='w-4 h-4' />
			</button>
		</div>
	);
};

export default PageHeader; 