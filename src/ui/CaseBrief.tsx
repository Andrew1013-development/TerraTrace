import { useState } from 'react'
import type { Hunch, Variable } from '../types'
import { PrimaryButton } from './PrimaryButton'
import { ScreenHeading } from './ScreenHeading'

type CaseBriefProps = {
  variable: Variable
  placeName: string
  onConfirm: (hunch: Hunch) => void
  onChange: () => void
}

const HUNCHES: { value: Hunch; label: string }[] = [
  { value: 'rise', label: 'rising' },
  { value: 'fall', label: 'falling' },
  { value: 'none', label: 'no change' },
]

export function CaseBrief({ variable, placeName, onConfirm, onChange }: CaseBriefProps) {
  const [hunch, setHunch] = useState<Hunch>()

  return (
    <section className="card brief">
      <ScreenHeading>Case brief</ScreenHeading>
      <p className="brief-question">
        You want to know whether {variable.name} in {placeName} has changed since {variable.startYear}. Is that right?
      </p>
      <fieldset className="hunch">
        <legend>Your hunch</legend>
        {HUNCHES.map((h) => (
          <label key={h.value} className="hunch-option">
            <input
              type="radio"
              name="hunch"
              value={h.value}
              checked={hunch === h.value}
              onChange={() => setHunch(h.value)}
            />
            {h.label}
          </label>
        ))}
      </fieldset>
      <div className="actions">
        <PrimaryButton disabled={!hunch} onClick={() => hunch && onConfirm(hunch)}>
          Yes, show me the evidence
        </PrimaryButton>
        <button type="button" onClick={onChange}>
          Change
        </button>
      </div>
    </section>
  )
}
