import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize chunk splitting for better caching and smaller initial load
    rollupOptions: {
      output: {
        manualChunks: {
          // Large charting library - only used on dashboard
          'recharts': ['recharts'],
          // Radix UI components - shared across app
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-separator',
            '@radix-ui/react-progress',
            '@radix-ui/react-avatar',
            '@radix-ui/react-slot',
          ],
          // React and React DOM - stable, rarely changes
          'react-vendor': ['react', 'react-dom'],
          // Router - separate chunk for route handling
          'router': ['react-router-dom'],
          // Socket.io client - only needed for real-time features
          'socket': ['socket.io-client'],
        },
      },
    },
    // Raise warning threshold slightly but keep it reasonable
    chunkSizeWarningLimit: 600,
  },
})
