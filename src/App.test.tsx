import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { loadCatalog } from './data'
import { sampleCatalog, sampleResult } from './fixtures'

vi.mock('./stats', () => ({
  analyze: vi.fn(() => sampleResult),
  countValid: vi.fn(() => 180),
  deseasonalize: vi.fn(() => []),
}))
vi.mock('./ui/Chart', () => ({ Chart: () => <figure aria-label="chart" /> }))
vi.mock('./data', async () => {
  const f = await import('./fixtures')
  return {
    getSeries: vi.fn(() => Promise.resolve(f.sampleSeries)),
    loadCatalog: vi.fn(() => Promise.resolve(f.sampleCatalog)),
    loadRegions: vi.fn(() => Promise.resolve(f.sampleRegions)),
    demoCases: [{ id: 'demo', title: 'Synthetic demo', variableId: 'T2M', place: { kind: 'region', id: 'sahel' } }],
  }
})

beforeEach(() => vi.mocked(loadCatalog).mockImplementation(() => Promise.resolve(sampleCatalog)))

test('shows a loading message, then the clues with the catalog from loadCatalog', async () => {
  render(<App />)
  expect(screen.getByRole('status')).toHaveTextContent('Loading the case files')
  expect(await screen.findByRole('heading', { level: 1, name: 'Gather the clues' })).toBeInTheDocument()
  expect(loadCatalog).toHaveBeenCalled()
})

test('a failed load shows the DataError message, and Try again retries', async () => {
  const error = Object.assign(new Error("We couldn't reach NASA's data service. Check your connection, or try a prepared region."), {
    kind: 'network' as const,
  })
  vi.mocked(loadCatalog).mockRejectedValueOnce(error)
  const user = userEvent.setup()
  render(<App />)
  expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't reach NASA's data service.")
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('heading', { level: 1, name: 'Gather the clues' })).toBeInTheDocument()
})

const stepFor: Record<string, string> = {
  'Gather the clues': 'Clues',
  'Pick the scene': 'Scene',
  'Case brief': 'Brief',
  'The evidence': 'Evidence',
  'The verdict': 'Verdict',
}

async function expectScreen(name: string) {
  const heading = await screen.findByRole('heading', { level: 1, name })
  expect(heading).toHaveFocus()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  const rail = screen.getByRole('complementary', { name: 'Case progress' })
  const current = within(rail).getAllByRole('listitem').filter((li) => li.getAttribute('aria-current') === 'step')
  expect(current).toHaveLength(1)
  expect(current[0]).toHaveTextContent(stepFor[name])
}

test('walks clues, scene, brief, evidence, verdict and back to clues', async () => {
  const user = userEvent.setup()
  render(<App />)

  await expectScreen('Gather the clues')
  await user.click(await screen.findByRole('button', { name: 'Continue' }))

  await expectScreen('Pick the scene')
  await user.click(screen.getByRole('button', { name: 'Use this region' }))

  await expectScreen('Case brief')
  await user.click(screen.getByRole('radio', { name: 'rising' }))
  await user.click(screen.getByRole('button', { name: 'Yes, show me the evidence' }))

  await expectScreen('The evidence')
  await user.click(await screen.findByRole('button', { name: 'See the verdict' }))

  await expectScreen('The verdict')
  await user.click(screen.getByRole('button', { name: 'Open a new case' }))

  await expectScreen('Gather the clues')
})

test('Change on the brief goes back to the clues', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'Continue' }))
  await user.click(screen.getByRole('button', { name: 'Use this region' }))
  await user.click(screen.getByRole('button', { name: 'Change' }))
  await expectScreen('Gather the clues')
})

test('a solved case opens straight at the brief', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'Open a solved case' }))
  await expectScreen('Case brief')
})
