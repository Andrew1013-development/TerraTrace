import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { sampleCatalog, sampleRegions, sampleResult, sampleSeries } from '../fixtures'
import { analyze, countValid } from '../stats'
import type { Hunch } from '../types'
import { VerdictView } from './VerdictView'

// Real verdict module (pure); stats mocked so each test picks the TrendResult.
vi.mock('../stats', () => ({ analyze: vi.fn(), countValid: vi.fn() }))
vi.mock('./starBurst', () => ({ starBurst: vi.fn() }))

const CAVEAT = 'Monthly values are often related to their neighbours, which can make a trend look more certain than it is.'

function renderVerdict(hunch: Hunch = 'rise', deseasonalized = true) {
  const onRestart = vi.fn()
  render(
    <VerdictView
      variable={sampleCatalog[0]}
      placeName="Sahel"
      series={sampleSeries}
      deseasonalized={deseasonalized}
      hunch={hunch}
      regions={sampleRegions}
      onRestart={onRestart}
    />,
  )
  return { onRestart }
}

beforeEach(() => {
  vi.mocked(analyze).mockReset().mockReturnValue(sampleResult) // mkP 0.001, CI [0.18, 0.3]: rise
  vi.mocked(countValid).mockReset().mockReturnValue(180)
})

test('shows the verdict text, the caveat and the hunch line', () => {
  renderVerdict('rise')
  expect(
    screen.getByText('Air temperature in Sahel has risen by about 0.24 °C per decade, and the evidence is strong.'),
  ).toBeInTheDocument()
  expect(screen.getByText(CAVEAT)).toBeInTheDocument()
  expect(screen.getByText('Your hunch was right.')).toBeInTheDocument()
})

test('uses the same toggle state as the Evidence screen', () => {
  renderVerdict('rise', false)
  expect(analyze).toHaveBeenCalledWith(sampleSeries, false)
})

test('the verdict kind appears as a word, not only as a color', () => {
  renderVerdict()
  expect(screen.getByText('Rising')).toBeInTheDocument()
  vi.mocked(analyze).mockReturnValue({ ...sampleResult, mkP: 0.2, ci95: [-0.1, 0.3] })
  renderVerdict('fall')
  expect(screen.getByText('No significant trend')).toBeInTheDocument()
  expect(screen.getByText('The evidence does not support your hunch.')).toBeInTheDocument()
})

test('a null result shows the not-enough-data message, with no verdict and no hunch line', () => {
  vi.mocked(analyze).mockReturnValue(null)
  vi.mocked(countValid).mockReturnValue(36)
  renderVerdict()
  expect(
    screen.getByText('Not enough data for a verdict. We need at least 120 months and this record has 36.'),
  ).toBeInTheDocument()
  expect(screen.queryByText(CAVEAT)).toBeNull()
  expect(screen.queryByText(/Your hunch|evidence does not support/)).toBeNull()
})

test('shows the source line', () => {
  renderVerdict()
  expect(screen.getByText(`Source: ${sampleSeries.source}`)).toBeInTheDocument()
})

test('Open a new case calls onRestart', async () => {
  const { onRestart } = renderVerdict()
  await userEvent.click(screen.getByRole('button', { name: 'Open a new case' }))
  expect(onRestart).toHaveBeenCalledTimes(1)
})
