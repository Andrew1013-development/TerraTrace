import * as Plot from '@observablehq/plot'
import { useEffect, useRef } from 'react'
import type { Series } from '../types'
import { plottedValues } from './statsBridge'

type ChartProps = { series: Series; deseasonalized: boolean }

export function Chart({ series, deseasonalized }: ChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const yLabel = deseasonalized ? `Difference from the usual value for that month (${series.unit})` : series.unit
  const label = `Monthly ${deseasonalized ? 'differences from the usual value' : 'values'} in ${series.unit}, ${series.dates[0]} to ${series.dates[series.dates.length - 1]}, with a straight-line fit`

  useEffect(() => {
    const values = plottedValues(series, deseasonalized)
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
  }, [series, deseasonalized, yLabel])

  return (
    <figure className="chart-card underline-host">
      <div ref={ref} className="chart" role="img" aria-label={label} />
      <figcaption>
        <span className="underline underline-red">Line: straight-line fit to the points shown.</span>
      </figcaption>
    </figure>
  )
}
