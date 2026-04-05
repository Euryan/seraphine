import tailwindcss from '@tailwindcss/vite';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    assetsDir: 'web-assets',
  },
  server: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/assets': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
