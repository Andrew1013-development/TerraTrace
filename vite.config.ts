import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// `base` must match the GitHub repository name, with both slashes,
// or the deployed page on GitHub Pages is blank.
export default defineConfig({
  base: '/TerraTrace/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    // Other sessions' worktrees live under .claude; their tests are not this checkout's tests.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
})
