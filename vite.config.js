import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Environment-aware fallbacks for Vite configuration
// These match the centralized configuration patterns
const getEnvFallback = (envVar, fallbacks) => {
  const value = process.env[envVar]
  if (value) return value

  const nodeEnv = process.env.NODE_ENV || 'development'
  switch (nodeEnv) {
    case 'production':
      return fallbacks.production
    case 'staging':
      return fallbacks.staging
    case 'development':
    default:
      return fallbacks.development
  }
}

// Configuration constants that match /src/config/environment.js patterns
const VITE_CONFIG = {
  api: {
    domain: getEnvFallback('VITE_API_DOMAIN', {
      development: 'localhost',
      staging: 'api-staging.ludora.app',
      production: 'api.ludora.app'
    }),
    port: getEnvFallback('VITE_API_PORT', {
      development: '3003',
      staging: '3003',
      production: '3003'
    })
  },
  frontend: {
    port: getEnvFallback('VITE_FRONTEND_PORT', {
      development: '5173',
      staging: '5173',
      production: '5173'
    })
  },
  domains: {
    student: getEnvFallback('VITE_STUDENT_PORTAL_DOMAIN', {
      development: 'my.localhost',
      staging: 'my-staging.ludora.app',
      production: 'my.ludora.app'
    })
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow access from any host including subdomains
    https: process.env.NODE_ENV !== 'development', // Enable HTTPS for PayPlus autofill functionality
    allowedHosts: 'all', // Allow all hosts including my.localhost
    origin: 'auto', // Auto-detect origin to handle subdomain access correctly
    proxy: {
      '/api': {
        target: `http://${VITE_CONFIG.api.domain}:${VITE_CONFIG.api.port}`,
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying
        headers: {
          // Preserve original host for proper cookie domain matching
          'X-Forwarded-Host': `${VITE_CONFIG.domains.student}:${VITE_CONFIG.frontend.port}`,
          'X-Forwarded-Proto': 'http'
        },
        // Preserve original request body and headers for multipart uploads
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Don't modify the body for multipart uploads
            if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
              console.log('📤 Vite proxy: Preserving multipart/form-data upload');
            }

            // Special handling for Server-Sent Events (SSE)
            if (req.url && req.url.includes('/sse/')) {
              console.log('📡 Vite proxy: Handling SSE request', req.url);
              // Ensure proper SSE headers are preserved
              proxyReq.setHeader('Accept', 'text/event-stream');
              proxyReq.setHeader('Cache-Control', 'no-cache');
              proxyReq.setHeader('Connection', 'keep-alive');
            }
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Special handling for SSE responses
            if (req.url && req.url.includes('/sse/')) {
              console.log('📡 Vite proxy: SSE response received', {
                url: req.url,
                statusCode: proxyRes.statusCode,
                contentType: proxyRes.headers['content-type'],
                headers: proxyRes.headers
              });

              // Critical: Disable buffering for SSE streams
              if (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('text/event-stream')) {
                console.log('📡 Vite proxy: Configuring SSE streaming response');

                // Set proper SSE headers
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                // Disable compression and buffering for streaming
                res.setHeader('X-Accel-Buffering', 'no');

                // Write head immediately to establish connection
                res.writeHead(200);

                // Pipe the response directly without buffering
                proxyRes.pipe(res, { end: true });

                console.log('📡 Vite proxy: SSE stream pipe established');
              }
            }
          });

          proxy.on('error', (err, req, res) => {
            if (req.url && req.url.includes('/sse/')) {
              console.error('📡 Vite proxy: SSE proxy error', err);
            }
          });
        }
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
    include: [
      // Pre-bundle heavy dependencies
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'react-pdf',
      'framer-motion',
      'recharts',
      'react-quill'
    ]
  },
  build: {
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,

    // Enable sourcemaps for debugging (optional in production)
    sourcemap: false,

    // Optimize build performance
    target: 'esnext',
    minify: 'esbuild',

    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching and performance
        manualChunks: {
          // Core React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // UI Components - Radix UI
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-accordion',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch'
          ],

          // Firebase ecosystem
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],

          // Heavy utilities and animations
          'utils-vendor': [
            'framer-motion',
            'date-fns',
            'zod',
            'class-variance-authority',
            'clsx',
            'tailwind-merge'
          ],

          // Charts and data visualization
          'charts-vendor': ['recharts'],

          // Document processing
          'document-vendor': ['react-pdf', 'react-quill', 'pptx-preview'],

          // Icons and assets
          'icons-vendor': ['lucide-react'],

          // Admin-only features (lazy loaded)
          'admin-features': [
            './src/pages/Users',
            './src/pages/CategoryManagement',
            './src/pages/BrandSettings',
            './src/pages/EmailAutomations',
            './src/pages/FeatureControl',
            './src/pages/SupportMessages'
          ]
        },

        // Optimize chunk file names for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ?
            chunkInfo.facadeModuleId.split('/').pop().replace('.jsx', '').replace('.js', '') :
            'chunk';
          return `assets/[name]-[hash].js`;
        },

        // Optimize asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          let extType = info[info.length - 1];

          if (/\.(mp3|wav|ogg)$/.test(assetInfo.name)) {
            extType = 'audio';
          } else if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name)) {
            extType = 'images';
          } else if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
            extType = 'fonts';
          }

          return `assets/${extType}/[name]-[hash][extname]`;
        }
      }
    },

    // Optimize for production
    cssCodeSplit: true,

    // Compress assets
    assetsInlineLimit: 4096, // 4kb threshold for inlining assets
  }
}) 