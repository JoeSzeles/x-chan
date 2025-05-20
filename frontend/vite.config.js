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
    proxy: {
      '/api': {
        target: 'http://0.0.0.0:5000',
        changeOrigin: true,
        secure: false
      }
    },
    hmr: {
      host: '0.0.0.0',
      port: 3000,
      protocol: 'wss'
    },
    cors: true,
    allowedHosts: ['*.replit.dev', '*.worf.replit.dev', 'fff6347a-2f7a-4a30-9c37-f671081f70f3-00-3n4jkaon19ywr.worf.replit.dev'],
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Security-Policy': "default-src 'self' https://*.replit.dev https://*.worf.replit.dev; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.launchdarkly.com https://*.stripe.network https://*.replit.dev https://replit.com https://*.worf.replit.dev https://events.launchdarkly.com https://beacon.replit.com; style-src 'self' 'unsafe-inline' data: blob:; img-src 'self' data: blob: https: https://*.cloudinary.com; font-src 'self' data:; connect-src 'self' https://*.replit.dev wss://*.replit.dev wss://*.worf.replit.dev https://*.launchdarkly.com https://*.stripe.network https://events.launchdarkly.com https://*.cloudinary.com ws://* wss://* https://replit.com https://beacon.replit.com; frame-src 'self' https://www.youtube.com https://youtube.com",
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
      '@assets': path.resolve(__dirname, './src/assets')
    }
  },
  css: {
    devSourcemap: true,
  }
});