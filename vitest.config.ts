import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Or 'jsdom' if your tests interact with the DOM
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'examples/*/**',
        // Often excluded if it only re-exports
        'src/index.ts',
      ],
    },
  },
});
