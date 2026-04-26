import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
    setupFiles: ['./src/testing/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/unit/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['tests/ui/**'],
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@domains': path.resolve(__dirname, './src/domains'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
});
