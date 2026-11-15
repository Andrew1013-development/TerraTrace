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

// Where to put the camera so a shape fills the view: looking at `center` (default: the shape's own middle),
// from far enough that every point fits inside a view whose half-height (or half-width) has tangent `tanHalf`.
export function fitView(rings: number[][][], tanHalf: number, center?: { lat: number; lon: number }) {
  const flat = rings.flat()
  const points = flat.map(([lon, lat]) => toVector(lat, lon))
  // The middle of the shape's extent, so it sits in the middle of the view.
  // shortcut: assumes no shape crosses the ±180° meridian (none of ours does); handle wrap-around if one ever does.
  const mid = (i: number) => (Math.min(...flat.map((p) => p[i])) + Math.max(...flat.map((p) => p[i]))) / 2
  const c = center ? toVector(center.lat, center.lon) : toVector(mid(1), mid(0))
  // The widest angle, seen from the globe's centre, between the middle and any point of the shape.
  const theta = Math.max(0, ...points.map((p) => Math.acos(Math.min(1, p[0] * c[0] + p[1] * c[1] + p[2] * c[2]))))
  // A point at that angle sits sin θ off the axis and cos θ along it; keep sin θ / (d − cos θ) ≤ tanHalf.
  return { ...(center ?? { lat: mid(1), lon: mid(0) }), distance: Math.cos(theta) + Math.sin(theta) / tanHalf }
}

// The invisible ring that takes the globe's gestures: the globe's outline on screen plus a margin, in CSS px.
// The camera looks at the centre, so the outline is a circle in the middle of the box. From distance d the
// globe (radius 1) spans an angle asin(1/d) from the centre; a vertical view of fovDeg fills heightPx.
export function ringRadius(distance: number, fovDeg: number, heightPx: number, margin = 15): number {
  const half = (fovDeg / 2) * (Math.PI / 180)
  return ((heightPx / 2) * Math.tan(Math.asin(1 / distance))) / Math.tan(half) + margin
}

// Browsers report a mouse wheel and a touchpad two-finger slide as the same wheel event, so this guesses from
// its numbers: Firefox counts a mouse wheel in lines; only fingers move sideways; a mouse notch is a big step
// (about 100 px, more with display scaling) or a whole 120 in wheelDeltaY; a touchpad starts with small steps.
// shortcut: a guess, wrong for smooth-scrolling mice and the Magic Mouse (they act like a touchpad) and for a
// touchpad flick that starts with a big step; the +/− buttons always zoom.
export function wheelKind(e: { deltaX: number; deltaY: number; deltaMode: number; wheelDeltaY?: number }): 'mouse' | 'touchpad' {
  if (e.deltaMode !== 0) return 'mouse'
  if (e.deltaX !== 0) return 'touchpad'
  if (Math.abs(e.deltaY) >= 50) return 'mouse'
  return e.wheelDeltaY && e.wheelDeltaY % 120 === 0 ? 'mouse' : 'touchpad'
}
