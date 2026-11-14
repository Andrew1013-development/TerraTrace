import { defineConfig } from 'vitest/config'

// Live POWER check, manual only: `npm run test:live` or the "Live POWER check" workflow.
export default defineConfig({
  test: {
    include: ['src/**/*.live.ts'],
    environment: 'node',
    testTimeout: 90_000,
  },
})
