import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Vitest config — Wasel Egypt v2.0
 *
 * • Tests in src/__tests__/ that import @testing-library/react use jsdom environment.
 * • Data/logic tests (no DOM) use node environment by default.
 * • nationalTransitData.test always passes (no external deps).
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Default environment: jsdom for React components & DOM tests
    environment: 'jsdom',
    // Global test setup
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Coverage config
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'e2e/'],
    },
    // Exclude E2E from unit test run
    exclude: ['**/node_modules/**', '**/e2e/**', '**/*.e2e.*'],
    // Reporter
    reporter: ['verbose'],
  },
})
