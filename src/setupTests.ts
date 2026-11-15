import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'

// A cold first run transforms every file from scratch, and a lazy screen part (the chart) can take over 1 s to appear.
configure({ asyncUtilTimeout: 3000 })
