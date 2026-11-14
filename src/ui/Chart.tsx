import * as Plot from '@observablehq/plot'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { deseasonalize } from '../stats'
import type { Series } from '../types'

type ChartProps = { series: Series; deseasonalized: boolean; children?: ReactNode } // children: controls shown in the chart's box

export function Chart({ series, deseasonalized, children }: ChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  const yLabel = deseasonalized ? `Difference from the usual value for that month (${series.unit})` : series.unit
  const label = `Monthly ${deseasonalized ? 'differences from the usual value' : 'values'} in ${series.unit}, ${series.dates[0]} to ${series.dates[series.dates.length - 1]}, with a straight-line fit`

  // Draw at the width of the card, so the chart fills its column and its text stays its real size.
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width)
      if (w > 0) setWidth(w)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const values = deseasonalized ? deseasonalize(series) : series.values
    const data = series.dates.map((d, i) => {
      const [year, month] = d.split('-').map(Number)
      return { date: new Date(Date.UTC(year, month - 1, 1)), value: values[i] }
    })
    const points = data.filter((p) => p.value !== null)
    const plot = Plot.plot({
      width,
      height: 480,
      marginLeft: 72,
      marginBottom: 56,
      marginTop: 24,
      marginRight: 16,
      style: { background: 'transparent', fontFamily: 'inherit', fontSize: '14px' },
      // Axis titles centred along each axis, without Plot's arrows.
      x: { type: 'utc', label: 'Year', labelAnchor: 'center', labelArrow: 'none', labelOffset: 44 },
      y: { label: yLabel, labelAnchor: 'center', labelArrow: 'none', labelOffset: 56, grid: true },
      marks: [
        // undefined values break the line at gaps instead of bridging them
        Plot.lineY(data, { x: 'date', y: (p) => p.value ?? undefined, stroke: 'var(--neon-blue)', strokeWidth: 1.5 }),
        Plot.linearRegressionY(points, {
          x: 'date',
          y: 'value',
          stroke: 'var(--ink)',
          strokeWidth: 2,
          strokeDasharray: '6 4',
          ci: 0,
        }), // Plot labels this group aria-label="linear-regression"; the hover style targets it

      ],
    })
    ref.current?.append(plot)
    return () => plot.remove()
  }, [series, deseasonalized, yLabel, width])

  return (
    <figure className="chart-card underline-host">
      <div ref={ref} className="chart" role="img" aria-label={label} />
      <figcaption>
        <span className="underline underline-red">Line: straight-line fit to the points shown.</span>
      </figcaption>
      {children}
    </figure>
  )
}
