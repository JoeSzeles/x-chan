import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react'
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr: {
      clientPort: 443,
      host: 'fff6347a-2f7a-4a30-9c37-f671081f70f3-00-3n4jkaon19ywr.worf.replit.dev'
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Security-Policy': "default-src 'self' https://*.replit.dev https://*.worf.replit.dev https://*.launchdarkly.com https://*.stripe.network https://www.youtube.com https://youtube.com https://i.ytimg.com https://img.youtube.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.launchdarkly.com https://*.stripe.network https://*.replit.dev https://replit.com https://*.worf.replit.dev https://events.launchdarkly.com https://beacon.replit.com https://clientstream.launchdarkly.com https://m.stripe.network https://www.youtube.com; style-src 'self' 'unsafe-inline' data: blob:; img-src 'self' data: blob: https: https://*.cloudinary.com https://i.ytimg.com https://img.youtube.com https://i.ytimg.com/vi/ https://*.ytimg.com https://youtube.com https://i.ytimg.com/vi https://i.ytimg.com/vi_webp https://yt3.ggpht.com https://yt3.googleusercontent.com; font-src 'self' data:; connect-src 'self' http://* https://* ws://localhost:* wss://localhost:* http://localhost:* https://localhost:* https://*.replit.dev wss://*.replit.dev https://*.replit.dev:* wss://*.replit.dev:* https://*.worf.replit.dev:* wss://*.worf.replit.dev:* https://*.launchdarkly.com https://*.stripe.network https://events.launchdarkly.com https://*.cloudinary.com ws://0.0.0.0:* wss://0.0.0.0:* http://0.0.0.0:* https://0.0.0.0:* https://clientstream.launchdarkly.com https://m.stripe.network https://www.youtube.com; frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://*.stripe.network https://youtu.be",
      'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    },
    proxy: {
      '/api': {
        target: 'http://0.0.0.0:5000',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://0.0.0.0:5000',
        ws: true,
        changeOrigin: true,
        secure: false,
        rewrite: path => path,
        configure: (proxy, options) => {
          // Log all proxy requests for debugging
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const origin = req.headers.origin || 'http://0.0.0.0:3000';
            proxyReq.setHeader('Origin', origin);
            
            // Add additional debugging
            console.log('Proxying Socket.IO request:', {
              method: req.method,
              url: req.url,
              headers: {
                origin: req.headers.origin,
                host: req.headers.host,
                referer: req.headers.referer
              }
            });
          });
          
          // Ensure CORS headers are properly set
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Get the origin from the request or use a wildcard
            const origin = req.headers.origin || '*';
            
            proxyRes.headers['Access-Control-Allow-Origin'] = origin;
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, PATCH, DELETE';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
            proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
            
            // Log response headers for debugging
            console.log('Socket.IO proxy response headers:', proxyRes.headers);
          });
          
          // Better error handling
          proxy.on('error', (err, req, res) => {
            console.error('Socket.IO proxy error:', {
              error: err.message,
              stack: err.stack,
              url: req?.url,
              method: req?.method,
              headers: req?.headers
            });
            
            // Try to send a response if possible
            if (!res.headersSent && res.writeHead) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
            }
          });
        }
      }
    }
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
      '@assets': path.resolve(__dirname, './src/assets')
    }
  }
});