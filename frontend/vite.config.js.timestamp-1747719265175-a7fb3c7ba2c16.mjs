// vite.config.js
import { defineConfig } from "file:///home/runner/workspace/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///home/runner/workspace/frontend/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "/home/runner/workspace/frontend";
var vite_config_default = defineConfig({
  plugins: [
    react({
      jsxRuntime: "automatic",
      jsxImportSource: "react"
    })
  ],
  server: {
    host: "0.0.0.0",
    port: 3e3,
    hmr: {
      clientPort: 443,
      host: "fff6347a-2f7a-4a30-9c37-f671081f70f3-00-3n4jkaon19ywr.worf.replit.dev"
    },
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Security-Policy": "default-src 'self' https://*.replit.dev https://*.worf.replit.dev https://www.youtube.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.launchdarkly.com https://*.stripe.network https://*.replit.dev https://replit.com https://*.worf.replit.dev https://events.launchdarkly.com https://beacon.replit.com https://www.youtube.com; style-src 'self' 'unsafe-inline' data: blob:; img-src 'self' data: blob: https: https://*.cloudinary.com https://i.ytimg.com; font-src 'self' data:; connect-src 'self' https://*.replit.dev wss://*.replit.dev wss://*.worf.replit.dev https://*.launchdarkly.com https://*.stripe.network https://events.launchdarkly.com https://*.cloudinary.com ws://* wss://* https://replit.com https://beacon.replit.com; frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com",
      "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
      "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept"
    },
    proxy: {
      "/api": {
        target: "http://0.0.0.0:5000",
        changeOrigin: true,
        secure: false
      }
    }
  },
  resolve: {
    extensions: [".js", ".jsx", ".json"],
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      "@components": path.resolve(__vite_injected_original_dirname, "./src/components"),
      "@pages": path.resolve(__vite_injected_original_dirname, "./src/pages"),
      "@utils": path.resolve(__vite_injected_original_dirname, "./src/utils"),
      "@hooks": path.resolve(__vite_injected_original_dirname, "./src/hooks"),
      "@context": path.resolve(__vite_injected_original_dirname, "./src/context"),
      "@assets": path.resolve(__vite_injected_original_dirname, "./src/assets")
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlL2Zyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3J1bm5lci93b3Jrc3BhY2UvZnJvbnRlbmQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCh7XG4gICAgICBqc3hSdW50aW1lOiAnYXV0b21hdGljJyxcbiAgICAgIGpzeEltcG9ydFNvdXJjZTogJ3JlYWN0J1xuICAgIH0pXG4gIF0sXG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6ICcwLjAuMC4wJyxcbiAgICBwb3J0OiAzMDAwLFxuICAgIGhtcjoge1xuICAgICAgY2xpZW50UG9ydDogNDQzLFxuICAgICAgaG9zdDogJ2ZmZjYzNDdhLTJmN2EtNGEzMC05YzM3LWY2NzEwODFmNzBmMy0wMC0zbjRqa2FvbjE5eXdyLndvcmYucmVwbGl0LmRldidcbiAgICB9LFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsIFxuICAgICAgJ0NvbnRlbnQtU2VjdXJpdHktUG9saWN5JzogXCJkZWZhdWx0LXNyYyAnc2VsZicgaHR0cHM6Ly8qLnJlcGxpdC5kZXYgaHR0cHM6Ly8qLndvcmYucmVwbGl0LmRldiBodHRwczovL3d3dy55b3V0dWJlLmNvbTsgc2NyaXB0LXNyYyAnc2VsZicgJ3Vuc2FmZS1pbmxpbmUnICd1bnNhZmUtZXZhbCcgaHR0cHM6Ly8qLmxhdW5jaGRhcmtseS5jb20gaHR0cHM6Ly8qLnN0cmlwZS5uZXR3b3JrIGh0dHBzOi8vKi5yZXBsaXQuZGV2IGh0dHBzOi8vcmVwbGl0LmNvbSBodHRwczovLyoud29yZi5yZXBsaXQuZGV2IGh0dHBzOi8vZXZlbnRzLmxhdW5jaGRhcmtseS5jb20gaHR0cHM6Ly9iZWFjb24ucmVwbGl0LmNvbSBodHRwczovL3d3dy55b3V0dWJlLmNvbTsgc3R5bGUtc3JjICdzZWxmJyAndW5zYWZlLWlubGluZScgZGF0YTogYmxvYjo7IGltZy1zcmMgJ3NlbGYnIGRhdGE6IGJsb2I6IGh0dHBzOiBodHRwczovLyouY2xvdWRpbmFyeS5jb20gaHR0cHM6Ly9pLnl0aW1nLmNvbTsgZm9udC1zcmMgJ3NlbGYnIGRhdGE6OyBjb25uZWN0LXNyYyAnc2VsZicgaHR0cHM6Ly8qLnJlcGxpdC5kZXYgd3NzOi8vKi5yZXBsaXQuZGV2IHdzczovLyoud29yZi5yZXBsaXQuZGV2IGh0dHBzOi8vKi5sYXVuY2hkYXJrbHkuY29tIGh0dHBzOi8vKi5zdHJpcGUubmV0d29yayBodHRwczovL2V2ZW50cy5sYXVuY2hkYXJrbHkuY29tIGh0dHBzOi8vKi5jbG91ZGluYXJ5LmNvbSB3czovLyogd3NzOi8vKiBodHRwczovL3JlcGxpdC5jb20gaHR0cHM6Ly9iZWFjb24ucmVwbGl0LmNvbTsgZnJhbWUtc3JjICdzZWxmJyBodHRwczovL3d3dy55b3V0dWJlLmNvbSBodHRwczovL3lvdXR1YmUuY29tIGh0dHBzOi8vd3d3LnlvdXR1YmUtbm9jb29raWUuY29tXCIsXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdHRVQsSEVBRCxQVVQsUEFUQ0gsUE9TVCxERUxFVEUnLFxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnT3JpZ2luLCBYLVJlcXVlc3RlZC1XaXRoLCBDb250ZW50LVR5cGUsIEFjY2VwdCdcbiAgICB9LFxuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovLzAuMC4wLjA6NTAwMCcsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgcmVzb2x2ZToge1xuICAgIGV4dGVuc2lvbnM6IFsnLmpzJywgJy5qc3gnLCAnLmpzb24nXSxcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICdAY29tcG9uZW50cyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9jb21wb25lbnRzJyksXG4gICAgICAnQHBhZ2VzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3BhZ2VzJyksXG4gICAgICAnQHV0aWxzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3V0aWxzJyksXG4gICAgICAnQGhvb2tzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2hvb2tzJyksXG4gICAgICAnQGNvbnRleHQnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvY29udGV4dCcpLFxuICAgICAgJ0Bhc3NldHMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvYXNzZXRzJylcbiAgICB9XG4gIH1cbn0pOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1EsU0FBUyxvQkFBb0I7QUFDNVMsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUZqQixJQUFNLG1DQUFtQztBQUl6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsTUFDSixZQUFZO0FBQUEsTUFDWixpQkFBaUI7QUFBQSxJQUNuQixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sS0FBSztBQUFBLE1BQ0gsWUFBWTtBQUFBLE1BQ1osTUFBTTtBQUFBLElBQ1I7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLCtCQUErQjtBQUFBLE1BQy9CLDJCQUEyQjtBQUFBLE1BQzNCLGdDQUFnQztBQUFBLE1BQ2hDLGdDQUFnQztBQUFBLElBQ2xDO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDVjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxZQUFZLENBQUMsT0FBTyxRQUFRLE9BQU87QUFBQSxJQUNuQyxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsTUFDcEMsZUFBZSxLQUFLLFFBQVEsa0NBQVcsa0JBQWtCO0FBQUEsTUFDekQsVUFBVSxLQUFLLFFBQVEsa0NBQVcsYUFBYTtBQUFBLE1BQy9DLFVBQVUsS0FBSyxRQUFRLGtDQUFXLGFBQWE7QUFBQSxNQUMvQyxVQUFVLEtBQUssUUFBUSxrQ0FBVyxhQUFhO0FBQUEsTUFDL0MsWUFBWSxLQUFLLFFBQVEsa0NBQVcsZUFBZTtBQUFBLE1BQ25ELFdBQVcsS0FBSyxRQUFRLGtDQUFXLGNBQWM7QUFBQSxJQUNuRDtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
