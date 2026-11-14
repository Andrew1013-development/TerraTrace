import * as Plot from '@observablehq/plot'
import { useEffect, useId, useRef, useState } from 'react'
import { loadLand, loadRegionShapes, type Land, type RegionShapes } from '../data'
import type { Region } from '../types'

type Box = [number, number, number, number] // [south, west, north, east]

type WorldMapProps = {
  regions: Region[]
  highlight?: string // region id: its real outline in translucent red with a pink-red edge
  pin?: { lat: number; lon: number } // a typed point, shown as a map pin
  label: string // what the map shows, for screen readers
  onRegion?: (id: string) => void // clicking a region's box picks it
}

// A bbox as a GeoJSON polygon, with points along each edge so it follows the projection's curves.
// Clockwise (west-south, north, east, south), the exterior orientation d3-geo expects.
function boxFeature(b: Box, name = '') {
  const [s, w, n, e] = b
  const steps = (a: number, z: number) => Array.from({ length: 9 }, (_, i) => a + ((z - a) * i) / 8)
  const ring = [
    ...steps(s, n).map((lat) => [w, lat]),
    ...steps(w, e).slice(1).map((lon) => [lon, n]),
    ...steps(n, s).slice(1).map((lat) => [e, lat]),
    ...steps(e, w).slice(1).map((lon) => [lon, s]),
  ]
  return { type: 'Feature' as const, properties: { name }, geometry: { type: 'Polygon' as const, coordinates: [ring] } }
}

// Land colours by latitude, north to south: ice, tundra, temperate green, desert belt, tropics, and back.
const LAND_STOPS: [number, string][] = [
  [90, '#F3F6F9'],
  [68, '#E8EEF2'],
  [62, '#BFCBA6'],
  [52, '#86B26A'],
  [40, '#9DB86E'],
  [32, '#D8C08A'],
  [22, '#E4CA92'],
  [14, '#A8B866'],
  [6, '#5E9E4F'],
  [-6, '#5A9A4C'],
  [-16, '#9FB463'],
  [-26, '#D9C18A'],
  [-34, '#A9B86E'],
  [-46, '#86B26A'],
  [-56, '#BFCBA6'],
  [-64, '#E8EEF2'],
  [-90, '#F3F6F9'],
]

// A map pin with its tip on the point (d3-style symbol: drawn around the origin from an area `size`).
const pinSymbol = {
  draw(context: CanvasPath, size: number) {
    const r = Math.sqrt(size / Math.PI)
    context.moveTo(0, 0)
    context.arc(0, -1.8 * r, r, Math.PI * 0.72, Math.PI * 0.28)
    context.closePath()
  },
}

export function WorldMap({ regions, highlight, pin, label, onRegion }: WorldMapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const gradientId = `land-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const [land, setLand] = useState<Land | 'error'>()
  const [shapes, setShapes] = useState<RegionShapes>()

  useEffect(() => {
    let live = true
    loadLand().then(
      (l) => live && setLand(l),
      () => live && setLand('error'),
    )
    loadRegionShapes().then(
      (s) => live && setShapes(s),
      () => {}, // without outlines the box itself is highlighted
    )
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    const height = 360
    const chosen = regions.find((r) => r.id === highlight)
    const shape = chosen && shapes?.[chosen.id]
    const highlightFeature = chosen
      ? shape
        ? { type: 'Feature' as const, properties: {}, geometry: { type: 'MultiPolygon' as const, coordinates: shape.coordinates } }
        : boxFeature(chosen.bbox)
      : null
    const plot = Plot.plot({
      width: 760,
      height,
      projection: { type: 'equal-earth' },
      style: { background: 'transparent' },
      marks: [
        Plot.sphere({ fill: '#9CCBEB', stroke: '#7FB2D6' }),
        Plot.graticule({ stroke: '#FFFFFF', strokeOpacity: 0.25 }),
        land && land !== 'error'
          ? Plot.geo(land as never, { fill: `url(#${gradientId})`, stroke: '#6E8B5A', strokeWidth: 0.5, strokeOpacity: 0.6 })
          : null,
        highlightFeature
          ? Plot.geo([highlightFeature], {
              fill: '#E43700',
              fillOpacity: 0.32,
              stroke: '#E8456B',
              strokeWidth: 2.5,
              className: 'map-highlight',
            })
          : null,
        // Each region's sampled box, dashed: the area its 9 points average over. Clicking one picks it.
        Plot.geo(
          regions.map((r) => boxFeature(r.bbox, r.name)),
          {
            fill: '#FFFFFF',
            fillOpacity: 0.01,
            stroke: '#07173F',
            strokeOpacity: 0.55,
            strokeWidth: 1.2,
            strokeDasharray: '4 3',
            title: (d: { properties: { name: string } }) => d.properties.name,
            className: 'map-regions',
          },
        ),
        pin
          ? Plot.dot([pin], {
              x: 'lon',
              y: 'lat',
              r: 7,
              symbol: pinSymbol,
              fill: '#0042A6',
              stroke: '#FFFFFF',
              strokeWidth: 1.5,
              className: 'map-pin',
            })
          : null,
        pin ? Plot.dot([pin], { x: 'lon', y: 'lat', r: 2.6, dy: -12.6, fill: '#FFFFFF' }) : null,
      ],
    })

    // The land gradient, mapped from latitude to the map's height (Equal Earth is close to linear in latitude).
    const svg = plot.tagName.toLowerCase() === 'svg' ? plot : plot.querySelector('svg')
    if (svg) {
      const ns = 'http://www.w3.org/2000/svg'
      const defs = document.createElementNS(ns, 'defs')
      const grad = document.createElementNS(ns, 'linearGradient')
      grad.setAttribute('id', gradientId)
      grad.setAttribute('gradientUnits', 'userSpaceOnUse')
      grad.setAttribute('x1', '0')
      grad.setAttribute('x2', '0')
      grad.setAttribute('y1', '0')
      grad.setAttribute('y2', String(height))
      for (const [lat, color] of LAND_STOPS) {
        const stop = document.createElementNS(ns, 'stop')
        stop.setAttribute('offset', String((90 - lat) / 180))
        stop.setAttribute('stop-color', color)
        grad.append(stop)
      }
      defs.append(grad)
      svg.prepend(defs)
    }

    if (onRegion) {
      plot.querySelectorAll('.map-regions path').forEach((path, i) => {
        path.addEventListener('click', () => onRegion(regions[i].id))
        ;(path as SVGElement).style.cursor = 'pointer'
      })
    }
    ref.current?.append(plot)
    return () => plot.remove()
  }, [land, shapes, regions, highlight, pin, onRegion, gradientId])

  return (
    <figure className="world-map">
      <div ref={ref} className="world-map-plot" role="img" aria-label={label} />
      {land === 'error' && <figcaption className="notice">The coastlines couldn't load; the regions are still shown.</figcaption>}
    </figure>
  )
}
