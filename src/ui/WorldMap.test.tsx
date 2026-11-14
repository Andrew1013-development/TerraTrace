import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { sampleRegions } from '../fixtures'
import { WorldMap } from './WorldMap'

vi.mock('../data', () => ({
  loadLand: vi.fn(() =>
    Promise.resolve({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]] } }],
    }),
  ),
}))

test('draws every region outline, and the highlight only when there is one', async () => {
  const { container, rerender } = render(<WorldMap regions={sampleRegions} label="World map" />)
  expect(screen.getByRole('img', { name: 'World map' })).toBeInTheDocument()
  expect(container.querySelectorAll('.map-regions path')).toHaveLength(sampleRegions.length)
  expect(container.querySelector('.map-highlight')).toBeNull()
  rerender(<WorldMap regions={sampleRegions} highlight={sampleRegions[0].bbox} label="World map, Sahel highlighted" />)
  expect(container.querySelector('.map-highlight path')).not.toBeNull()
  expect(screen.getByRole('img', { name: 'World map, Sahel highlighted' })).toBeInTheDocument()
})

test('draws the coastlines once they load', async () => {
  const { container } = render(<WorldMap regions={sampleRegions} label="World map" />)
  await waitFor(() => expect(container.querySelectorAll('svg path').length).toBeGreaterThan(sampleRegions.length + 1))
})

test('clicking a region outline picks that region', async () => {
  const onRegion = vi.fn()
  const { container } = render(<WorldMap regions={sampleRegions} label="World map" onRegion={onRegion} />)
  const paths = container.querySelectorAll('.map-regions path')
  await userEvent.click(paths[1])
  expect(onRegion).toHaveBeenCalledWith(sampleRegions[1].id)
})
