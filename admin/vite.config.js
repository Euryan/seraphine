import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/control-room/' : '/',
  plugins: [tailwindcss()],
  server: {
    port: 3101,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app'],
    hmr: process.env.DISABLE_HMR !== 'true',
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/assets': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
}));
