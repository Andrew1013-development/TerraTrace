import { useState, type ReactNode } from 'react'
import type { Hunch, Variable } from '../types'
import { ArrowDownIcon, ArrowUpIcon, FlatIcon, GlobeIcon, PinIcon, SearchIcon } from './icons'
import { PrimaryButton } from './PrimaryButton'
import { ScreenHeading } from './ScreenHeading'

type CaseBriefProps = {
  variable: Variable
  placeName: string
  hunch?: Hunch // a hunch already given, when the user comes back to this step
  onConfirm: (hunch: Hunch) => void
  onChange: () => void
}

const HUNCHES: { value: Hunch; label: string; icon: ReactNode }[] = [
  { value: 'rise', label: 'rising', icon: <ArrowUpIcon size={32} /> },
  { value: 'fall', label: 'falling', icon: <ArrowDownIcon size={32} /> },
  { value: 'none', label: 'no change', icon: <FlatIcon size={32} /> },
]

export function CaseBrief({ variable, placeName, hunch: given, onConfirm, onChange }: CaseBriefProps) {
  const [hunch, setHunch] = useState<Hunch | undefined>(given)

  return (
    <section className="brief">
      <ScreenHeading>Case brief</ScreenHeading>
      <div className="brief-grid">
        <div className="card">
          <p className="brief-question">
            You want to know whether {variable.name} in {placeName} has changed since {variable.startYear}. Is that right?
          </p>
          <fieldset className="hunch">
            <legend>Your hunch</legend>
            <div className="hunch-options">
              {HUNCHES.map((h) => (
                <label key={h.value} className="hunch-option">
                  <input
                    type="radio"
                    name="hunch"
                    value={h.value}
                    checked={hunch === h.value}
                    onChange={() => setHunch(h.value)}
                  />
                  <span className="hunch-icon" aria-hidden="true">
                    {h.icon}
                  </span>
                  {h.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="actions">
            <PrimaryButton disabled={!hunch} onClick={() => hunch && onConfirm(hunch)}>
              Yes, show me the evidence
            </PrimaryButton>
            <button type="button" onClick={onChange}>
              Change
            </button>
          </div>
        </div>

        <dl className="card case-card" aria-label="Your case">
          <div>
            <dt>
              <SearchIcon size={20} /> Measurement
            </dt>
            <dd>
              <strong>{variable.name}</strong>
              <span>{variable.definition}</span>
            </dd>
          </div>
          <div>
            <dt>
              <PinIcon size={20} /> Place
            </dt>
            <dd>
              <strong>{placeName}</strong>
            </dd>
          </div>
          <div>
            <dt>
              <GlobeIcon size={20} /> Record
            </dt>
            <dd>
              <strong>Monthly, since {variable.startYear}</strong>
              <span>
                {variable.unit} · {variable.source}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
