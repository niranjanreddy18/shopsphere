import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom simulates a browser DOM so component tests can render and
    // query real DOM nodes without an actual browser.
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Only source files, never test files or pure re-export/entry
      // points — coverage on a file that's just `export default X` from
      // another module would be a meaningless 100%/0% signal either way.
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/test/**',
        'src/**/*.test.{js,jsx}',
        'src/vite-env.d.ts',
      ],
    },
  },
})
