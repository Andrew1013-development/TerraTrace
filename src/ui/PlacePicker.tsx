import { useEffect, useState, type FormEvent } from 'react'
import { loadCountries, loadRegionShapes, type Countries, type RegionShapes } from '../data'
import { countryAt, leadsFor, listName, parsePoint, placeName, regionAt } from '../place'
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
  // true while the map shows a valid place other than the saved one, so Next and the rail wait for a confirm button
  onChanged?: (changed: boolean) => void
}

const COORD_ERROR = 'Enter a latitude from -90 to 90 and a longitude from -180 to 180.'

// A typed point outside every region is named by its country. Without the country file (still loading, or failed)
// there is no name, so placeName shows the coordinates; "at sea" is said only when the file has no country there.
function spotName(lat: number, lon: number, countries: Countries | null | undefined): string | undefined {
  if (!countries) return undefined
  const country = countryAt(lat, lon, countries)
  return country ? `one spot in ${country}` : 'one spot at sea'
}

export function PlacePicker({ variable, regions, leads, place, onPick, onChanged }: PlacePickerProps) {
  const [regionId, setRegionId] = useState(place?.kind === 'region' ? place.id : '')
  const [lat, setLat] = useState(place?.kind === 'point' ? String(place.lat) : '')
  const [lon, setLon] = useState(place?.kind === 'point' ? String(place.lon) : '')
  const [invalid, setInvalid] = useState(false)
  const [countries, setCountries] = useState<Countries | null>() // null: the file failed to load
  // The outlines the globe draws; a typed point is in a region when it is inside that outline (boxes until loaded).
  const [shapes, setShapes] = useState<RegionShapes>()
  // The map follows whichever the user touched last: the region list, or the typed point.
  const [mode, setMode] = useState<'region' | 'point'>(place?.kind === 'point' ? 'point' : 'region')

  const pointsAllowed = variable.powerParameter !== null
  const typed = pointsAllowed ? parsePoint(lat, lon) : null
  const point = typed?.kind === 'point' ? typed : undefined
  const pointRegion = point ? regionAt(point.lat, point.lon, regions, shapes) : undefined
  const listRegion = regions.find((r) => r.id === regionId)
  const shown = mode === 'point' ? pointRegion : listRegion
  const regionLeads = shown ? leadsFor(leads, shown.id, variable.id) : []
  const changed =
    mode === 'region'
      ? !!listRegion && !(place?.kind === 'region' && place.id === listRegion.id)
      : !!point && !(place?.kind === 'point' && place.lat === point.lat && place.lon === point.lon)

  useEffect(() => onChanged?.(changed), [changed, onChanged])
  useEffect(() => () => onChanged?.(false), [onChanged]) // leaving the scene clears it

  useEffect(() => {
    let live = true
    loadRegionShapes().then((s) => live && setShapes(s), () => {}) // cached by src/data; without it, boxes are used
    return () => {
      live = false
    }
  }, [])

  // Country names are only needed for a point outside every region; load them then (cached by src/data).
  useEffect(() => {
    if (mode === 'point' && point && !pointRegion && countries === undefined) loadCountries().then(setCountries, () => setCountries(null))
  }, [mode, point, pointRegion, countries])

  const caption =
    mode === 'point' && point
      ? pointRegion
        ? `This point is inside ${pointRegion.name}, so the case uses the data for ${pointRegion.name}: an average of 9 points sampled inside the region, which may not include this exact spot.`
        : `This point is outside the prepared regions, so the case uses live data for ${
            spotName(point.lat, point.lon, countries) ?? placeName(point, regions)
          }.`
      : listRegion
        ? `Highlighted: ${listRegion.name}. The case uses an average of 9 points sampled inside this region.`
        : 'Pick a region, or type coordinates, to see it on the map.'

  const submitPoint = async (e: FormEvent) => {
    e.preventDefault()
    const p = parsePoint(lat, lon)
    if (!p || p.kind !== 'point') return setInvalid(true)
    const inside = regionAt(p.lat, p.lon, regions, shapes ?? (await loadRegionShapes().catch(() => undefined)))
    if (inside) return onPick({ kind: 'region', id: inside.id })
    // A failed load is tried once more here, in case the connection is back.
    const name = spotName(p.lat, p.lon, countries || (await loadCountries().catch(() => null)))
    onPick(name ? { ...p, name } : p)
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
