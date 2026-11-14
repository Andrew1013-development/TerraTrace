import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { sampleCatalog } from '../fixtures'
import type { DemoCase } from '../types'
import { Clues } from './Clues'

// The real engine (narrow, liveOptions, nextQuestion) with test-only questions, so these tests
// don't depend on the wording in questions.ts. sampleCatalog tags:
// T2M [air, temperature], PRECTOTCORR [air, water, rain], RH2M [air, water, humidity], TS [land, temperature].
vi.mock('../clues', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../clues')>()),
  questions: [
    {
      id: 'sphere',
      text: 'Is it about the air or the land?',
      options: [
        { label: 'The air', tags: ['air'] },
        { label: 'The land', tags: ['land'] },
      ],
    },
    {
      id: 'feel',
      text: 'What would you notice?',
      options: [
        { label: 'Hotter or colder', tags: ['temperature'] },
        { label: 'Wetter or drier', tags: ['rain', 'humidity'] },
        { label: 'Windier or calmer', tags: ['wind'] },
      ],
    },
  ],
}))
vi.mock('./starBurst', () => ({ starBurst: vi.fn() }))

const demoCases: DemoCase[] = [
  { id: 'a', title: 'Is the Arctic getting wetter?', variableId: 'PRECTOTCORR', place: { kind: 'region', id: 'arctic-canada' } },
  { id: 'b', title: 'Is the Tibetan Plateau warming?', variableId: 'T2M', place: { kind: 'region', id: 'tibetan-plateau' } },
]

function renderClues() {
  const onVariable = vi.fn()
  const onDemo = vi.fn()
  render(<Clues catalog={sampleCatalog} demoCases={demoCases} onVariable={onVariable} onDemo={onDemo} />)
  return { onVariable, onDemo, user: userEvent.setup() }
}

const question = () => screen.getByRole('group', { name: /\?$/ })
const count = () => screen.getByRole('status')

test('shows one question at a time, with only its live options', () => {
  renderClues()
  // "feel" splits 4 suspects into 2 + 2, better than "sphere" (3 + 1), so it is asked first.
  expect(screen.getAllByRole('group', { name: /\?$/ })).toHaveLength(1)
  expect(question()).toHaveAccessibleName('What would you notice?')
  expect(within(question()).getAllByRole('button').map((b) => b.textContent)).toEqual([
    'Hotter or colder',
    'Wetter or drier',
  ])
})

test('answering narrows the suspect list and updates the count', async () => {
  const { user } = renderClues()
  expect(count()).toHaveTextContent('4 suspects left')
  await user.click(screen.getByRole('button', { name: 'Hotter or colder' }))
  expect(count()).toHaveTextContent('2 suspects left')
  const list = screen.getByRole('list', { name: 'Suspects' })
  expect(within(list).getAllByRole('listitem').map((li) => li.querySelector('strong')?.textContent)).toEqual([
    'air temperature',
    'ground surface temperature',
  ])
})

test('each suspect shows its definition', () => {
  renderClues()
  for (const v of sampleCatalog) expect(screen.getByText(v.definition)).toBeInTheDocument()
})

test('one suspect left is shown with its definition and a Continue button that calls onVariable', async () => {
  const { user, onVariable } = renderClues()
  await user.click(screen.getByRole('button', { name: 'Hotter or colder' }))
  await user.click(screen.getByRole('button', { name: 'The air' }))
  expect(count()).toHaveTextContent('1 suspect left')
  expect(screen.queryByRole('group', { name: /\?$/ })).toBeNull()
  expect(screen.getByText(sampleCatalog[0].definition)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  expect(onVariable).toHaveBeenCalledWith(sampleCatalog[0])
})

test('when no question can split further, the suspects are buttons', async () => {
  const { user, onVariable } = renderClues()
  await user.click(screen.getByRole('button', { name: 'Wetter or drier' }))
  // Both left are "air", so "sphere" has one live option and can't split them.
  expect(screen.queryByRole('group', { name: /\?$/ })).toBeNull()
  expect(screen.getByText('Which one fits your question best?')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'relative humidity' }))
  expect(onVariable).toHaveBeenCalledWith(sampleCatalog[2])
})

test('there is no Start over button: the rail restarts a step', async () => {
  const { user } = renderClues()
  await user.click(screen.getByRole('button', { name: 'Hotter or colder' }))
  expect(screen.queryByRole('button', { name: 'Start over' })).toBeNull()
})

const art = () => document.querySelector('.clue-art [data-art]')?.getAttribute('data-art')

test('the illustration shows a question mark, then the art for the hovered or focused choice', async () => {
  const { user } = renderClues()
  expect(art()).toBe('question')
  await user.hover(screen.getByRole('button', { name: 'Hotter or colder' }))
  expect(art()).toBe('fire')
  await user.unhover(screen.getByRole('button', { name: 'Hotter or colder' }))
  expect(art()).toBe('question')
  act(() => screen.getByRole('button', { name: 'Wetter or drier' }).focus())
  expect(art()).toBe('rain')
})

test('the illustration is decorative, hidden from screen readers', () => {
  renderClues()
  expect(document.querySelector('.clue-art')).toHaveAttribute('aria-hidden', 'true')
})

test('the suspect list scrolls inside a focusable region', () => {
  renderClues()
  const region = screen.getByRole('region', { name: 'Suspect list' })
  expect(region).toHaveAttribute('tabindex', '0')
  expect(within(region).getByRole('list', { name: 'Suspects' })).toBeInTheDocument()
})

const focused = () =>
  document.activeElement === document.body ? 'page body' : document.activeElement?.textContent?.trim()

test('focus moves to what comes next after each answer, never to the page body', async () => {
  const { user } = renderClues()
  screen.getByRole('button', { name: 'Hotter or colder' }).focus()
  await user.keyboard('{Enter}')
  expect(focused()).toBe('Is it about the air or the land?')
  await user.click(screen.getByRole('button', { name: 'The air' }))
  expect(focused()).toBe('air temperature')
})

test('focus stays on the heading when the screen first appears', () => {
  renderClues()
  expect(focused()).toBe('Gather the clues')
})

test('each solved case button calls onDemo with that case', async () => {
  const { user, onDemo } = renderClues()
  const solved = screen.getByRole('region', { name: 'Open a solved case' })
  await user.click(within(solved).getByRole('button', { name: 'Is the Tibetan Plateau warming?' }))
  expect(onDemo).toHaveBeenCalledWith(demoCases[1])
  await user.click(within(solved).getByRole('button', { name: 'Is the Arctic getting wetter?' }))
  expect(onDemo).toHaveBeenLastCalledWith(demoCases[0])
})
