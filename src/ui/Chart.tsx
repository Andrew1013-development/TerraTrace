import * as Plot from '@observablehq/plot'
import { useEffect, useRef } from 'react'
import { deseasonalize } from '../stats'
import type { Series } from '../types'

// fit: draw the straight-line fit. Off when there are too few months for any statistics.
type ChartProps = { series: Series; deseasonalized: boolean; fit?: boolean }

export function Chart({ series, deseasonalized, fit = true }: ChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const yLabel = deseasonalized ? `Difference from the usual value for that month (${series.unit})` : series.unit
  const label = `Monthly ${deseasonalized ? 'differences from the usual value' : 'values'} in ${series.unit}, ${series.dates[0]} to ${series.dates[series.dates.length - 1]}${fit ? ', with a straight-line fit' : ''}`

  useEffect(() => {
    const values = deseasonalized ? deseasonalize(series) : series.values
    const data = series.dates.map((d, i) => {
      const [year, month] = d.split('-').map(Number)
      return { date: new Date(Date.UTC(year, month - 1, 1)), value: values[i] }
    })
    const points = data.filter((p) => p.value !== null)
    const plot = Plot.plot({
      width: 720,
      height: 320,
      marginLeft: 56,
      style: { background: 'transparent', fontFamily: 'inherit', fontSize: '12px' },
      x: { type: 'utc', label: null },
      y: { label: yLabel, grid: true },
      marks: [
        // undefined values break the line at gaps instead of bridging them
        Plot.lineY(data, { x: 'date', y: (p) => p.value ?? undefined, stroke: 'var(--neon-blue)', strokeWidth: 1.5 }),
        fit ? Plot.linearRegressionY(points, {
          x: 'date',
          y: 'value',
          stroke: 'var(--ink)',
          strokeWidth: 2,
          strokeDasharray: '6 4',
          ci: 0,
        }) : null, // Plot labels this group aria-label="linear-regression"; the hover style targets it

      ],
    })
    ref.current?.append(plot)
    return () => plot.remove()
  }, [series, deseasonalized, yLabel, fit])

  return (
    <figure className="chart-card underline-host">
      <div ref={ref} className="chart" role="img" aria-label={label} />
      {fit && (
        <figcaption>
          <span className="underline underline-red">Line: straight-line fit to the points shown.</span>
        </figcaption>
      )}
    </figure>
  )
}
