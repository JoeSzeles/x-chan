import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Add global error handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Add axios interceptor for handling common errors
import axios from 'axios';
axios.interceptors.response.use(
  response => response,
  error => {
    // Handle 502 errors (potentially caused by server restarts)
    if (error.response && error.response.status === 502) {
      console.error('Server unavailable (502):', error);
    }
    
    // Handle JSON parsing errors
    if (error.message && error.message.includes('JSON')) {
      console.error('JSON parsing error:', error);
    }
    
    return Promise.reject(error);
  }
);

// Configure query client with better error handling
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: (failureCount, error) => {
				// Don't retry auth failures
				if (error?.response?.status === 401 || error?.response?.status === 403) {
					return false;
				}
				// Retry 502/500 errors up to 3 times with exponential backoff
				if (error?.response?.status === 502 || error?.response?.status === 500) {
					return failureCount < 3;
				}
				// Default retry behavior
				return failureCount < 2;
			},
			staleTime: 5 * 60 * 1000, // 5 minutes
			onError: (error) => {
				console.error('Query error:', error);
			}
		},
		mutations: {
			retry: (failureCount, error) => {
				// Only retry network errors, not validation errors
				if (error?.response?.status >= 400 && error?.response?.status < 500) {
					return false;
				}
				return failureCount < 2;
			},
			onError: (error) => {
				console.error('Mutation error:', error);
			}
		},
	},
});

ReactDOM.createRoot(document.getElementById("root")).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</QueryClientProvider>
	</React.StrictMode>
);
