import { useMemo, useRef, useState, type ReactNode } from 'react'
import { getSeries, type DataError } from '../data'
import { analyze, countValid } from '../stats'
import type { Hunch, Region, Series, Variable, Verdict } from '../types'
import { getVerdict, hunchLine, oppositeDirections } from '../verdict'
import { PrimaryButton } from './PrimaryButton'
import { ScreenHeading } from './ScreenHeading'

type VerdictViewProps = {
  variable: Variable
  placeName: string
  series: Series
  deseasonalized: boolean
  hunch: Hunch
  regions: Region[]
  onRestart: () => void
}

// Every kind carries a word; no kind gets its own colour (architecture section 9).
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

// The verdict for one series, or null when it has too few months.
function useVerdict(series: Series | undefined, deseasonalized: boolean, variable: Variable, place: string) {
  return useMemo(() => {
    const result = series && analyze(series, deseasonalized)
    return result ? getVerdict(result, variable, place) : null
  }, [series, deseasonalized, variable, place])
}

export function VerdictView({ variable, placeName, series, deseasonalized, hunch, regions, onRestart }: VerdictViewProps) {
  const verdict = useVerdict(series, deseasonalized, variable, placeName)
  const [witness, setWitness] = useState<Witness>({ status: 'idle' })
  const latest = useRef<string>(undefined)
  const witnessSeries = witness.status === 'ready' ? witness.series : undefined
  const witnessVerdict = useVerdict(witnessSeries, deseasonalized, variable, witness.status === 'idle' ? '' : witness.region.name)
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
        <VerdictCard variable={variable} place={placeName} series={series} verdict={verdict}>
          {verdict && <p className="hunch-line">{hunchLine(hunch, verdict)}</p>}
        </VerdictCard>

        {witness.status === 'ready' && (
          <VerdictCard variable={variable} place={witness.region.name} series={witness.series} verdict={witnessVerdict} />
        )}
        {witness.status === 'loading' && (
          <p role="status" className="card witness-note">
            Loading {witness.region.name}…
          </p>
        )}
        {witness.status === 'error' && (
          <p role="alert" className="card error witness-note">
            {witness.error.message}
          </p>
        )}
      </div>

      {verdict && witnessVerdict && oppositeDirections(verdict, witnessVerdict) && (
        <p className="opposite">These two regions are moving in opposite directions.</p>
      )}

      {others.length > 0 && (
        <label className="compare">
          Compare another region
          <select value={witness.status === 'idle' ? '' : witness.region.id} onChange={(e) => compareWith(e.target.value)}>
            <option value="">Choose a region</option>
            {others.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
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
  series: Series
  verdict: Verdict | null
  children?: ReactNode
}

function VerdictCard({ variable, place, series, verdict, children }: VerdictCardProps) {
  return (
    <article className="card verdict-card">
      <p className="eyebrow">
        {variable.name} · {place}
      </p>
      {verdict ? (
        <>
          <p className="kind">{KIND_WORD[verdict.kind]}</p>
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
