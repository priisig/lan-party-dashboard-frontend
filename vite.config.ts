/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // In dev, the Spring Boot backend runs on :8080; nginx does the same proxying in Docker.
  // Override with BACKEND_URL in .env.local (see .env.example) or the environment.
  const backend = loadEnv(mode, process.cwd(), '').BACKEND_URL || 'http://localhost:8080';
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': { target: backend, changeOrigin: false },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
