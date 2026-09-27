import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Configuración de Vitest separada de vite.config.ts para evitar conflictos de tipos
// entre Vite (usado por plugin-react) y Vitest (que tiene su propio vite bundled).
// El cast `as any` es el workaround conocido para esta incompatibilidad.
export default defineConfig({
  // @ts-expect-error — Plugin type mismatch between Vite (project) and vitest (bundled)
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/', 'dist/', 'tests/e2e/**', '**/*.config.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/test/', '**/*.config.ts', 'src/types/api.ts'],
    },
  },
});
