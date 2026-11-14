import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadCountries } from '../data'
import { sampleCatalog, sampleLeads, sampleRegions } from '../fixtures'
import type { Place, Variable } from '../types'
import { PlacePicker } from './PlacePicker'

vi.mock('./starBurst', () => ({ starBurst: vi.fn() }))
// The map is tested in WorldMap.test.tsx; here a stand-in reports what it was asked to show.
vi.mock('./WorldMap', () => ({
  WorldMap: (p: { highlight?: string; pin?: { lat: number; lon: number }; label: string }) => (
    <figure aria-label={p.label} data-highlight={p.highlight ?? ''} data-pin={p.pin ? `${p.pin.lat},${p.pin.lon}` : ''} />
  ),
}))
// One square "country" around Paris, for naming points outside every region; and a Sahel outline that reaches north
// of its box (to 22°N) but misses its north-west corner, like the real outlines that differ from their boxes.
vi.mock('../data', () => ({
  loadRegionShapes: vi.fn(() =>
    Promise.resolve({ sahel: { type: 'MultiPolygon', outline: 'test', coordinates: [[[[-17, 12], [35, 12], [10, 22], [-17, 12]]]] } }),
  ),
  loadCountries: vi.fn(() =>
    Promise.resolve({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'France' },
          geometry: { type: 'Polygon', coordinates: [[[-5, 42], [-5, 51], [8, 51], [8, 42], [-5, 42]]] },
        },
      ],
    }),
  ),
}))

const precipitation = sampleCatalog[1] // sampleLeads has a precipitation lead for "sahel"
const region = () => screen.getByRole('combobox', { name: 'Prepared region' })
const latitude = () => screen.getByRole('textbox', { name: /Latitude/ })
const longitude = () => screen.getByRole('textbox', { name: /Longitude/ })
const map = () => document.querySelector('figure[data-highlight]')!
const MESSAGE = 'Enter a latitude from -90 to 90 and a longitude from -180 to 180.'

function renderPicker(variable: Variable = precipitation, place?: Place) {
  const onPick = vi.fn()
  render(<PlacePicker variable={variable} regions={sampleRegions} leads={sampleLeads} place={place} onPick={onPick} />)
  return { onPick, user: userEvent.setup() }
}

test('choosing a region calls onPick with a region place', async () => {
  const { onPick, user } = renderPicker()
  const confirm = screen.getByRole('button', { name: 'Use this region' })
  expect(confirm).toBeDisabled()
  await user.selectOptions(region(), 'Arctic Canada')
  await user.click(confirm)
  expect(onPick).toHaveBeenCalledWith({ kind: 'region', id: 'arctic-canada' })
})

test('coordinate inputs are labelled in degrees', () => {
  renderPicker()
  expect(latitude()).toHaveAccessibleName(/^Latitude \(degrees\)\s*north \+, south −$/)
  expect(longitude()).toHaveAccessibleName(/^Longitude \(degrees\)\s*east \+, west −$/)
})

test('a typed point inside a region picks that region, and the map shows the region and a pin', async () => {
  const { onPick, user } = renderPicker()
  await user.type(latitude(), '10,5')
  await user.type(longitude(), '106.7')
  expect(map().getAttribute('data-highlight')).toBe('mekong-delta')
  expect(map().getAttribute('data-pin')).toBe('10.5,106.7')
  expect(
    screen.getByText(
      'This point is inside Mekong Delta, so the case uses the data for Mekong Delta: an average of 9 points sampled inside the region, which may not include this exact spot.',
    ),
  ).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Use these coordinates' }))
  expect(onPick).toHaveBeenCalledWith({ kind: 'region', id: 'mekong-delta' })
})

test('a typed point outside every region uses live data, named by its country', async () => {
  const { onPick, user } = renderPicker()
  await user.type(latitude(), '48.86')
  await user.type(longitude(), '2.35')
  expect(map().getAttribute('data-highlight')).toBe('')
  expect(map().getAttribute('data-pin')).toBe('48.86,2.35')
  await waitFor(() => expect(screen.getByText(/live data for one spot in France/)).toBeInTheDocument())
  await user.click(screen.getByRole('button', { name: 'Use these coordinates' }))
  expect(onPick).toHaveBeenCalledWith({ kind: 'point', lat: 48.86, lon: 2.35, name: 'one spot in France' })
})

test('a point at sea is named as such', async () => {
  const { onPick, user } = renderPicker()
  await user.type(latitude(), '0')
  await user.type(longitude(), '-30')
  await user.click(screen.getByRole('button', { name: 'Use these coordinates' }))
  await waitFor(() => expect(onPick).toHaveBeenCalledWith({ kind: 'point', lat: 0, lon: -30, name: 'one spot at sea' }))
})

