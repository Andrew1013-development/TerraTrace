import * as Plot from '@observablehq/plot'
import { useEffect, useRef, useState } from 'react'
import { loadLand, type Land } from '../data'
import type { Region } from '../types'

type Box = [number, number, number, number] // [south, west, north, east]

type WorldMapProps = {
  regions: Region[]
  highlight?: Box // shown in translucent red with a pink-red outline
  zoom?: boolean // zoom to the highlight (a typed point's grid cell) instead of the whole world
  label: string // what the map shows, for screen readers
  onRegion?: (id: string) => void // clicking a region outline picks it
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

export function WorldMap({ regions, highlight, zoom, label, onRegion }: WorldMapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [land, setLand] = useState<Land | 'error'>()

  useEffect(() => {
    let live = true
    loadLand().then(
      (l) => live && setLand(l),
      () => live && setLand('error'),
    )
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    const regionFeatures = regions.map((r) => boxFeature(r.bbox, r.name))
    const [s, w, n, e] = highlight ?? [0, 0, 0, 0]
    const pad = 8 // degrees of context around a zoomed cell
    const domain = zoom && highlight ? boxFeature([Math.max(-90, s - pad), w - pad, Math.min(90, n + pad), e + pad]) : undefined
    const plot = Plot.plot({
      width: 760,
      height: zoom ? 380 : 360,
      projection: domain ? { type: 'equal-earth', domain } : { type: 'equal-earth' },
      style: { background: 'transparent' },
      marks: [
        Plot.sphere({ fill: '#F2F6FC', stroke: '#C5CBE0' }),
        land && land !== 'error' ? Plot.geo(land as never, { fill: '#D9E1EE', stroke: '#AEB9D0', strokeWidth: 0.6 }) : null,
        Plot.geo(regionFeatures, {
          fill: '#0042A6',
          fillOpacity: 0.07,
          stroke: '#0042A6',
          strokeOpacity: 0.55,
          strokeWidth: 1,
          title: (d: { properties: { name: string } }) => d.properties.name,
          className: 'map-regions',
        }),
        highlight
          ? Plot.geo([boxFeature(highlight)], {
              fill: '#E43700',
              fillOpacity: 0.28,
              stroke: '#E8456B',
              strokeWidth: 2.5,
              className: 'map-highlight',
            })
          : null,
      ],
    })
    // Clicking a region outline picks it (the select below stays the keyboard route).
    if (onRegion) {
      plot.querySelectorAll('.map-regions path').forEach((path, i) => {
        path.addEventListener('click', () => onRegion(regions[i].id))
        ;(path as SVGElement).style.cursor = 'pointer'
      })
    }
    ref.current?.append(plot)
    return () => plot.remove()
  }, [land, regions, highlight, zoom, onRegion])

  return (
    <figure className="world-map">
      <div ref={ref} className="world-map-plot" role="img" aria-label={label} />
      {land === 'error' && <figcaption className="notice">The coastlines couldn't load; the regions are still shown.</figcaption>}
    </figure>
  )
}
