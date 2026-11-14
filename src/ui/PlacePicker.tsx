import { useMemo, useState, type FormEvent } from 'react'
import { leadsFor, parsePoint, powerCell } from '../place'
import type { Lead, Place, Region, Variable } from '../types'
import { GlobeIcon, PinIcon } from './icons'
import { PrimaryButton } from './PrimaryButton'
import { ScreenHeading } from './ScreenHeading'
import { WorldMap } from './WorldMap'

type PlacePickerProps = {
  variable: Variable
  regions: Region[]
  leads: Lead[]
  place?: Place // a place already chosen, when the user comes back to this step
  onPick: (place: Place) => void
}

const COORD_ERROR = 'Enter a latitude from -90 to 90 and a longitude from -180 to 180.'

export function PlacePicker({ variable, regions, leads, place, onPick }: PlacePickerProps) {
  const [regionId, setRegionId] = useState(place?.kind === 'region' ? place.id : '')
  const [lat, setLat] = useState(place?.kind === 'point' ? String(place.lat) : '')
  const [lon, setLon] = useState(place?.kind === 'point' ? String(place.lon) : '')
  const [invalid, setInvalid] = useState(false)
  // The map shows whichever the user touched last: a region, or the typed point's grid cell.
  const [mode, setMode] = useState<'region' | 'point'>(place?.kind === 'point' ? 'point' : 'region')
  const region = regions.find((r) => r.id === regionId)
  const regionLeads = region ? leadsFor(leads, region.id, variable.id) : []
  const pointsAllowed = variable.powerParameter !== null
  const typed = pointsAllowed ? parsePoint(lat, lon) : null

  const map = useMemo(() => {
    if (mode === 'point' && typed?.kind === 'point') {
      const cell = powerCell(typed.lat, typed.lon, variable)
      return {
        highlight: cell,
        zoom: true,
        caption: `The data for ${typed.lat.toFixed(2)}, ${typed.lon.toFixed(2)} covers this grid cell (${cell[2] - cell[0]}° by ${cell[3] - cell[1]}°).`,
      }
    }
    if (region) return { highlight: region.bbox, zoom: false, caption: `Highlighted: ${region.name}, an average of 9 points across this box.` }
    return { highlight: undefined, zoom: false, caption: 'Pick a region, or type coordinates, to see it on the map.' }
  }, [mode, typed?.kind, typed?.kind === 'point' ? typed.lat : 0, typed?.kind === 'point' ? typed.lon : 0, region, variable])

  const submitPoint = (e: FormEvent) => {
    e.preventDefault()
    const p = parsePoint(lat, lon)
    if (p) onPick(p)
    else setInvalid(true)
  }

  return (
    <section className="scene">
      <ScreenHeading>Pick the scene</ScreenHeading>

      <div className="card map-card">
        <WorldMap
          regions={regions}
          highlight={map.highlight}
          zoom={map.zoom}
          label={`World map. ${map.caption}`}
          onRegion={(id) => {
            setRegionId(id)
            setMode('region')
          }}
        />
        <p className="map-caption">{map.caption}</p>
        {regionLeads.length > 0 && (
          <section className="leads" aria-labelledby="leads-heading">
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

      <div className="scene-controls">
        <div className="card">
          <h2 className="control-title">
            <GlobeIcon size={22} /> A prepared region
          </h2>
          <label className="field">
            Prepared region
            <select
              value={regionId}
              onChange={(e) => {
                setRegionId(e.target.value)
                setMode('region')
              }}
            >
              <option value="">Choose a region</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <div className="actions">
            <PrimaryButton disabled={!region} onClick={() => region && onPick({ kind: 'region', id: region.id })}>
              Use this region
            </PrimaryButton>
          </div>
        </div>

        <div className="card coords">
          <h2 className="control-title">
            <PinIcon size={22} /> Or type coordinates
          </h2>
          {!pointsAllowed ? (
            <p>This measurement is only available for prepared regions.</p>
          ) : (
            <form onSubmit={submitPoint} noValidate>
              <div className="coord-fields">
                {[
                  { id: 'lat', label: 'Latitude', value: lat, set: setLat, example: '10.5' },
                  { id: 'lon', label: 'Longitude', value: lon, set: setLon, example: '106.7' },
                ].map((f) => (
                  <label key={f.id} className="field">
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
                        setMode('point')
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
      </div>
    </section>
  )
}
