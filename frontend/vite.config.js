import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		port: 3000,
		host: true,
		strictPort: true,
		cors: {
			origin: '*'
		},
		hmr: {
			clientPort: 443,
			host: '0.0.0.0'
		},
		proxy: {
			"/api": {
				target: process.env.VITE_API_URL || "http://localhost:5000",
				changeOrigin: true,
				secure: false,
				ws: true,
				configure: (proxy, _options) => {
					proxy.on('error', (err, _req, _res) => {
						console.error('Proxy error:', err);
					});
					proxy.on('proxyReq', (proxyReq, req, _res) => {
						if (req.method !== 'GET' && 
							!req.url.includes('/view') && 
							!req.url.includes('/quotes') &&
							!req.url.includes('/comments')) {
							console.log('Sending Request:', req.method, req.url);
						}
					});
					proxy.on('proxyRes', (proxyRes, req, _res) => {
						if (proxyRes.statusCode === 404) {
							console.error('Not Found:', req.method, req.url);
							return;
						}
						if ((proxyRes.statusCode !== 200 || req.method !== 'GET') && 
							!req.url.includes('/view') && 
							!req.url.includes('/quotes') &&
							!req.url.includes('/comments')) {
							console.log('Response:', proxyRes.statusCode, req.method, req.url);
						}
					});
				},
			},
			"/googleads": {
				target: "https://googleads.g.doubleclick.net",
				changeOrigin: true,
				secure: true,
				rewrite: (path) => path.replace(/^\/googleads/, ''),
				configure: (proxy, _options) => {
					proxy.on('proxyRes', (proxyRes, req, _res) => {
						proxyRes.headers['Access-Control-Allow-Origin'] = '*';
						proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
						proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
					});
				}
			},
			"/socket.io": {
				target: process.env.VITE_API_URL || "http://localhost:5000",
				changeOrigin: true,
				secure: false,
				ws: true,
				configure: (proxy, _options) => {
					proxy.on('error', (err, _req, _res) => {
						console.error('WebSocket proxy error:', err);
					});
					proxy.on('upgrade', (req, socket, head) => {
						console.log('WebSocket upgrade request:', req.url);
					});
				}
			},
			"/i.4cdn.org": {
				target: "https://i.4cdn.org",
				changeOrigin: true,
				secure: true,
				rewrite: (path) => path.replace(/^\/i.4cdn.org/, ''),
				configure: (proxy, _options) => {
					proxy.on('proxyRes', (proxyRes, req, _res) => {
						proxyRes.headers['Access-Control-Allow-Origin'] = '*';
						proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
						proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
						proxyRes.headers['Cross-Origin-Resource-Policy'] = 'cross-origin';
					});
				}
			},
			"/cdn": {
				target: "https://i.4cdn.org",
				changeOrigin: true,
				secure: true,
				rewrite: (path) => path.replace(/^\/cdn/, ''),
				configure: (proxy, _options) => {
					proxy.on('proxyRes', (proxyRes, req, _res) => {
						proxyRes.headers['Access-Control-Allow-Origin'] = '*';
						proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
						proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
						proxyRes.headers['Cross-Origin-Resource-Policy'] = 'cross-origin';
					});
				}
			}
		},
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
			'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization, Cookie',
			'Access-Control-Allow-Credentials': 'true'
		},
		hmr: {
			overlay: true,
			clientPort: 3000
		},
		fs: {
			strict: true,
			allow: ['..']
		}
	},
	build: {
		sourcemap: true,
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ['react', 'react-dom', 'react-router-dom'],
					ui: ['@headlessui/react', '@heroicons/react'],
				},
				format: 'es',
				generatedCode: {
					preset: 'es2015',
					arrowFunctions: true,
					constBindings: true,
					objectShorthand: true,
					reservedNamesAsProps: false
				}
			}
		},
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: false,
				drop_debugger: true,
				pure_funcs: ['console.debug']
			},
			format: {
				comments: false
			}
		}
	},
	optimizeDeps: {
		include: ['react', 'react-dom', 'react-router-dom', '@headlessui/react', '@heroicons/react']
	},
	resolve: {
		extensions: ['.js', '.jsx', '.json'],
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@components': path.resolve(__dirname, './src/components'),
			'@pages': path.resolve(__dirname, './src/pages'),
			'@utils': path.resolve(__dirname, './src/utils'),
			'@hooks': path.resolve(__dirname, './src/hooks'),
			'@context': path.resolve(__dirname, './src/context'),
			'@assets': path.resolve(__dirname, './src/assets'),
		}
	},
	css: {
		devSourcemap: true,
	}
});
