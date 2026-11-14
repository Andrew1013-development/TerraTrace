import { starBurst } from './starBurst'

let button: HTMLButtonElement

function preferReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  vi.useFakeTimers()
  preferReducedMotion(false)
  button = document.createElement('button')
  document.body.appendChild(button)
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

const stars = () => document.body.querySelectorAll('[data-star]')

test('adds 18 aria-hidden stars to document.body', () => {
  starBurst(button)
  expect(stars()).toHaveLength(18)
  stars().forEach((s) => {
    expect(s.parentElement).toBe(document.body)
    expect(s).toHaveAttribute('aria-hidden', 'true')
  })
})

test('removes every star after 600 ms', () => {
  starBurst(button)
  vi.advanceTimersByTime(600)
  expect(stars()).toHaveLength(0)
})

test('two bursts in a row leave no stars behind', () => {
  starBurst(button)
  vi.advanceTimersByTime(100)
  starBurst(button)
  expect(stars()).toHaveLength(36)
  vi.advanceTimersByTime(600)
  expect(stars()).toHaveLength(0)
})

test('adds no stars when the user prefers reduced motion', () => {
  preferReducedMotion(true)
  starBurst(button)
  expect(stars()).toHaveLength(0)
})
