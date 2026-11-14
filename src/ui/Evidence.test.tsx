import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { sampleResult, sampleSeries } from '../fixtures'
import { analyze, countValid } from '../stats'
import type { CaseState } from '../App'
import { Evidence } from './Evidence'

vi.mock('../stats', () => ({
  analyze: vi.fn(),
  countValid: vi.fn(),
  deseasonalize: vi.fn(() => []),
}))
vi.mock('./Chart', () => ({ Chart: () => <figure aria-label="chart" /> }))
vi.mock('./starBurst', () => ({ starBurst: vi.fn() }))

const ready: CaseState['load'] = { status: 'ready', series: sampleSeries }

function renderEvidence(over: Partial<Parameters<typeof Evidence>[0]> = {}) {
  const props = { load: ready, deseasonalized: true, onToggle: vi.fn(), onNext: vi.fn(), ...over }
  return { props, ...render(<Evidence {...props} />) }
}

beforeEach(() => {
  vi.mocked(analyze).mockReset().mockImplementation((_s, d) => ({ ...sampleResult, deseasonalized: d }))
  vi.mocked(countValid).mockReset().mockReturnValue(180)
})

test('the toggle is a labeled checkbox, on by default', () => {
  renderEvidence()
  expect(screen.getByRole('checkbox', { name: 'Remove the seasonal cycle' })).toBeChecked()
})

test('turning the toggle off calls analyze with false and shows the new p-value', async () => {
  vi.mocked(analyze).mockImplementation((_s, d) => ({ ...sampleResult, deseasonalized: d, mkP: d ? 0.0004 : 0.2346 }))
  const { props, rerender } = renderEvidence()
  expect(screen.getByText('< 0.001')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('checkbox', { name: 'Remove the seasonal cycle' }))
  expect(props.onToggle).toHaveBeenCalledTimes(1)
  rerender(<Evidence {...props} deseasonalized={false} />)
  expect(analyze).toHaveBeenLastCalledWith(sampleSeries, false)
  expect(screen.getByText('0.235')).toBeInTheDocument()
})

test('rate, p-value and interval are three labeled tiles in one group', () => {
  renderEvidence()
  const group = screen.getByRole('group', { name: 'Trend statistics' })
  expect(within(group).getAllByRole('term').map((t) => t.textContent)).toEqual([
    'Rate per decade',
    'p-value (below 0.05 counts as significant)',
    '95% interval',
  ])
  expect(within(group).getByText('+0.24 °C')).toBeInTheDocument()
  expect(within(group).getByText('0.18 to 0.3 °C')).toBeInTheDocument()
})

test('the source line is visible', () => {
  renderEvidence()
  expect(screen.getByText(`Source: ${sampleSeries.source}`)).toBeInTheDocument()
})

test('loading shows a status message; an error shows the DataError message', () => {
  const { rerender, props } = renderEvidence({ load: { status: 'loading' } })
  expect(screen.getByRole('status')).toHaveTextContent('Loading the data')
  const error = Object.assign(new Error("NASA's data service is busy. Try a prepared region, or wait a minute."), {
    kind: 'rate-limit' as const,
  })
  rerender(<Evidence {...props} load={{ status: 'error', error }} />)
  expect(screen.getByRole('alert')).toHaveTextContent(
    "NASA's data service is busy. Try a prepared region, or wait a minute.",
  )
})

test('fewer than 120 valid months shows the not-enough-data message with the count', () => {
  vi.mocked(analyze).mockReturnValue(null)
  vi.mocked(countValid).mockReturnValue(97)
  renderEvidence()
  expect(
    screen.getByText('Not enough data for a verdict. We need at least 120 months and this record has 97.'),
  ).toBeInTheDocument()
  expect(screen.queryByRole('group', { name: 'Trend statistics' })).toBeNull()
})

test('See the verdict is the primary button and calls onNext', async () => {
  const { props } = renderEvidence()
  await userEvent.click(screen.getByRole('button', { name: 'See the verdict' }))
  expect(props.onNext).toHaveBeenCalledTimes(1)
})
