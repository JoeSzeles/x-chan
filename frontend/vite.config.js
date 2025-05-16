import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from 'path';

export default defineConfig({
	plugins: [react()],
	server: {
		port: 3000,
		host: '0.0.0.0',
		hmr: {
			host: 'localhost',
			protocol: 'ws',
		},
		cors: true,
		allowedHosts: ['*.replit.dev'],
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Content-Security-Policy': "default-src * 'self' data: 'unsafe-inline' 'unsafe-eval' blob:; script-src * 'self' 'unsafe-inline' 'unsafe-eval' blob: data:; style-src * 'self' 'unsafe-inline'; img-src * 'self' data: blob:; font-src * 'self' data:; connect-src *;",
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