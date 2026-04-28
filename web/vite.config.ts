import tailwindcss from '@tailwindcss/vite';
import {defineConfig} from 'vite';

const backendTarget = 'http://localhost:8000';
const adminTarget = 'http://localhost:3101';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    assetsDir: 'web-assets',
  },
  server: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app'],
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/assets': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/control-room': {
        target: adminTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/control-room/, '') || '/',
      },
      '/src': {
        target: adminTarget,
        changeOrigin: true,
      },
      '/@vite': {
        target: adminTarget,
        changeOrigin: true,
        ws: true,
      },
      '/@id': {
        target: adminTarget,
        changeOrigin: true,
      },
      '/@fs': {
        target: adminTarget,
        changeOrigin: true,
      },
      '/node_modules': {
        target: adminTarget,
        changeOrigin: true,
      },
    },
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
