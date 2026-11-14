import { render, screen } from '@testing-library/react'
import { sampleRegions } from '../fixtures'
import { densify, toLatLon, toVector } from './globe'
import { WorldMap } from './WorldMap'

vi.mock('../data', () => ({ loadRegionShapes: vi.fn(() => Promise.resolve({})) }))

// The globe itself needs WebGL, which jsdom lacks; it is checked in the browser. Here: its geometry and its fallback.

test('a point on the globe turns back into the same latitude and longitude', () => {
  for (const [lat, lon] of [[10.5, 106.7], [-33.9, -151.2], [0, 0], [70, -179], [-89, 179.5]]) {
    const back = toLatLon(...toVector(lat, lon))
    expect(back.lat).toBeCloseTo(lat, 6)
    expect(back.lon).toBeCloseTo(lon, 6)
  }
})

test('the globe matches the texture: longitude 0 faces +x and the north pole is +y', () => {
  const [x, y, z] = toVector(0, 0)
  expect([x, y, z].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([1, 0, 0])
  expect(toVector(90, 0)[1]).toBeCloseTo(1, 6)
})

test('densify adds points so no step is longer than 1 degree', () => {
  const ring = densify([[0, 0], [3, 0], [3, 0.5], [0, 0]])
  expect(ring[0]).toEqual([0, 0])
  expect(ring.at(-1)).toEqual([0, 0])
  for (let i = 1; i < ring.length; i++) {
    expect(Math.max(Math.abs(ring[i][0] - ring[i - 1][0]), Math.abs(ring[i][1] - ring[i - 1][1]))).toBeLessThanOrEqual(1)
  }
})

test('without WebGL the map says so and still has its label', () => {
  render(<WorldMap regions={sampleRegions} label="World map, the Sahel highlighted" />)
  expect(screen.getByRole('img', { name: 'World map, the Sahel highlighted' })).toBeInTheDocument()
  expect(screen.getByText(/can't draw the 3D globe/)).toBeInTheDocument()
})
