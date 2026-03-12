import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync, mkdirSync } from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'configure-server',
      async configureServer(server) {
        // Dynamically import setupProxy
        try {
          const { default: setupProxy } = await import('./src/setupProxy.js');
          setupProxy(server.middlewares);
        } catch (err) {
          console.warn('setupProxy not found, skipping');
        }
      }
    },
    {
      name: 'copy-manifest',
      closeBundle() {
        if (!existsSync('./dist')) {
          mkdirSync('./dist', { recursive: true });
        }

        try {
          copyFileSync('./public/manifest.json', './dist/manifest.json');
          console.log('✓ Copied manifest.json to dist');
        } catch (err) {
          console.error('Failed to copy manifest.json:', err);
        }
      }
    }
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
