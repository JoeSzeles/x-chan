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
      'Content-Security-Policy': "default-src 'self' https://*.replit.dev https://*.worf.replit.dev https://*.launchdarkly.com https://*.stripe.network https://www.youtube.com https://youtube.com https://i.ytimg.com https://img.youtube.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.launchdarkly.com https://*.stripe.network https://*.replit.dev https://replit.com https://*.worf.replit.dev https://events.launchdarkly.com https://beacon.replit.com https://clientstream.launchdarkly.com https://m.stripe.network https://www.youtube.com; style-src 'self' 'unsafe-inline' data: blob:; img-src 'self' data: blob: https: https://*.cloudinary.com https://i.ytimg.com https://img.youtube.com https://i.ytimg.com/vi/ https://*.ytimg.com https://youtube.com https://i.ytimg.com/vi https://i.ytimg.com/vi_webp https://yt3.ggpht.com https://yt3.googleusercontent.com; font-src 'self' data:; connect-src 'self' http://* https://* ws://* wss://* http://localhost:* https://localhost:* https://*.replit.dev wss://*.replit.dev https://*.replit.dev:* wss://*.replit.dev:* https://*.worf.replit.dev:* wss://*.worf.replit.dev:* https://*.launchdarkly.com https://*.stripe.network https://events.launchdarkly.com https://*.cloudinary.com ws://0.0.0.0:* wss://0.0.0.0:* http://0.0.0.0:* https://0.0.0.0:* https://clientstream.launchdarkly.com https://m.stripe.network https://www.youtube.com; frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://*.stripe.network https://youtu.be",
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
          // Set longer timeout and buffers
          proxy.setTimeout(60000);
          proxy.options.buffer = {
            maxRequestBodySize: '10mb'  
          };
          
          // Improve debugging
          console.log('Socket.IO proxy configured with target:', 'http://0.0.0.0:5000');
          
          // Increase timeout for socket.io connections
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Origin', 'http://0.0.0.0:3000');
            proxyReq.setHeader('X-Debug-Socket-Proxy', 'true');
            console.log('Proxying Socket.IO request:', req.method, req.url);
          });
          
          // Enhance CORS headers
          proxy.on('proxyRes', (proxyRes, req, res) => {
            proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, PATCH, DELETE';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
            proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
            proxyRes.headers['Access-Control-Max-Age'] = '86400'; // 24 hours
          });
          
          // Improve error handling
          proxy.on('error', (err, req, res) => {
            console.error('Socket.IO proxy error:', err);
            if (!res.headersSent && res.writeHead) {
              try {
                res.writeHead(500, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ error: 'Socket proxy error', details: err.message }));
              } catch (writeError) {
                console.error('Failed to write error response:', writeError);
              }
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