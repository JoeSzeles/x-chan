import { Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from './components/ThemeProvider';
import { ThemeToggle } from './components/ThemeToggle';
import { useState, useEffect, useRef } from 'react';
import { FaExpand, FaCompress } from 'react-icons/fa';

import HomePage from "./pages/home/HomePage";
import LoginPage from "./pages/auth/login/LoginPage";
import SignUpPage from "./pages/auth/signup/SignUpPage";
import NotificationPage from "./pages/notification/NotificationPage";
import ProfilePage from "./pages/profile/ProfilePage";
import SettingsPage from "./pages/settings/SettingsPage";
import SharedPost from "./pages/SharedPost";
import PostPage from "./pages/PostPage";

  // Force scroll redraw when app loads
  useEffect(() => {
    const fixScrollbars = () => {
      const scrollElements = document.querySelectorAll('.right-panel-scrollable, .main-content-scrollable');
      scrollElements.forEach(el => {
        el.style.overflowY = 'hidden';
        setTimeout(() => {
          el.style.overflowY = 'scroll';
        }, 10);
      });
    };

    window.addEventListener('load', fixScrollbars);
    // Run it once after component mounts
    setTimeout(fixScrollbars, 1000);

    // Also periodically check and fix scrollbars
    const interval = setInterval(fixScrollbars, 5000);

    return () => {
      window.removeEventListener('load', fixScrollbars);
      clearInterval(interval);
    };
  }, []);


import ThreadView from "./components/common/ThreadView";
import NewsPage from "./pages/news/NewsPage";
import BookmarksPage from "./pages/BookmarksPage";
import BoardsPage from './pages/BoardsPage';
import BoardDetailPage from './pages/BoardDetailPage';
import ThreadPage from './pages/ThreadPage';
import ListsPage from './pages/ListsPage';
import Messages from './pages/Messages';
import ServicesPage from './pages/ServicesPage';
import YouTubeTestPage from './pages/YouTubeTestPage';

import Sidebar from "./components/common/Sidebar";
import RightPanel from "./components/common/RightPanel";

import { Toaster } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "./components/common/LoadingSpinner";
import LogoDebugger from './components/common/LogoDebugger';

function App() {
	const { data: authUser } = useQuery({
		queryKey: ["authUser"],
		queryFn: async () => {
			try {
				const res = await fetch("/api/auth/me", {
					credentials: 'include',
					headers: {
						"Authorization": `Bearer ${localStorage.getItem("token")}`,
					},
				});
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				console.error("Error fetching user:", error);
				return null;
			}
		},
		retry: false,
	});

	const [isWideMode, setIsWideMode] = useState(false);
	const scrollFixInterval = useRef(null);

	// Super aggressive scroll fix that runs periodically
	useEffect(() => {
		// Helper to force scrollbars to be visible
		const forceScrollbars = () => {
			document.documentElement.style.overflowY = 'scroll';
			document.body.style.overflowY = 'scroll';

			const scrollableElements = document.querySelectorAll('.right-panel-scrollable, .right-panel-content, .main-content');
			scrollableElements.forEach(el => {
				if (el) {
					el.style.overflowY = 'scroll';
					el.style.scrollbarWidth = 'thin';
				}
			});
		};

		// Run immediately
		forceScrollbars();

		// Run on window resize
		window.addEventListener('resize', forceScrollbars);

		// Run periodically to ensure scrollbars stay visible
		scrollFixInterval.current = setInterval(forceScrollbars, 2000);

		return () => {
			window.removeEventListener('resize', forceScrollbars);
			if (scrollFixInterval.current) {
				clearInterval(scrollFixInterval.current);
			}
		};
	}, []);

	useEffect(() => {
		if (authUser?.settings?.appearance?.wideMode !== undefined) {
			setIsWideMode(authUser.settings.appearance.wideMode);
		}
	}, [authUser?.settings?.appearance?.wideMode]);

	if (authUser === undefined) {
		return (
			<div className='h-screen flex justify-center items-center'>
				<LoadingSpinner size='lg' />
			</div>
		);
	}

	return (
		<ThemeProvider>
			<div className="min-h-screen bg-background-main text-text-primary font-primary overflow-hidden">
				<div className={`flex ${isWideMode ? 'justify-between' : 'max-w-6xl mx-auto'} relative`}>
					{/* Common component, bc it's not wrapped with Routes */}
					{authUser && <Sidebar isWideMode={isWideMode} />}
					<Routes>
						<Route path='/' element={authUser ? <HomePage isWideMode={isWideMode} /> : <Navigate to='/login' />} />
						<Route path='/login' element={!authUser ? <LoginPage /> : <Navigate to='/' />} />
						<Route path='/signup' element={!authUser ? <SignUpPage /> : <Navigate to='/' />} />
						<Route path='/notifications' element={authUser ? <NotificationPage isWideMode={isWideMode} /> : <Navigate to='/login' />} />
						<Route path='/profile/:username' element={authUser ? <ProfilePage isWideMode={isWideMode} /> : <Navigate to='/login' />} />
						<Route path='/settings' element={authUser ? <SettingsPage isWideMode={isWideMode} /> : <Navigate to='/login' />} />
						<Route path='/news' element={authUser ? <NewsPage isWideMode={isWideMode} /> : <Navigate to='/login' />} />
						<Route path='/bookmarks' element={authUser ? <BookmarksPage isWideMode={isWideMode} /> : <Navigate to='/login' />} />
						<Route path='/lists' element={authUser ? <ListsPage isWideMode={isWideMode} /> : <Navigate to='/login' />} />
						<Route path='/messages' element={authUser ? <Messages /> : <Navigate to='/login' />} />
						<Route path='/post/:postId' element={<PostPage isWideMode={isWideMode} />} />
						<Route path='/post/:postId/comment/:commentId' element={<ThreadView isWideMode={isWideMode} />} />
						<Route path='/shared/:postId' element={<SharedPost isWideMode={isWideMode} />} />
						<Route path='/boards' element={authUser ? <BoardsPage isWideMode={isWideMode} /> : <Navigate to='/login' />} />
						<Route path='/boards/:boardName' element={authUser ? <BoardDetailPage isWideMode={isWideMode} /> : <Navigate to='/login' />} />
						<Route path="/thread/:board/:threadId" element={<ThreadPage />} />
						<Route path="/services" element={<ServicesPage />} />
						<Route path="/youtube-test" element={<YouTubeTestPage />} />
					</Routes>
					{authUser && <RightPanel isWideMode={isWideMode} />}
					<Toaster />
				</div>
				{authUser && (
					<>
						<ThemeToggle />
						<button
							onClick={() => setIsWideMode(!isWideMode)}
							className="fixed bottom-4 right-20 p-2 rounded-full bg-primary text-text-light hover:bg-primary-dark transition-colors"
							title={isWideMode ? "Switch to normal view" : "Switch to wide view"}
						>
							{isWideMode ? <FaCompress className="w-6 h-6" /> : <FaExpand className="w-6 h-6" />}
						</button>
					</>
				)}
			</div>
		</ThemeProvider>
	);
}

export default App;