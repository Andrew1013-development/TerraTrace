import { useMemo } from 'react'
import { analyze, countValid } from '../stats'
import type { Hunch, Region, Series, Variable, Verdict } from '../types'
import { getVerdict, hunchLine } from '../verdict'
import { PrimaryButton } from './PrimaryButton'
import { ScreenHeading } from './ScreenHeading'

type VerdictViewProps = {
  variable: Variable
  placeName: string
  series: Series
  deseasonalized: boolean
  hunch: Hunch
  regions: Region[] // used by the second witness (Task C7)
  onRestart: () => void
}

// Every kind carries a word; no kind gets its own colour (architecture section 9).
const KIND_WORD: Record<Verdict['kind'], string> = {
  rise: 'Rising',
  fall: 'Falling',
  mixed: 'Mixed evidence',
  none: 'No significant trend',
}

export function VerdictView({ variable, placeName, series, deseasonalized, hunch, onRestart }: VerdictViewProps) {
  const result = useMemo(() => analyze(series, deseasonalized), [series, deseasonalized])
  const verdict = result && getVerdict(result, variable, placeName)

  return (
    <section className="verdict">
      <ScreenHeading>The verdict</ScreenHeading>

      <article className="card verdict-card">
        <p className="eyebrow">
          {variable.name} · {placeName}
        </p>
        {verdict ? (
          <>
            <p className="kind">{KIND_WORD[verdict.kind]}</p>
            <p className="verdict-text">{verdict.text}</p>
            <p className="caveat">{verdict.caveat}</p>
            <p className="hunch-line">{hunchLine(hunch, verdict)}</p>
          </>
        ) : (
          <p className="notice">
            Not enough data for a verdict. We need at least 120 months and this record has {countValid(series)}.
          </p>
        )}
        <p className="source">Source: {series.source}</p>
      </article>

      <div className="actions">
        <PrimaryButton onClick={onRestart}>Open a new case</PrimaryButton>
      </div>
    </section>
  )
}
