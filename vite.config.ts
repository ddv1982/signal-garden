import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  preview: {
    port: 4173
  },
  build: {
    sourcemap: true,
    // Phaser is intentionally isolated as a lazy game-runtime chunk; keep warnings focused on unexpected growth.
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser']
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    include: [
      'src/**/*.test.ts',
      'shared/**/*.test.ts'
    ]
  }
});
