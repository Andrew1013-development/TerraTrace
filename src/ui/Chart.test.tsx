import { render, screen } from '@testing-library/react'
import { sampleSeries } from '../fixtures'
import { Chart } from './Chart'

vi.mock('../stats', () => ({ deseasonalize: vi.fn(() => sampleSeries.values.map((v) => (v ?? 0) - 25)) }))

test('has an accessible label naming the unit and period, and the fit caption', () => {
  render(<Chart series={sampleSeries} deseasonalized={false} />)
  expect(screen.getByRole('img', { name: /Monthly values in °C, 2000-01 to 2014-12, with a straight-line fit/ })).toBeInTheDocument()
  expect(screen.getByText('Line: straight-line fit to the points shown.')).toBeInTheDocument()
})

test('draws the data line and the straight-line fit, with the anomaly axis label when on', () => {
  const { container } = render(<Chart series={sampleSeries} deseasonalized />)
  expect(container.querySelector('[aria-label="line"]')).not.toBeNull()
  expect(container.querySelector('[aria-label="linear-regression"]')).not.toBeNull()
  expect(screen.getByText(/Difference from the usual value for that month \(°C\)/)).toBeInTheDocument()
})
