import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { sampleCatalog, sampleLeads, sampleRegions } from '../fixtures'
import type { Place, Variable } from '../types'
import { PlacePicker } from './PlacePicker'

vi.mock('./starBurst', () => ({ starBurst: vi.fn() }))
// The map is tested in WorldMap.test.tsx; here a stand-in reports what it was asked to show.
vi.mock('./WorldMap', () => ({
  WorldMap: (p: { highlight?: number[]; zoom?: boolean; label: string }) => (
    <figure aria-label={p.label} data-highlight={p.highlight?.join(',') ?? ''} data-zoom={String(!!p.zoom)} />
  ),
}))

const precipitation = sampleCatalog[1] // sampleLeads has a precipitation lead for "sahel"
const region = () => screen.getByRole('combobox', { name: 'Prepared region' })
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

test('valid typed coordinates call onPick with a point place', async () => {
  const { onPick, user } = renderPicker()
  await user.type(screen.getByRole('textbox', { name: 'Latitude' }), '10,5')
  await user.type(screen.getByRole('textbox', { name: 'Longitude' }), '106.7')
  await user.click(screen.getByRole('button', { name: 'Use these coordinates' }))
  expect(onPick).toHaveBeenCalledWith({ kind: 'point', lat: 10.5, lon: 106.7 })
})

test('invalid coordinates show the section 8 message and do not call onPick', async () => {
  const { onPick, user } = renderPicker()
  await user.type(screen.getByRole('textbox', { name: 'Latitude' }), '91')
  await user.type(screen.getByRole('textbox', { name: 'Longitude' }), 'abc')
  await user.click(screen.getByRole('button', { name: 'Use these coordinates' }))
  const alert = screen.getByRole('alert')
  expect(alert).toHaveTextContent(MESSAGE)
  expect(screen.getByRole('textbox', { name: 'Latitude' })).toHaveAccessibleDescription(MESSAGE)
  expect(screen.getByRole('textbox', { name: 'Longitude' })).toHaveAccessibleDescription(MESSAGE)
  expect(onPick).not.toHaveBeenCalled()
})

test('a regions-only variable hides the coordinate inputs and says why', () => {
  renderPicker({ ...precipitation, powerParameter: null })
  expect(screen.queryByRole('textbox', { name: 'Latitude' })).toBeNull()
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

test('the map highlights the chosen region, world view', async () => {
  const { user } = renderPicker()
  expect(map().getAttribute('data-highlight')).toBe('')
  await user.selectOptions(region(), 'Sahel')
  expect(map().getAttribute('data-highlight')).toBe(sampleRegions[0].bbox.join(','))
  expect(map().getAttribute('data-zoom')).toBe('false')
  expect(screen.getByText('Highlighted: Sahel, an average of 9 points across this box.')).toBeInTheDocument()
})

test("typed coordinates zoom the map to the point's POWER grid cell", async () => {
  const { user } = renderPicker()
  await user.type(screen.getByRole('textbox', { name: 'Latitude' }), '10.5')
  await user.type(screen.getByRole('textbox', { name: 'Longitude' }), '106.7')
  expect(map().getAttribute('data-highlight')).toBe('10.25,106.5625,10.75,107.1875')
  expect(map().getAttribute('data-zoom')).toBe('true')
  expect(screen.getByText(/covers this grid cell \(0.5° by 0.625°\)/)).toBeInTheDocument()
})

test('a place already chosen comes back selected', () => {
  renderPicker(precipitation, { kind: 'region', id: 'mekong-delta' })
  expect(region()).toHaveValue('mekong-delta')
  expect(screen.getByRole('button', { name: 'Use this region' })).toBeEnabled()
})
