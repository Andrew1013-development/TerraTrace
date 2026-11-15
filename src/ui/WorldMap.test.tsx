import { render, screen } from '@testing-library/react'
import { sampleRegions } from '../fixtures'
import { densify, fitView, ringRadius, toLatLon, toVector, wheelKind } from './globe'
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

test('fitView centres on a shape and backs off further for a bigger one', () => {
  const box = (s: number, w: number, n: number, e: number) => [[[w, s], [w, n], [e, n], [e, s], [w, s]]]
  const small = fitView(box(9, 104, 11, 107), 0.2)
  const big = fitView(box(15, -15, 35, 35), 0.2)
  expect(small.lat).toBeCloseTo(10, 0)
  expect(small.lon).toBeCloseTo(105.5, 0)
  expect(big.distance).toBeGreaterThan(small.distance + 0.5)
  // Every corner of the small box fits: sin θ / (d − cos θ) ≤ tanHalf.
  const theta = Math.acos(toVector(9, 104).reduce((s, v, i) => s + v * toVector(small.lat, small.lon)[i], 0))
  expect(Math.sin(theta) / (small.distance - Math.cos(theta))).toBeLessThanOrEqual(0.2 + 1e-9)
})

test('fitView can centre on a given point instead, such as a pin', () => {
  const v = fitView([[[104, 9], [107, 11]]], 0.2, { lat: 10.2, lon: 105.8 })
  expect(v.lat).toBeCloseTo(10.2, 6)
  expect(v.lon).toBeCloseTo(105.8, 6)
})

test('ringRadius is the globe outline on screen plus a margin, and grows as the camera comes closer', () => {
  // From distance 4.3 with a 32° view in a 440 px box, the globe is about 167 px across its radius.
  const far = ringRadius(4.3, 32, 440)
  expect(far).toBeCloseTo((220 * Math.tan(Math.asin(1 / 4.3))) / Math.tan((16 * Math.PI) / 180) + 15, 6)
  expect(ringRadius(1.3, 32, 440)).toBeGreaterThan(far)
  expect(ringRadius(4.3, 32, 440, 0)).toBeCloseTo(far - 15, 6)
})

test('wheelKind tells a mouse wheel from a touchpad slide by the event numbers', () => {
  expect(wheelKind({ deltaX: 0, deltaY: 3, deltaMode: 1 })).toBe('mouse') // Firefox mouse: lines
  expect(wheelKind({ deltaX: 0, deltaY: 100, deltaMode: 0, wheelDeltaY: -120 })).toBe('mouse') // Chrome mouse: notches of 120
  expect(wheelKind({ deltaX: 0, deltaY: 125, deltaMode: 0 })).toBe('mouse') // a notch at 125% scaling, no wheelDeltaY
  expect(wheelKind({ deltaX: 0, deltaY: 125, deltaMode: 0, wheelDeltaY: -150 })).toBe('mouse') // 125% scaling: not a multiple of 120
  expect(wheelKind({ deltaX: 4, deltaY: 1, deltaMode: 0 })).toBe('touchpad') // sideways: fingers
  expect(wheelKind({ deltaX: 0, deltaY: 7.5, deltaMode: 0, wheelDeltaY: -22 })).toBe('touchpad') // small, fractional
  expect(wheelKind({ deltaX: 0, deltaY: 18, deltaMode: 0 })).toBe('touchpad')
})
