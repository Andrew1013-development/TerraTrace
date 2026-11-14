import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { sampleCatalog } from '../fixtures'
import { Shell } from './Shell'

const v = sampleCatalog[0]

function rail() {
  return screen.getByRole('complementary', { name: 'Case progress' })
}

test('lists the five steps in order inside a region named Case progress', () => {
  render(<Shell screen="clues">x</Shell>)
  const items = within(rail()).getAllByRole('listitem').map((li) => li.textContent)
  expect(items).toEqual([
    expect.stringContaining('Clues'),
    expect.stringContaining('Scene'),
    expect.stringContaining('Brief'),
    expect.stringContaining('Evidence'),
    expect.stringContaining('Verdict'),
  ])
})

test('marks only the current step with aria-current=step', () => {
  render(<Shell screen="evidence">x</Shell>)
  const current = within(rail())
    .getAllByRole('listitem')
    .filter((li) => li.getAttribute('aria-current') === 'step')
  expect(current).toHaveLength(1)
  expect(current[0]).toHaveTextContent('Evidence')
  expect(current[0]).toHaveTextContent('You are here')
})

test('shows Not yet before a choice, and the variable name, place and hunch after', () => {
  const { rerender } = render(<Shell screen="clues">x</Shell>)
  expect(within(rail()).getAllByText('Not yet').length).toBeGreaterThan(0)
  rerender(
    <Shell screen="evidence" variable={v} placeName="Arctic" hunch="rise">
      x
    </Shell>,
  )
  expect(within(rail()).getByText(v.name)).toBeInTheDocument()
  expect(within(rail()).getByText('Arctic')).toBeInTheDocument()
  expect(within(rail()).getByText('Hunch: rising')).toBeInTheDocument()
})

test('a passed step with no value does not say Not yet', () => {
  render(<Shell screen="verdict">x</Shell>)
  const evidence = within(rail()).getAllByRole('listitem')[3]
  expect(evidence).toHaveTextContent('Evidence')
  expect(evidence).not.toHaveTextContent('Not yet')
})

test('a solved case opened at the brief shows the skipped steps’ values', () => {
  render(
    <Shell screen="brief" variable={v} placeName="10.50, 106.70">
      x
    </Shell>,
  )
  expect(within(rail()).getByText(v.name)).toBeInTheDocument()
  expect(within(rail()).getByText('10.50, 106.70')).toBeInTheDocument()
})

test('renders its children in main and has no heading of its own', () => {
  render(
    <Shell screen="clues">
      <h1>Q</h1>
    </Shell>,
  )
  expect(within(screen.getByRole('main')).getByRole('heading', { level: 1 })).toHaveTextContent('Q')
  expect(screen.getAllByRole('heading')).toHaveLength(1)
})

// Navigation: reached steps are buttons in the rail; Previous and Next sit under the screen.
test('reached steps are buttons that go to that step; later steps are not', async () => {
  const onGoTo = vi.fn()
  render(
    <Shell screen="brief" variable={v} placeName="Sahel" furthest={2} onGoTo={onGoTo}>
      x
    </Shell>,
  )
  await userEvent.click(within(rail()).getByRole('button', { name: /Scene/ }))
  expect(onGoTo).toHaveBeenCalledWith('scene')
  expect(within(rail()).getByRole('button', { name: /Clues/ })).toBeInTheDocument()
  expect(within(rail()).queryByRole('button', { name: /Evidence/ })).toBeNull()
  expect(within(rail()).queryByRole('button', { name: /Verdict/ })).toBeNull()
})

test('Previous goes back one step; Next is disabled until the next step is answered', async () => {
  const onGoTo = vi.fn()
  const { rerender } = render(
    <Shell screen="scene" variable={v} furthest={1} onGoTo={onGoTo}>
      x
    </Shell>,
  )
  const nav = screen.getByRole('navigation', { name: 'Steps' })
  await userEvent.click(within(nav).getByRole('button', { name: 'Previous' }))
  expect(onGoTo).toHaveBeenCalledWith('clues')
  expect(within(nav).getByRole('button', { name: 'Next' })).toBeDisabled()
  rerender(
    <Shell screen="scene" variable={v} placeName="Sahel" furthest={2} onGoTo={onGoTo}>
      x
    </Shell>,
  )
  await userEvent.click(within(screen.getByRole('navigation', { name: 'Steps' })).getByRole('button', { name: 'Next' }))
  expect(onGoTo).toHaveBeenLastCalledWith('brief')
})

test('Previous is disabled on the first step', () => {
  render(<Shell screen="clues">x</Shell>)
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
})

test('clicking the current step starts that step again', async () => {
  const onGoTo = vi.fn()
  function Child() {
    return <input aria-label="probe" defaultValue="" />
  }
  render(
    <Shell screen="clues" furthest={0} onGoTo={onGoTo}>
      <Child />
    </Shell>,
  )
  await userEvent.type(screen.getByLabelText('probe'), 'typed')
  await userEvent.click(within(rail()).getByRole('button', { name: /Clues/ }))
  expect(screen.getByLabelText('probe')).toHaveValue('')
  expect(onGoTo).not.toHaveBeenCalled()
})

test('shows the Built for logo with its alt text', () => {
  render(<Shell screen="clues">x</Shell>)
  expect(screen.getByAltText('NASA Space Apps Challenge')).toBeInTheDocument()
})

test('the context line joins the parts already chosen', () => {
  render(
    <Shell screen="brief" variable={v} placeName="Sahel">
      x
    </Shell>,
  )
  expect(screen.getByText(`${v.name} · Sahel · since ${v.startYear}`)).toBeInTheDocument()
})

// Integration report, defect 6.
test('the "Case so far" panel starts the place name with a capital', () => {
  render(<Shell screen="brief" variable={v} placeName="the Sahel">x</Shell>)
  expect(within(rail()).getByText('The Sahel')).toBeInTheDocument()
  expect(within(rail()).queryByText('the Sahel')).toBeNull()
})
