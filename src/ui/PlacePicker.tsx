import { useState, type FormEvent } from 'react'
import { leadsFor, parsePoint } from '../place'
import type { Lead, Place, Region, Variable } from '../types'
import { PrimaryButton } from './PrimaryButton'
import { ScreenHeading } from './ScreenHeading'

type PlacePickerProps = {
  variable: Variable
  regions: Region[]
  leads: Lead[]
  onPick: (place: Place) => void
}

const COORD_ERROR = 'Enter a latitude from -90 to 90 and a longitude from -180 to 180.'

export function PlacePicker({ variable, regions, leads, onPick }: PlacePickerProps) {
  const [regionId, setRegionId] = useState<string>()
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [invalid, setInvalid] = useState(false)
  const regionLeads = regionId ? leadsFor(leads, regionId, variable.id) : []

  const submitPoint = (e: FormEvent) => {
    e.preventDefault()
    const place = parsePoint(lat, lon)
    if (place) onPick(place)
    else setInvalid(true)
  }

  return (
    <section className="scene">
      <ScreenHeading>Pick the scene</ScreenHeading>

      <div className="scene-grid">
        <div className="card">
          <fieldset className="regions">
            <legend>Prepared regions</legend>
            {regions.map((r) => (
              <label key={r.id} className="region-option">
                <input
                  type="radio"
                  name="region"
                  value={r.id}
                  checked={regionId === r.id}
                  onChange={() => setRegionId(r.id)}
                />
                {r.name}
              </label>
            ))}
          </fieldset>
          <div className="actions">
            <PrimaryButton disabled={!regionId} onClick={() => regionId && onPick({ kind: 'region', id: regionId })}>
              Use this region
            </PrimaryButton>
          </div>
        </div>

        {regionLeads.length > 0 && (
          <section className="card leads" aria-labelledby="leads-heading">
            <h2 id="leads-heading">Leads</h2>
            <ul>
              {regionLeads.map((l) => (
                <li key={l.sourceUrl}>
                  <p>{l.text}</p>
                  <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Source: {new URL(l.sourceUrl).hostname} (opens in a new tab)
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="card coords">
        <h2>Or type coordinates</h2>
        {variable.powerParameter === null ? (
          <p>This measurement is only available for prepared regions.</p>
        ) : (
          <form onSubmit={submitPoint} noValidate>
            <div className="coord-fields">
              {[
                { id: 'lat', label: 'Latitude', value: lat, set: setLat, example: '10.5' },
                { id: 'lon', label: 'Longitude', value: lon, set: setLon, example: '106.7' },
              ].map((f) => (
                <label key={f.id} className="coord-field">
                  {f.label}
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={f.example}
                    value={f.value}
                    aria-invalid={invalid || undefined}
                    aria-describedby={invalid ? 'coord-error' : undefined}
                    onChange={(e) => {
                      f.set(e.target.value)
                      setInvalid(false)
                    }}
                  />
                </label>
              ))}
            </div>
            {invalid && (
              <p id="coord-error" role="alert" className="error">
                {COORD_ERROR}
              </p>
            )}
            <button type="submit">Use these coordinates</button>
          </form>
        )}
      </div>
    </section>
  )
}
