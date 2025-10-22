import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: process.env.NODE_ENV !== 'development', // Enable HTTPS for PayPlus autofill functionality
    allowedHosts: true,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.VITE_API_PORT || '3003'}`,
        changeOrigin: true,
        secure: false
      }
    }
  },
  // logLevel: 'warn', // Reduce HMR noise, only show warnings and errors
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
}) 