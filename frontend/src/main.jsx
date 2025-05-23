import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./components/common/ErrorBoundary";

// Ensure React is globally available for debugging and compatibility
window.React = React;

// Handle SES and JSON parsing errors
import { setupGlobalErrorHandlers } from './utils/cleanupUtils';
setupGlobalErrorHandlers();

// Configure React Query with better error handling
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: (failureCount, error) => {
				// Don't retry on 401/403 auth errors
				if (error?.response?.status === 401 || error?.response?.status === 403) {
					return false;
				}
				// Retry other errors up to 3 times
				return failureCount < 3;
			},
			onError: (error) => {
				console.error("Query error:", error);
			}
		},
	},
});

ReactDOM.createRoot(document.getElementById("root")).render(
	<React.StrictMode>
		<ErrorBoundary>
			<QueryClientProvider client={queryClient}>
				<BrowserRouter>
					<App />
					<Toaster position="top-center" />
				</BrowserRouter>
			</QueryClientProvider>
		</ErrorBoundary>
	</React.StrictMode>
);