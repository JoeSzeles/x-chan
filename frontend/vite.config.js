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
      'Content-Security-Policy': "default-src 'self' https://*.replit.dev https://*.worf.replit.dev https://*.launchdarkly.com https://*.stripe.network; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.launchdarkly.com https://*.stripe.network https://*.replit.dev https://replit.com https://*.worf.replit.dev https://events.launchdarkly.com https://beacon.replit.com https://clientstream.launchdarkly.com https://m.stripe.network; style-src 'self' 'unsafe-inline' data: blob:; img-src 'self' data: blob: https: https://*.cloudinary.com https://i.ytimg.com; font-src 'self' data:; connect-src 'self' https://*.replit.dev wss://*.replit.dev wss://*.worf.replit.dev https://*.launchdarkly.com https://*.stripe.network https://events.launchdarkly.com https://*.cloudinary.com ws://0.0.0.0:* wss://0.0.0.0:* https://clientstream.launchdarkly.com https://m.stripe.network; frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://*.stripe.network",
      'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    },
    proxy: {
      '/api': {
        target: 'http://0.0.0.0:5000',
        changeOrigin: true,
        secure: false
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