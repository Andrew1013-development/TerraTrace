import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// `base` must match the GitHub repository name, with both slashes,
// or the deployed page on GitHub Pages is blank.
export default defineConfig({
  base: '/nasa-space-apps-challenge-2026/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
  },
})
