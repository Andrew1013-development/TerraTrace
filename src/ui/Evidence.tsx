import { useMemo } from 'react'
import type { CaseState } from '../App'
import { Chart } from './Chart'
import { RulerIcon, ScaleIcon, SpeedIcon } from './icons'
import { PrimaryButton } from './PrimaryButton'
import { analyze, countValid, selectableYears, slicePeriod, validPeriod } from '../stats'
import { formatNumber } from '../verdict'
import { ScreenHeading } from './ScreenHeading'

type Period = NonNullable<CaseState['period']>

type EvidenceProps = {
  load: CaseState['load']
  deseasonalized: boolean
  period: CaseState['period'] // null: the full record
  onToggle: () => void
  onPeriod: (period: Period | null) => void
  onNext: () => void
}

const pValue = (p: number) => (p < 0.001 ? '< 0.001' : p.toFixed(3))

export function Evidence({ load, deseasonalized, period, onToggle, onPeriod, onNext }: EvidenceProps) {
  const series = load.series
  // The chart, its straight-line fit and the numbers all use the same months: the chosen years, or the full record.
  const shown = useMemo(() => (series && period ? slicePeriod(series, period.start, period.end) : series), [series, period])
  const result = useMemo(() => (shown ? analyze(shown, deseasonalized) : null), [shown, deseasonalized])
  const years = useMemo(() => (series ? selectableYears(series) : []), [series])
  const start = period?.start ?? years[0]
  const end = period?.end ?? years[years.length - 1]

  return (
    <section className="evidence">
      <ScreenHeading>The evidence</ScreenHeading>

      {load.status === 'loading' && <p role="status">Loading the data…</p>}
      {load.status === 'error' && load.error && (
        <p role="alert" className="error">
          {load.error.message}
        </p>
      )}

      {load.status === 'ready' && series && shown && (
        <>
          <div className="evidence-body">
            <Chart series={shown} deseasonalized={deseasonalized} />

            <div className="card evidence-side">
              {years.length > 1 && (
                <fieldset className="period">
                  <legend>Years to analyse</legend>
                  <div className="period-fields">
                    <label className="field">
                      From
                      <select value={start} onChange={(e) => onPeriod({ start: Number(e.target.value), end })}>
                        {years.map((y) => (
                          <option key={y} value={y} disabled={!validPeriod(series, y, end)}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      To
                      <select value={end} onChange={(e) => onPeriod({ start, end: Number(e.target.value) })}>
                        {years.map((y) => (
                          <option key={y} value={y} disabled={!validPeriod(series, start, y)}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="field-hint">Whole years, at least 10.</p>
                  <button type="button" disabled={!period} onClick={() => onPeriod(null)}>
                    Full record
                  </button>
                </fieldset>
              )}

              {result ? (
                <dl className="stat-list" role="group" aria-label="Trend statistics">
                  <div className="stat">
                    <dt>
                      <SpeedIcon size={20} />
                      Rate per decade
                    </dt>
                    <dd>
                      <span className="underline underline-red">
                        {formatNumber(result.slopePerDecade, true)} {series.unit}
                      </span>
                    </dd>
                  </div>
                  <div className="stat">
                    <dt>
                      <ScaleIcon size={20} />
                      p-value (below 0.05 counts as significant)
                    </dt>
                    <dd>
                      <span className="underline underline-red">{pValue(result.mkP)}</span>
                    </dd>
                  </div>
                  <div className="stat">
                    <dt>
                      <RulerIcon size={20} />
                      95% interval
                    </dt>
                    <dd>
                      <span className="underline underline-red">
                        {formatNumber(result.ci95[0])} to {formatNumber(result.ci95[1])} {series.unit}
                      </span>
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="notice">
                  Not enough data for a verdict. We need at least 120 months and this record has {countValid(shown)}.
                </p>
              )}

              <label className="toggle">
                <input type="checkbox" checked={deseasonalized} onChange={onToggle} />
                Remove the seasonal cycle
              </label>
            </div>
          </div>

          <div className="evidence-foot">
            <p className="source">Source: {series.source}</p>
            <PrimaryButton onClick={onNext}>See the verdict</PrimaryButton>
          </div>
        </>
      )}
    </section>
  )
}
