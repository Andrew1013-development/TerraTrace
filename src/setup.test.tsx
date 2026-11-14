// Checks the test toolchain from Task A1: jsdom, React Testing Library,
// jest-dom matchers and JSON imports. It tests no app behavior.
import { render, screen } from '@testing-library/react'
import pkg from '../package.json'

test('renders into jsdom and finds a heading by role', () => {
  render(<h1>Case File</h1>)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Case File')
})

test('imports JSON files', () => {
  expect(pkg.name).toBe('case-file')
})
