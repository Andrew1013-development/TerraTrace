import { useMemo, useRef, useState, type ReactNode } from 'react'
import { getSeries, type DataError } from '../data'
import { listName } from '../place'
import { analyze, countValid, isConstant, slicePeriod, validPeriod } from '../stats'
import type { Hunch, Region, Series, Variable, Verdict } from '../types'
import { constantText, getVerdict, hunchLine, oppositeDirections } from '../verdict'
import { ArrowDownIcon, ArrowUpIcon, FlatIcon, QuestionIcon } from './icons'
import { PrimaryButton } from './PrimaryButton'
import { ScreenHeading } from './ScreenHeading'

type VerdictViewProps = {
  variable: Variable
  placeName: string
  series: Series
  deseasonalized: boolean
  period: { start: number; end: number } | null // the years chosen on the Evidence screen; null = the full record
  hunch: Hunch
  regions: Region[]
  onRestart: () => void
}

// Every kind carries a word; no kind gets its own colour (architecture section 9).
// The icon only repeats the word; it is hidden from screen readers.
const KIND_ICON: Record<Verdict['kind'], ReactNode> = {
  rise: <ArrowUpIcon size={22} />,
  fall: <ArrowDownIcon size={22} />,
  mixed: <QuestionIcon size={22} />,
  none: <FlatIcon size={22} />,
}

const KIND_WORD: Record<Verdict['kind'], string> = {
  rise: 'Rising',
  fall: 'Falling',
  mixed: 'Mixed evidence',
  none: 'No significant trend',
}

type Witness =
  | { status: 'idle' }
  | { status: 'loading'; region: Region }
  | { status: 'ready'; region: Region; series: Series }
  | { status: 'error'; region: Region; error: DataError }

type Years = [number, number] | undefined

// The verdict for one series, or null when it has too few months or never changes. With years, the sentence names them.
function useVerdict(series: Series | undefined, deseasonalized: boolean, variable: Variable, place: string, years: Years) {
  const [from, to] = years ?? []
  return useMemo(() => {
    const result = series && !isConstant(series) && analyze(series, deseasonalized)
    return result ? getVerdict(result, variable, place, from === undefined || to === undefined ? undefined : [from, to]) : null
  }, [series, deseasonalized, variable, place, from, to])
}

const yearOf = (date: string) => Number(date.slice(0, 4))

