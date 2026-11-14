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
  loadRegionShapes: vi.fn(() =>
    Promise.resolve({
      sahel: { type: 'MultiPolygon', outline: 'land', coordinates: [[[[-10, 13], [-10, 15], [20, 15], [20, 13], [-10, 13]]]] },
    }),
  ),
}))

test('draws every region box, and a highlight only for the chosen region', async () => {
  const { container, rerender } = render(<WorldMap regions={sampleRegions} label="World map" />)
  expect(screen.getByRole('img', { name: 'World map' })).toBeInTheDocument()
  expect(container.querySelectorAll('.map-regions path')).toHaveLength(sampleRegions.length)
  expect(container.querySelector('.map-highlight')).toBeNull()
  rerender(<WorldMap regions={sampleRegions} highlight="sahel" label="World map, the Sahel highlighted" />)
  await waitFor(() => expect(container.querySelector('.map-highlight path')).not.toBeNull())
  expect(screen.getByRole('img', { name: 'World map, the Sahel highlighted' })).toBeInTheDocument()
})

test('a typed point is a pin, not a region highlight', () => {
  const { container } = render(<WorldMap regions={sampleRegions} pin={{ lat: 48.9, lon: 2.3 }} label="World map" />)
  expect(container.querySelector('.map-pin')).not.toBeNull()
  expect(container.querySelector('.map-highlight')).toBeNull()
})

test('land is coloured with a latitude gradient', async () => {
  const { container } = render(<WorldMap regions={sampleRegions} label="World map" />)
  await waitFor(() => expect(container.querySelector('linearGradient stop')).not.toBeNull())
  expect(container.querySelectorAll('linearGradient stop').length).toBeGreaterThan(10)
})

test('clicking a region box picks that region', async () => {
  const onRegion = vi.fn()
  const { container } = render(<WorldMap regions={sampleRegions} label="World map" onRegion={onRegion} />)
  await userEvent.click(container.querySelectorAll('.map-regions path')[1])
  expect(onRegion).toHaveBeenCalledWith(sampleRegions[1].id)
})
