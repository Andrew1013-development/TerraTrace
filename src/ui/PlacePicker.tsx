import { useEffect, useState, type FormEvent } from 'react'
import { loadCountries, type Countries } from '../data'
import { countryAt, leadsFor, listName, parsePoint, regionAt } from '../place'
import type { Lead, Place, Region, Variable } from '../types'
import { GlobeIcon, PinIcon } from './icons'
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

// A typed point outside every region is named by its country, never by its numbers.
const spotName = (country: string | undefined) => (country ? `one spot in ${country}` : 'one spot at sea')

export function PlacePicker({ variable, regions, leads, place, onPick }: PlacePickerProps) {
  const [regionId, setRegionId] = useState(place?.kind === 'region' ? place.id : '')
  const [lat, setLat] = useState(place?.kind === 'point' ? String(place.lat) : '')
  const [lon, setLon] = useState(place?.kind === 'point' ? String(place.lon) : '')
  const [invalid, setInvalid] = useState(false)
  const [countries, setCountries] = useState<Countries>()
  // The map follows whichever the user touched last: the region list, or the typed point.
  const [mode, setMode] = useState<'region' | 'point'>(place?.kind === 'point' ? 'point' : 'region')

  const pointsAllowed = variable.powerParameter !== null
  const typed = pointsAllowed ? parsePoint(lat, lon) : null
  const point = typed?.kind === 'point' ? typed : undefined
  const pointRegion = point ? regionAt(point.lat, point.lon, regions) : undefined
  const listRegion = regions.find((r) => r.id === regionId)
  const shown = mode === 'point' ? pointRegion : listRegion
  const regionLeads = shown ? leadsFor(leads, shown.id, variable.id) : []

  // Country names are only needed for a point outside every region; load them then (cached by src/data).
  useEffect(() => {
    if (mode === 'point' && point && !pointRegion && !countries) loadCountries().then(setCountries, () => {})
  }, [mode, point, pointRegion, countries])

  const caption =
    mode === 'point' && point
      ? pointRegion
        ? `This point is inside ${pointRegion.name}, so the case uses the data for ${pointRegion.name}.`
        : `This point is outside the prepared regions, so the case uses live data for ${spotName(
            countries && countryAt(point.lat, point.lon, countries),
          )}.`
      : listRegion
        ? `Highlighted: ${listRegion.name}. The case averages 9 sampled points across this region.`
        : 'Pick a region, or type coordinates, to see it on the map.'

  const submitPoint = async (e: FormEvent) => {
    e.preventDefault()
    const p = parsePoint(lat, lon)
    if (!p || p.kind !== 'point') return setInvalid(true)
    const inside = regionAt(p.lat, p.lon, regions)
    if (inside) return onPick({ kind: 'region', id: inside.id })
    const list = countries ?? (await loadCountries().catch(() => undefined))
    onPick({ ...p, name: spotName(list && countryAt(p.lat, p.lon, list)) })
  }

  return (
    <section className="scene">
      <ScreenHeading>Pick the scene</ScreenHeading>

      <div className="card map-card">
        <WorldMap
          regions={regions}
          highlight={shown?.id}
          pin={mode === 'point' ? point : undefined}
          label={`World map. ${caption}`}
          onRegion={(id) => {
            setRegionId(id)
            setMode('region')
          }}
        />
        <p className="map-caption">{caption}</p>
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
                  {listName(r.name)}
                </option>
              ))}
            </select>
          </label>
          <div className="actions">
            <button type="button" disabled={!listRegion} onClick={() => listRegion && onPick({ kind: 'region', id: listRegion.id })}>
              Use this region
            </button>
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
                  { id: 'lat', label: 'Latitude', hint: 'north +, south −', value: lat, set: setLat, example: '10.5' },
                  { id: 'lon', label: 'Longitude', hint: 'east +, west −', value: lon, set: setLon, example: '106.7' },
                ].map((f) => (
                  <label key={f.id} className="field">
                    {f.label} (degrees)
                    <span className="degree-input">
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
                      <span className="degree-unit" aria-hidden="true">
                        °
                      </span>
                    </span>
                    <span className="field-hint">{f.hint}</span>
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
