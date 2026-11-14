import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrimaryButton } from './PrimaryButton'
import { starBurst } from './starBurst'

vi.mock('./starBurst', () => ({ starBurst: vi.fn() }))

beforeEach(() => vi.mocked(starBurst).mockClear())

test('a click calls starBurst with the button, then onClick', async () => {
  const onClick = vi.fn()
  render(<PrimaryButton onClick={onClick}>See the verdict</PrimaryButton>)
  const button = screen.getByRole('button', { name: 'See the verdict' })
  await userEvent.click(button)
  expect(starBurst).toHaveBeenCalledWith(button)
  expect(onClick).toHaveBeenCalledTimes(1)
})

test('keyboard activation counts as a click', async () => {
  const onClick = vi.fn()
  render(<PrimaryButton onClick={onClick}>Continue</PrimaryButton>)
  screen.getByRole('button', { name: 'Continue' }).focus()
  await userEvent.keyboard('{Enter}')
  expect(starBurst).toHaveBeenCalledTimes(1)
  expect(onClick).toHaveBeenCalledTimes(1)
})

test('a disabled button calls neither', async () => {
  const onClick = vi.fn()
  render(
    <PrimaryButton onClick={onClick} disabled>
      Yes, show me the evidence
    </PrimaryButton>,
  )
  await userEvent.click(screen.getByRole('button'))
  expect(starBurst).not.toHaveBeenCalled()
  expect(onClick).not.toHaveBeenCalled()
})
