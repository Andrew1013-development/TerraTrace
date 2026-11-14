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
vi.mock('./Chart', () => ({ Chart: ({ fit }: { fit?: boolean }) => <figure aria-label="chart" data-fit={String(fit)} /> }))
vi.mock('./starBurst', () => ({ starBurst: vi.fn() }))

const ready: CaseState['load'] = { status: 'ready', series: sampleSeries }

function renderEvidence(over: Partial<Parameters<typeof Evidence>[0]> = {}) {
  const props = { load: ready, deseasonalized: true, onToggle: vi.fn(), onNext: vi.fn(), onBack: vi.fn(), ...over }
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
  // Same formatter as the verdict: 2 significant figures, so 0.3 reads 0.30 (D16).
  // The interval carries its signs like the rate (integration 4).
  expect(within(group).getByText('+0.18 to +0.30 °C')).toBeInTheDocument()
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

// Integration report, defect 1.
test('an error offers "Choose another place", which calls onBack', async () => {
  const error = Object.assign(new Error('x'), { kind: 'network' as const })
  const { props } = renderEvidence({ load: { status: 'error', error } })
  await userEvent.click(screen.getByRole('button', { name: 'Choose another place' }))
  expect(props.onBack).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('button', { name: 'See the verdict' })).toBeNull()
})

test('loading and ready states have no "Choose another place" button', () => {
  const { rerender, props } = renderEvidence({ load: { status: 'loading' } })
  expect(screen.queryByRole('button', { name: 'Choose another place' })).toBeNull()
  rerender(<Evidence {...props} load={ready} />)
  expect(screen.queryByRole('button', { name: 'Choose another place' })).toBeNull()
})

// Integration report, defect 3: "0.050" must not appear on the significant side of 0.05.
test.each([
  [0.0496, '< 0.050'],
  [0.04999, '< 0.050'],
  [0.05, '0.050'],
  [0.0504, '0.050'],
  [0.0494, '0.049'],
  [0.0506, '0.051'],
  [0.0009, '< 0.001'],
  [0.001, '0.001'],
  [1, '1.000'],
])('a p-value of %s reads "%s"', (mkP, shown) => {
  vi.mocked(analyze).mockReturnValue({ ...sampleResult, mkP })
  renderEvidence()
  const group = screen.getByRole('group', { name: 'Trend statistics' })
  expect(within(group).getAllByRole('definition')[1].textContent).toBe(shown)
})

// Integration report, defect 4.
test('a negative rate and an interval across zero carry their signs', () => {
  vi.mocked(analyze).mockReturnValue({ ...sampleResult, slopePerDecade: -0.026, ci95: [-0.03, 0.006] })
  renderEvidence()
  expect(screen.getByText('\u22120.026 °C')).toBeInTheDocument()
  expect(screen.getByText('\u22120.030 to +0.0060 °C')).toBeInTheDocument()
})

// Integration report, defect 5.
test('the chart draws its fit line only when there is a result', () => {
  const { rerender, props } = renderEvidence()
  expect(screen.getByRole('figure', { name: 'chart' })).toHaveAttribute('data-fit', 'true')
  vi.mocked(analyze).mockReturnValue(null)
  rerender(<Evidence {...props} deseasonalized={false} />)
  expect(screen.getByRole('figure', { name: 'chart' })).toHaveAttribute('data-fit', 'false')
})

// Integration report, defect 9.
test('a percent series gives its rate and interval in percentage points', () => {
  vi.mocked(analyze).mockReturnValue({ ...sampleResult, slopePerDecade: 0.76, ci95: [0.5, 1] })
  renderEvidence({ load: { status: 'ready', series: { ...sampleSeries, unit: '%' } } })
  expect(screen.getByText('+0.76 percentage points')).toBeInTheDocument()
  expect(screen.getByText('+0.50 to +1.0 percentage points')).toBeInTheDocument()
})
