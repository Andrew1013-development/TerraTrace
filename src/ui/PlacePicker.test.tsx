import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { sampleCatalog, sampleLeads, sampleRegions } from '../fixtures'
import type { Variable } from '../types'
import { PlacePicker } from './PlacePicker'

vi.mock('./starBurst', () => ({ starBurst: vi.fn() }))

const precipitation = sampleCatalog[1] // sampleLeads has a precipitation lead for "sahel"
const MESSAGE = 'Enter a latitude from -90 to 90 and a longitude from -180 to 180.'

function renderPicker(variable: Variable = precipitation) {
  const onPick = vi.fn()
  render(<PlacePicker variable={variable} regions={sampleRegions} leads={sampleLeads} onPick={onPick} />)
  return { onPick, user: userEvent.setup() }
}

test('choosing a region calls onPick with a region place', async () => {
  const { onPick, user } = renderPicker()
  const confirm = screen.getByRole('button', { name: 'Use this region' })
  expect(confirm).toBeDisabled()
  await user.click(screen.getByRole('radio', { name: 'Arctic Canada' }))
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
  await user.click(screen.getByRole('radio', { name: 'Sahel' }))
  const leads = screen.getByRole('region', { name: 'Leads' })
  expect(within(leads).getByText(sampleLeads[0].text)).toBeInTheDocument()
  const link = within(leads).getByRole('link', { name: /Source/ })
  expect(link).toHaveAttribute('href', sampleLeads[0].sourceUrl)
  expect(link).toHaveAttribute('target', '_blank')
  expect(link).toHaveAttribute('rel', 'noopener noreferrer')
})

test('a region with no leads shows no leads section', async () => {
  const { user } = renderPicker()
  await user.click(screen.getByRole('radio', { name: 'Arctic Canada' }))
  expect(screen.queryByRole('region', { name: 'Leads' })).toBeNull()
})
