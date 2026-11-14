import { useMemo } from 'react'
import type { CaseState } from '../App'
import { Chart } from './Chart'
import { PrimaryButton } from './PrimaryButton'
import { analyze, countValid } from '../stats'
import { formatNumber } from '../verdict'
import { ScreenHeading } from './ScreenHeading'

type EvidenceProps = {
  load: CaseState['load']
  deseasonalized: boolean
  onToggle: () => void
  onNext: () => void
}

const pValue = (p: number) => (p < 0.001 ? '< 0.001' : p.toFixed(3))

export function Evidence({ load, deseasonalized, onToggle, onNext }: EvidenceProps) {
  const series = load.series
  const result = useMemo(() => (series ? analyze(series, deseasonalized) : null), [series, deseasonalized])

  return (
    <section className="evidence">
      <ScreenHeading>The evidence</ScreenHeading>

      {load.status === 'loading' && <p role="status">Loading the data…</p>}
      {load.status === 'error' && load.error && (
        <p role="alert" className="error">
          {load.error.message}
        </p>
      )}

      {load.status === 'ready' && series && (
        <>
          {result ? (
            <dl className="tiles" role="group" aria-label="Trend statistics">
              <div className="tile">
                <dt>Rate per decade</dt>
                <dd>
                  <span className="underline underline-red">
                    {formatNumber(result.slopePerDecade, true)} {series.unit}
                  </span>
                </dd>
              </div>
              <div className="tile">
                <dt>p-value (below 0.05 counts as significant)</dt>
                <dd>
                  <span className="underline underline-red">{pValue(result.mkP)}</span>
                </dd>
              </div>
              <div className="tile">
                <dt>95% interval</dt>
                <dd>
                  <span className="underline underline-red">
                    {formatNumber(result.ci95[0])} to {formatNumber(result.ci95[1])} {series.unit}
                  </span>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="notice">
              Not enough data for a verdict. We need at least 120 months and this record has {countValid(series)}.
            </p>
          )}

          <Chart series={series} deseasonalized={deseasonalized} />

          <label className="toggle">
            <input type="checkbox" checked={deseasonalized} onChange={onToggle} />
            Remove the seasonal cycle
          </label>

          <div className="evidence-foot">
            <p className="source">Source: {series.source}</p>
            <PrimaryButton onClick={onNext}>See the verdict</PrimaryButton>
          </div>
        </>
      )}
    </section>
  )
}
