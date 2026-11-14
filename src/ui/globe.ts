// Globe geometry shared by WorldMap and its tests. A unit sphere, matched to three.js SphereGeometry's
// texture mapping, so an equirectangular image (longitude -180..180 left to right) lands in the right place.

const RAD = Math.PI / 180

export function toVector(lat: number, lon: number, r = 1): [number, number, number] {
  const phi = (lon + 180) * RAD
  const theta = (90 - lat) * RAD
  return [-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta)]
}

export function toLatLon(x: number, y: number, z: number): { lat: number; lon: number } {
  const r = Math.hypot(x, y, z)
  const lat = 90 - Math.acos(y / r) / RAD
  let lon = Math.atan2(z, -x) / RAD - 180
  if (lon < -180) lon += 360
  return { lat, lon }
}

// A ring of [lon, lat] points with extra points so every step is at most 1°, so lines hug the sphere.
export function densify(ring: number[][]): number[][] {
  const out: number[][] = []
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i]
    const [x1, y1] = ring[i + 1]
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))))
    for (let k = 0; k < n; k++) out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n])
  }
  out.push(ring[ring.length - 1])
  return out
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