export function VerdictView({ variable, placeName, series, deseasonalized, period, hunch, regions, onRestart }: VerdictViewProps) {
  const years: Years = period ? [period.start, period.end] : undefined
  // Issue 46: with years chosen, the period's verdict comes first and the full record's sits beside it, both naming
  // their years. The hunch was made against the full record, so the hunch line answers the full-record verdict.
  const periodSeries = useMemo(() => (period ? slicePeriod(series, period.start, period.end) : undefined), [series, period])
  const fullYears: Years = period ? [yearOf(series.dates[0]), yearOf(series.dates[series.dates.length - 1])] : undefined
  const verdict = useVerdict(series, deseasonalized, variable, placeName, fullYears)
  const periodVerdict = useVerdict(periodSeries, deseasonalized, variable, placeName, years)
  const [witness, setWitness] = useState<Witness>({ status: 'idle' })
  const latest = useRef<string>(undefined)
  const witnessFull = witness.status === 'ready' ? witness.series : undefined
  // The second witness uses the same years, and needs them to be a valid period in its own record.
  const witnessOk = !!witnessFull && (!period || validPeriod(witnessFull, period.start, period.end))
  const witnessSeries = useMemo(
    () => (witnessFull && period ? slicePeriod(witnessFull, period.start, period.end) : witnessFull),
    [witnessFull, period],
  )
  const witnessVerdict = useVerdict(
    witnessOk ? witnessSeries : undefined,
    deseasonalized,
    variable,
    witness.status === 'idle' ? '' : witness.region.name,
    years,
  )
  const mainVerdict = period ? periodVerdict : verdict
  // Regions only; leave out the region already shown (a point place shows every region).
  const others = regions.filter((r) => r.id !== series.placeId)

  const compareWith = (regionId: string) => {
    const region = others.find((r) => r.id === regionId)
    latest.current = regionId
    if (!region) return setWitness({ status: 'idle' })
    setWitness({ status: 'loading', region })
    getSeries(variable, { kind: 'region', id: region.id }).then(
      (s) => latest.current === region.id && setWitness({ status: 'ready', region, series: s }),
      (error: DataError) => latest.current === region.id && setWitness({ status: 'error', region, error }),
    )
  }

  return (
    <section className="verdict">
      <ScreenHeading>The verdict</ScreenHeading>

      <div className="verdict-cards">
        <div className="verdict-main">
          {period && periodSeries && (
            <VerdictCard variable={variable} place={placeName} years={years} series={periodSeries} verdict={periodVerdict} />
          )}
          <VerdictCard variable={variable} place={placeName} years={fullYears} series={series} verdict={verdict}>
            {verdict && <p className="hunch-line">{hunchLine(hunch, verdict)}</p>}
          </VerdictCard>
        </div>

        <div className="witness">
          {others.length > 0 && (
            <div className="card compare-card">
              <label className="field">
                Compare another region
                {/* Back to "Choose a region" after an error, so choosing the same region again retries it. */}
                <select value={witness.status === 'idle' || witness.status === 'error' ? '' : witness.region.id} onChange={(e) => compareWith(e.target.value)}>
                  <option value="">Choose a region</option>
                  {others.map((r) => (
                    <option key={r.id} value={r.id}>
                      {listName(r.name)}
                    </option>
                  ))}
                </select>
              </label>
              {witness.status === 'idle' && (
                <p className="compare-hint">See the same measurement somewhere else, side by side.</p>
              )}
            </div>
          )}
          {witness.status === 'ready' && witnessSeries && (
            <VerdictCard
              variable={variable}
              place={witness.region.name}
              years={years}
              series={witnessSeries}
              verdict={witnessVerdict}
            />
          )}
          {witness.status === 'loading' && (
            <p role="status" className="card witness-note">
              Loading {witness.region.name}…
            </p>
          )}
          {witness.status === 'error' && (
            <p role="alert" className="card error witness-note">
              {listName(witness.region.name)}: {witness.error.message}
            </p>
          )}
        </div>
      </div>

      {mainVerdict && witnessVerdict && oppositeDirections(mainVerdict, witnessVerdict) && (
        <p className="opposite">These two places are moving in opposite directions.</p>
      )}

      <div className="actions">
        <PrimaryButton onClick={onRestart}>Open a new case</PrimaryButton>
      </div>
    </section>
  )
}

type VerdictCardProps = {
  variable: Variable
  place: string
  years?: [number, number]
  series: Series
  verdict: Verdict | null
  children?: ReactNode
}

function VerdictCard({ variable, place, years, series, verdict, children }: VerdictCardProps) {
  return (
    <article className="card verdict-card">
      <p className="eyebrow">
        {variable.name} · {place}
        {years && ` · ${years[0]} to ${years[1]}`}
      </p>
      {isConstant(series) ? (
        <p className="notice">{constantText(series.values.find((v) => v !== null)!, series.unit)}</p>
      ) : verdict ? (
        <>
          <p className="kind">
            {KIND_ICON[verdict.kind]}
            {KIND_WORD[verdict.kind]}
          </p>
          <p className="verdict-text">{verdict.text}</p>
          <p className="caveat">{verdict.caveat}</p>
          {children}
        </>
      ) : (
        <p className="notice">
          Not enough data for a verdict. We need at least 120 months and this record has {countValid(series)}.
        </p>
      )}
      <p className="source">Source: {series.source}</p>
    </article>
  )
}
