import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getSeries } from '../data'
import { sampleCatalog, sampleRegions, sampleResult, sampleSeries } from '../fixtures'
import { analyze, countValid } from '../stats'
import type { Hunch, Series } from '../types'
import { VerdictView } from './VerdictView'

// Real verdict module (pure); stats mocked so each test picks the TrendResult.
vi.mock('../stats', async () => ({
  analyze: vi.fn(),
  countValid: vi.fn(),
  ...(await import('../fixtures/period')), // stand-in until the issue 46 functions land
}))
vi.mock('../data', () => ({ getSeries: vi.fn() }))
vi.mock('./starBurst', () => ({ starBurst: vi.fn() }))

const CAVEAT = 'Monthly values are often related to their neighbours, which can make a trend look more certain than it is.'

function renderVerdict(hunch: Hunch = 'rise', deseasonalized = true, period: { start: number; end: number } | null = null) {
  const onRestart = vi.fn()
  render(
    <VerdictView
      variable={sampleCatalog[0]}
      placeName="Sahel"
      series={sampleSeries}
      deseasonalized={deseasonalized}
      period={period}
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

// Second witness (Task C7). The first card is Sahel (sampleSeries.placeId "sahel").
const arcticSeries: Series = { ...sampleSeries, placeId: 'arctic-canada', source: 'Synthetic Arctic source' }
const FALL = { ...sampleResult, slopePerDecade: -0.3, ci95: [-0.4, -0.2] as [number, number] }
const compare = () => screen.getByRole('combobox', { name: 'Compare another region' })

test('the compare list offers the other regions only', () => {
  renderVerdict()
  const names = within(compare()).getAllByRole('option').map((o) => o.textContent)
  expect(names).toEqual(['Choose a region', 'Arctic Canada', 'Mekong Delta'])
})

test('choosing a region loads its series with the same variable and toggle state', async () => {
  vi.mocked(getSeries).mockResolvedValue(arcticSeries)
  renderVerdict('rise', false)
  await userEvent.selectOptions(compare(), 'Arctic Canada')
  expect(getSeries).toHaveBeenCalledWith(sampleCatalog[0], { kind: 'region', id: 'arctic-canada' })
  await screen.findByText(/in Arctic Canada/)
  expect(analyze).toHaveBeenLastCalledWith(arcticSeries, false)
})

test('both cards name their place and source', async () => {
  vi.mocked(getSeries).mockResolvedValue(arcticSeries)
  renderVerdict()
  await userEvent.selectOptions(compare(), 'Arctic Canada')
  const [first, second] = await screen.findAllByRole('article')
  expect(first).toHaveTextContent('Sahel')
  expect(first).toHaveTextContent(`Source: ${sampleSeries.source}`)
  expect(second).toHaveTextContent('Arctic Canada')
  expect(second).toHaveTextContent('Source: Synthetic Arctic source')
  expect(within(second).queryByText(/hunch/i)).toBeNull()
})

test('rise beside fall shows the opposite-directions line', async () => {
  vi.mocked(analyze).mockImplementation((s) => (s.placeId === 'arctic-canada' ? FALL : sampleResult))
  vi.mocked(getSeries).mockResolvedValue(arcticSeries)
  renderVerdict()
  expect(screen.queryByText('These two regions are moving in opposite directions.')).toBeNull()
  await userEvent.selectOptions(compare(), 'Arctic Canada')
  expect(await screen.findByText('These two regions are moving in opposite directions.')).toBeInTheDocument()
})

test('rise beside rise shows no opposite-directions line', async () => {
  vi.mocked(getSeries).mockResolvedValue(arcticSeries)
  renderVerdict()
  await userEvent.selectOptions(compare(), 'Arctic Canada')
  await screen.findByText(/in Arctic Canada/)
  expect(screen.queryByText('These two regions are moving in opposite directions.')).toBeNull()
})

test('an error on the second region shows its message and keeps the first card', async () => {
  const error = Object.assign(new Error("This data isn't available for that place. Try a prepared region."), {
    kind: 'unavailable' as const,
  })
  vi.mocked(getSeries).mockRejectedValue(error)
  renderVerdict()
  await userEvent.selectOptions(compare(), 'Arctic Canada')
  expect(await screen.findByRole('alert')).toHaveTextContent("This data isn't available for that place.")
  expect(
    screen.getByText('Air temperature in Sahel has risen by about 0.24 °C per decade, and the evidence is strong.'),
  ).toBeInTheDocument()
})

test('a late response for a region no longer chosen is ignored', async () => {
  let finishArctic: (s: Series) => void = () => {}
  const mekongSeries: Series = { ...sampleSeries, placeId: 'mekong-delta', source: 'Synthetic Mekong source' }
  vi.mocked(getSeries)
    .mockImplementationOnce(() => new Promise((res) => (finishArctic = res)))
    .mockResolvedValueOnce(mekongSeries)
  renderVerdict()
  await userEvent.selectOptions(compare(), 'Arctic Canada')
  await userEvent.selectOptions(compare(), 'Mekong Delta')
  await screen.findByText('Source: Synthetic Mekong source')
  finishArctic(arcticSeries)
  await new Promise((r) => setTimeout(r, 0))
  expect(screen.queryByText('Source: Synthetic Arctic source')).toBeNull()
})

test('with years chosen, the period verdict comes first and the full record sits beside it with the hunch line', () => {
  renderVerdict('rise', true, { start: 2004, end: 2014 })
  const cards = screen.getAllByRole('article')
  expect(cards[0]).toHaveTextContent('air temperature · Sahel · 2004 to 2014')
  expect(cards[1]).toHaveTextContent('air temperature · Sahel · 2000 to 2014')
  expect(within(cards[0]).queryByText(/hunch/i)).toBeNull()
  expect(cards[1].querySelector('.hunch-line')).not.toBeNull()
  // The period verdict is computed on the cut record only.
  expect(vi.mocked(analyze).mock.calls.some(([s]) => s.dates[0] === '2004-01' && s.dates.length === 132)).toBe(true)
})

test('without years chosen there is one verdict, with no years in it', () => {
  renderVerdict()
  const cards = screen.getAllByRole('article')
  expect(cards).toHaveLength(1)
  expect(cards[0]).toHaveTextContent('air temperature · Sahel')
  expect(cards[0]).not.toHaveTextContent(/\d{4} to \d{4}/)
})

test('a second witness whose record cannot cover the chosen years shows the not-enough-data message', async () => {
  const short: Series = { ...sampleSeries, placeId: 'arctic-canada', dates: sampleSeries.dates.slice(72), values: sampleSeries.values.slice(72) }
  vi.mocked(getSeries).mockResolvedValue(short) // 2006 to 2014: cannot cover 2004 to 2014
  renderVerdict('rise', true, { start: 2004, end: 2014 })
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Compare another region' }), 'Arctic Canada')
  const cards = await screen.findAllByRole('article')
  expect(cards).toHaveLength(3)
  expect(cards[2]).toHaveTextContent('Not enough data for a verdict')
})
