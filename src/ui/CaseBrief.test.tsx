import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { sampleCatalog } from '../fixtures'
import { CaseBrief } from './CaseBrief'

vi.mock('./starBurst', () => ({ starBurst: vi.fn() }))

const v = sampleCatalog[1] // precipitation

function renderBrief() {
  const onConfirm = vi.fn()
  const onChange = vi.fn()
  render(<CaseBrief variable={v} placeName="Arctic Canada" onConfirm={onConfirm} onChange={onChange} />)
  return { onConfirm, onChange }
}

test('shows the sentence from architecture section 9 with the name, place and start year', () => {
  renderBrief()
  expect(
    screen.getByText('You want to know whether precipitation in Arctic Canada has changed since 1981. Is that right?'),
  ).toBeInTheDocument()
})

test('the hunch is a labeled radio group: rising, falling, no change, with none chosen at first', () => {
  renderBrief()
  const group = screen.getByRole('group', { name: 'Your hunch' })
  const radios = ['rising', 'falling', 'no change'].map((name) => screen.getByRole('radio', { name }))
  radios.forEach((r) => {
    expect(group).toContainElement(r)
    expect(r).not.toBeChecked()
  })
})

test('the confirm button is disabled until a hunch is chosen', async () => {
  renderBrief()
  const confirm = screen.getByRole('button', { name: 'Yes, show me the evidence' })
  expect(confirm).toBeDisabled()
  await userEvent.click(screen.getByRole('radio', { name: 'falling' }))
  expect(confirm).toBeEnabled()
})

test('confirm passes the chosen hunch; Change calls onChange', async () => {
  const { onConfirm, onChange } = renderBrief()
  await userEvent.click(screen.getByRole('radio', { name: 'no change' }))
  await userEvent.click(screen.getByRole('button', { name: 'Yes, show me the evidence' }))
  expect(onConfirm).toHaveBeenCalledWith('none')
  await userEvent.click(screen.getByRole('button', { name: 'Change' }))
  expect(onChange).toHaveBeenCalledTimes(1)
})

test('each label maps to its hunch value', async () => {
  const { onConfirm } = renderBrief()
  for (const [label, value] of [
    ['rising', 'rise'],
    ['falling', 'fall'],
  ] as const) {
    await userEvent.click(screen.getByRole('radio', { name: label }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, show me the evidence' }))
    expect(onConfirm).toHaveBeenLastCalledWith(value)
  }
})
