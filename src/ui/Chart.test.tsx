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

// Integration report, defect 5: with too little data there are no statistics, so no fit line.
test('fit={false} draws the data line only: no fit line, no caption, no mention in the label', () => {
  const { container } = render(<Chart series={sampleSeries} deseasonalized={false} fit={false} />)
  expect(container.querySelector('[aria-label="line"]')).not.toBeNull()
  expect(container.querySelector('[aria-label="linear-regression"]')).toBeNull()
  expect(screen.queryByText('Line: straight-line fit to the points shown.')).toBeNull()
  expect(screen.getByRole('img', { name: 'Monthly values in °C, 2000-01 to 2014-12' })).toBeInTheDocument()
})
