import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const buildSourceMap = process.env.BUILD_SOURCE_MAPS === 'true' ? 'hidden' : false;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  preview: {
    port: 4173
  },
  build: {
    sourcemap: buildSourceMap,
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
