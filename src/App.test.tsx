import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

async function expectScreen(name: string) {
  const heading = await screen.findByRole('heading', { level: 1, name })
  expect(heading).toHaveFocus()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
}

test('walks clues, scene, brief, evidence, verdict and back to clues', async () => {
  const user = userEvent.setup()
  render(<App />)

  await expectScreen('Gather the clues')
  await user.click(screen.getByRole('button', { name: 'Continue' }))

  await expectScreen('Pick the scene')
  await user.click(screen.getByRole('button', { name: 'Use this region' }))

  await expectScreen('Case brief')
  await user.click(screen.getByRole('button', { name: 'Yes, show me the evidence' }))

  await expectScreen('The evidence')
  await user.click(screen.getByRole('button', { name: 'See the verdict' }))

  await expectScreen('The verdict')
  await user.click(screen.getByRole('button', { name: 'Open a new case' }))

  await expectScreen('Gather the clues')
})

test('Change on the brief goes back to the clues', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  await user.click(screen.getByRole('button', { name: 'Use this region' }))
  await user.click(screen.getByRole('button', { name: 'Change' }))
  await expectScreen('Gather the clues')
})

test('a solved case opens straight at the brief', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Open a solved case' }))
  await expectScreen('Case brief')
})
