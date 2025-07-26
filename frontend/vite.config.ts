/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  build: {
    // Enable tree shaking
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': ['react-markdown', 'remark-gfm'],
          'socket-vendor': ['socket.io-client'],
          'state-vendor': ['zustand'],
          // Feature chunks
          'chat-components': [
            './src/components/chat/ChatInterface.tsx',
            './src/components/chat/ChatMessage.tsx',
            './src/components/chat/MessageList.tsx',
            './src/components/chat/ChatInput.tsx',
            './src/components/chat/PersonaIndicator.tsx',
          ],
          'conversation-components': [
            './src/components/conversation/ConversationStarter.tsx',
            './src/components/conversation/ConversationFlowManager.tsx',
            './src/components/conversation/ConflictResolution.tsx',
          ],
          'specification-components': [
            './src/components/specifications/SpecificationPreview.tsx',
          ],
        },
        // Optimize chunk names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId
                .split('/')
                .pop()
                ?.replace('.tsx', '')
                .replace('.ts', '')
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `img/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext || '')) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Optimize bundle size
    target: 'esnext',
    sourcemap: false, // Disable sourcemaps in production for smaller bundles
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'socket.io-client',
      'react-markdown',
      'remark-gfm',
      'react-window',
    ],
  },
  // Performance optimizations
  server: {
    hmr: {
      overlay: false, // Disable error overlay for better performance
    },
  },
});
