import { useEffect, useReducer, useState } from 'react'
import { demoCases, getSeries, loadCatalog, loadRegions, type DataError } from './data'
import type { Hunch, Place, Region, Series, Variable } from './types'
import { CaseBrief } from './ui/CaseBrief'
import { Clues } from './ui/Clues'
import { Evidence } from './ui/Evidence'
import { PlacePicker } from './ui/PlacePicker'
import { Shell } from './ui/Shell'
import { VerdictView } from './ui/VerdictView'
import './styles/app.css'

export type Screen = 'clues' | 'scene' | 'brief' | 'evidence' | 'verdict'

export type CaseState = {
  screen: Screen
  variable?: Variable
  place?: Place
  hunch?: Hunch
  deseasonalized: boolean
  load: { status: 'idle' | 'loading' | 'ready' | 'error'; series?: Series; error?: DataError }
}

export type CaseEvent =
  | { type: 'chooseVariable'; variable: Variable }
  | { type: 'openDemo'; variable: Variable; place: Place }
  | { type: 'pickPlace'; place: Place }
  | { type: 'confirm'; hunch: Hunch }
  | { type: 'change' }
  | { type: 'seeVerdict' }
  | { type: 'restart' }
  | { type: 'toggle' }
  | { type: 'loaded'; variable: Variable; place: Place; series: Series }
  | { type: 'failed'; variable: Variable; place: Place; error: DataError }

export const initialState: CaseState = { screen: 'clues', deseasonalized: true, load: { status: 'idle' } }

// The transitions in architecture section 5. An event from the wrong screen is ignored.
export function caseReducer(state: CaseState, event: CaseEvent): CaseState {
  switch (event.type) {
    case 'chooseVariable':
      return state.screen === 'clues' ? { ...state, screen: 'scene', variable: event.variable } : state
    case 'openDemo':
      return state.screen === 'clues'
        ? { ...state, screen: 'brief', variable: event.variable, place: event.place }
        : state
    case 'pickPlace':
      return state.screen === 'scene' ? { ...state, screen: 'brief', place: event.place } : state
    case 'confirm':
      return state.screen === 'brief'
        ? { ...state, screen: 'evidence', hunch: event.hunch, load: { status: 'loading' } }
        : state
    case 'change':
      return state.screen === 'brief'
        ? { ...state, screen: 'clues', variable: undefined, place: undefined, hunch: undefined }
        : state
    case 'seeVerdict':
      return state.screen === 'evidence' ? { ...state, screen: 'verdict' } : state
    case 'restart':
      return state.screen === 'verdict' ? initialState : state
    case 'toggle':
      return { ...state, deseasonalized: !state.deseasonalized }
    case 'loaded':
    case 'failed': {
      // A response for a variable or place that is no longer selected is ignored (section 5).
      if (event.variable !== state.variable || event.place !== state.place) return state
      return event.type === 'loaded'
        ? { ...state, load: { status: 'ready', series: event.series } }
        : { ...state, load: { status: 'error', error: event.error } }
    }
  }
}

type CaseFiles = { catalog: Variable[]; regions: Region[] }

// shortcut: stands in for placeName from src/place until Task B4 lands; delete then.
function tempPlaceName(place: Place | undefined, regions: Region[]): string | undefined {
  if (!place) return undefined
  if (place.kind === 'point') return `${place.lat.toFixed(2)}, ${place.lon.toFixed(2)}`
  return regions.find((r) => r.id === place.id)?.name ?? place.id
}

export default function App() {
  const [state, dispatch] = useReducer(caseReducer, initialState)
  const [files, setFiles] = useState<CaseFiles | DataError>()
  const [attempt, setAttempt] = useState(0)
  const { variable, place } = state
  const loading = state.load.status === 'loading'

  useEffect(() => {
    let live = true
    Promise.all([loadCatalog(), loadRegions()]).then(
      ([catalog, regions]) => live && setFiles({ catalog, regions }),
      (error: DataError) => live && setFiles(error),
    )
    return () => {
      live = false
    }
  }, [attempt])

  useEffect(() => {
    if (!loading || !variable || !place) return
    getSeries(variable, place).then(
      (series) => dispatch({ type: 'loaded', variable, place, series }),
      (error: DataError) => dispatch({ type: 'failed', variable, place, error }),
    )
  }, [loading, variable, place])

  const regions = files && !(files instanceof Error) ? files.regions : []

  return (
    <Shell
      screen={state.screen}
      variable={state.variable}
      placeName={tempPlaceName(state.place, regions)}
      hunch={state.hunch}
    >
      {files === undefined && <p role="status">Loading the case files…</p>}
      {files instanceof Error && (
        <>
          <p role="alert" className="error">
            {files.message}
          </p>
          <button
            type="button"
            onClick={() => {
              setFiles(undefined)
              setAttempt((a) => a + 1)
            }}
          >
            Try again
          </button>
        </>
      )}
      {files && !(files instanceof Error) && <CurrentScreen state={state} dispatch={dispatch} files={files} />}
    </Shell>
  )
}

type ScreenProps = { state: CaseState; dispatch: (e: CaseEvent) => void; files: CaseFiles }

function CurrentScreen({ state, dispatch, files: { catalog, regions } }: ScreenProps) {
  switch (state.screen) {
    case 'clues':
      return (
        <Clues
          catalog={catalog}
          demoCases={demoCases}
          onVariable={(variable) => dispatch({ type: 'chooseVariable', variable })}
          onDemo={(c) => {
            const variable = catalog.find((v) => v.id === c.variableId)
            if (variable) dispatch({ type: 'openDemo', variable, place: c.place })
          }}
        />
      )
    case 'scene':
      return <PlacePicker regions={regions} onPick={(place) => dispatch({ type: 'pickPlace', place })} />
    case 'brief':
      // The reducer only reaches the brief with a variable and a place set.
      if (!state.variable || !state.place) return null
      return (
        <CaseBrief
          variable={state.variable}
          placeName={tempPlaceName(state.place, regions) ?? ''}
          onConfirm={(hunch) => dispatch({ type: 'confirm', hunch })}
          onChange={() => dispatch({ type: 'change' })}
        />
      )
    case 'evidence':
      return (
        <Evidence
          load={state.load}
          deseasonalized={state.deseasonalized}
          onToggle={() => dispatch({ type: 'toggle' })}
          onNext={() => dispatch({ type: 'seeVerdict' })}
        />
      )
    case 'verdict':
      return <VerdictView onRestart={() => dispatch({ type: 'restart' })} />
  }
}
