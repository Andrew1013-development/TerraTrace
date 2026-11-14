import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getSeries } from '../data'
import { sampleCatalog, sampleRegions, sampleResult, sampleSeries } from '../fixtures'
import { analyze, countValid } from '../stats'
import type { Hunch, Series } from '../types'
import { VerdictView } from './VerdictView'

// Real verdict module (pure); stats mocked so each test picks the TrendResult.
vi.mock('../stats', () => ({ analyze: vi.fn(), countValid: vi.fn() }))
vi.mock('../data', () => ({ getSeries: vi.fn() }))
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
  expect(screen.queryByText('These two places are moving in opposite directions.')).toBeNull()
  await userEvent.selectOptions(compare(), 'Arctic Canada')
  expect(await screen.findByText('These two places are moving in opposite directions.')).toBeInTheDocument()
})

test('rise beside rise shows no opposite-directions line', async () => {
  vi.mocked(getSeries).mockResolvedValue(arcticSeries)
  renderVerdict()
  await userEvent.selectOptions(compare(), 'Arctic Canada')
  await screen.findByText(/in Arctic Canada/)
  expect(screen.queryByText('These two places are moving in opposite directions.')).toBeNull()
})

test('an error on the second region shows its message and keeps the first card', async () => {
  const error = Object.assign(new Error("This data isn't available for that place. Try a prepared region."), {
    kind: 'unavailable' as const,
  })
  vi.mocked(getSeries).mockRejectedValue(error)
  renderVerdict()
  await userEvent.selectOptions(compare(), 'Arctic Canada')
  // The alert names the region (integration 8).
  expect(await screen.findByRole('alert')).toHaveTextContent("Arctic Canada: This data isn't available for that place.")
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

// Integration report, defect 8: after an error the same region can be chosen again.
test('after an error the select is back on "Choose a region", so the same region can be retried', async () => {
  const error = Object.assign(new Error('x'), { kind: 'network' as const })
  vi.mocked(getSeries).mockRejectedValueOnce(error).mockResolvedValueOnce(arcticSeries)
  renderVerdict()
  await userEvent.selectOptions(compare(), 'Arctic Canada')
  await screen.findByRole('alert')
  expect(compare()).toHaveValue('')
  await userEvent.selectOptions(compare(), 'Arctic Canada')
  expect(await screen.findByText('Source: Synthetic Arctic source')).toBeInTheDocument()
  expect(getSeries).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('alert')).toBeNull()
  expect(compare()).toHaveValue('arctic-canada')
})

// Integration report, defect 6: names written to follow "in" start with a capital in a list.
test('the compare list starts a region name with a capital; the sentence keeps "the"', async () => {
  const regions = [{ ...sampleRegions[0] }, { id: 'sahara', name: 'the Sahara', bbox: sampleRegions[1].bbox }]
  vi.mocked(getSeries).mockResolvedValue({ ...sampleSeries, placeId: 'sahara' })
  render(
    <VerdictView variable={sampleCatalog[0]} placeName="Sahel" series={sampleSeries} deseasonalized hunch="rise" regions={regions} onRestart={vi.fn()} />,
  )
  expect(within(compare()).getAllByRole('option').map((o) => o.textContent)).toEqual(['Choose a region', 'The Sahara'])
  await userEvent.selectOptions(compare(), 'The Sahara')
  expect(await screen.findByText(/Air temperature in the Sahara has risen/)).toBeInTheDocument()
})