test('invalid coordinates show the section 8 message and do not call onPick', async () => {
  const { onPick, user } = renderPicker()
  await user.type(latitude(), '91')
  await user.type(longitude(), 'abc')
  await user.click(screen.getByRole('button', { name: 'Use these coordinates' }))
  expect(screen.getByRole('alert')).toHaveTextContent(MESSAGE)
  expect(latitude()).toHaveAccessibleDescription(MESSAGE)
  expect(longitude()).toHaveAccessibleDescription(MESSAGE)
  expect(onPick).not.toHaveBeenCalled()
})

test('a regions-only variable hides the coordinate inputs and says why', () => {
  renderPicker({ ...precipitation, powerParameter: null })
  expect(screen.queryByRole('textbox', { name: /Latitude/ })).toBeNull()
  expect(screen.getByText('This measurement is only available for prepared regions.')).toBeInTheDocument()
})

test("a region's leads for this variable appear, each with a source link", async () => {
  const { user } = renderPicker()
  await user.selectOptions(region(), 'Sahel')
  const leads = screen.getByRole('region', { name: 'Leads' })
  expect(within(leads).getByText(sampleLeads[0].text)).toBeInTheDocument()
  const link = within(leads).getByRole('link', { name: /Source/ })
  expect(link).toHaveAttribute('href', sampleLeads[0].sourceUrl)
  expect(link).toHaveAttribute('target', '_blank')
  expect(link).toHaveAttribute('rel', 'noopener noreferrer')
})

test('a region with no leads shows no leads section', async () => {
  const { user } = renderPicker()
  await user.selectOptions(region(), 'Arctic Canada')
  expect(screen.queryByRole('region', { name: 'Leads' })).toBeNull()
})

// Integration report, defect 6.
test('a region name written for a sentence starts with a capital in the list', () => {
  const regions = [{ ...sampleRegions[0], name: 'the Sahel' }, sampleRegions[1]]
  render(<PlacePicker variable={precipitation} regions={regions} leads={sampleLeads} onPick={vi.fn()} />)
  expect(within(region()).getAllByRole('option').map((o) => o.textContent)).toEqual(['Choose a region', 'The Sahel', 'Arctic Canada'])
})

test('the map highlights the region chosen from the list, with no pin', async () => {
  const { user } = renderPicker()
  expect(map().getAttribute('data-highlight')).toBe('')
  await user.selectOptions(region(), 'Sahel')
  expect(map().getAttribute('data-highlight')).toBe('sahel')
  expect(map().getAttribute('data-pin')).toBe('')
  expect(screen.getByText(/Highlighted: Sahel\. The case uses an average of 9 points sampled inside this region\./)).toBeInTheDocument()
})

test('a place already chosen comes back selected', () => {
  renderPicker(precipitation, { kind: 'region', id: 'mekong-delta' })
  expect(region()).toHaveValue('mekong-delta')
  expect(screen.getByRole('button', { name: 'Use this region' })).toBeEnabled()
})

test('when the country file fails, a point is never called "at sea": it keeps its coordinates (audit 3)', async () => {
  vi.mocked(loadCountries).mockRejectedValue(new Error('network'))
  const { onPick, user } = renderPicker()
  await user.type(latitude(), '48.86')
  await user.type(longitude(), '2.35')
  expect(screen.queryByText(/at sea/)).toBeNull()
  expect(screen.getByText(/live data for the area around 48.86, 2.35/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Use these coordinates' }))
  await waitFor(() => expect(onPick).toHaveBeenCalledWith({ kind: 'point', lat: 48.86, lon: 2.35 }))
  vi.mocked(loadCountries).mockReset()
})

test("a typed point inside a region's outline but outside its box picks that region (audit 1)", async () => {
  const { onPick, user } = renderPicker()
  await user.type(latitude(), '19')
  await user.type(longitude(), '10')
  await waitFor(() => expect(map().getAttribute('data-highlight')).toBe('sahel'))
  expect(screen.getByText(/This point is inside Sahel/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Use these coordinates' }))
  expect(onPick).toHaveBeenCalledWith({ kind: 'region', id: 'sahel' })
})

test("a typed point inside a region's box but outside its outline is not that region (audit 1)", async () => {
  const { onPick, user } = renderPicker()
  await user.type(latitude(), '15.5')
  await user.type(longitude(), '-16')
  await waitFor(() => expect(screen.getByText(/outside the prepared regions/)).toBeInTheDocument())
  expect(map().getAttribute('data-highlight')).toBe('')
  await user.click(screen.getByRole('button', { name: 'Use these coordinates' }))
  await waitFor(() => expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ kind: 'point', lat: 15.5, lon: -16 })))
})
