import { useEffect, useReducer, useState } from 'react'
import { demoCases, getSeries, loadCatalog, loadLeads, loadRegions, type DataError } from './data'
import { placeName } from './place'
import type { Hunch, Lead, Place, Region, Series, Variable } from './types'
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
  | { type: 'goTo'; screen: Screen }
  | { type: 'seeVerdict' }
  | { type: 'restart' }
  | { type: 'toggle' }
  | { type: 'loaded'; variable: Variable; place: Place; series: Series }
  | { type: 'failed'; variable: Variable; place: Place; error: DataError }

export const initialState: CaseState = { screen: 'clues', deseasonalized: true, load: { status: 'idle' } }

export const STEPS: Screen[] = ['clues', 'scene', 'brief', 'evidence', 'verdict']

// How far the answers so far allow the user to go (an index into STEPS). Next and the rail stop here.
export function furthestStep(s: CaseState): number {
  if (!s.variable) return 0
  if (!s.place) return 1
  if (!s.hunch || s.load.status === 'idle') return 2
  return s.load.status === 'ready' ? 4 : 3
}

const samePlace = (a: Place | undefined, b: Place) =>
  !!a && (a.kind === 'region' ? b.kind === 'region' && a.id === b.id : b.kind === 'point' && a.lat === b.lat && a.lon === b.lon)

const IDLE: CaseState['load'] = { status: 'idle' }

// The transitions in architecture section 5. An event from the wrong screen is ignored.
export function caseReducer(state: CaseState, event: CaseEvent): CaseState {
  switch (event.type) {
    // Re-answering a step with the same answer keeps what follows; a different answer clears it.
    case 'chooseVariable':
      if (state.screen !== 'clues') return state
      if (state.variable?.id === event.variable.id) return { ...state, screen: 'scene' }
      return { ...state, screen: 'scene', variable: event.variable, place: undefined, hunch: undefined, load: IDLE }
    case 'openDemo':
      return state.screen === 'clues'
        ? { ...state, screen: 'brief', variable: event.variable, place: event.place, hunch: undefined, load: IDLE }
        : state
    case 'pickPlace':
      if (state.screen !== 'scene') return state
      if (samePlace(state.place, event.place)) return { ...state, screen: 'brief' }
      return { ...state, screen: 'brief', place: event.place, hunch: undefined, load: IDLE }
    case 'confirm':
      if (state.screen !== 'brief') return state
      // The series depends only on the variable and place, so a loaded one is kept.
      return {
        ...state,
        screen: 'evidence',
        hunch: event.hunch,
        load: state.load.status === 'ready' ? state.load : { status: 'loading' },
      }
    case 'change':
      return state.screen === 'brief'
        ? { ...state, screen: 'clues', variable: undefined, place: undefined, hunch: undefined, load: IDLE }
        : state
    case 'goTo': {
      const to = STEPS.indexOf(event.screen)
      return to <= furthestStep(state) && event.screen !== state.screen ? { ...state, screen: event.screen } : state
    }
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

type CaseFiles = { catalog: Variable[]; regions: Region[]; leads: Lead[] }

export default function App() {
  const [state, dispatch] = useReducer(caseReducer, initialState)
  const [files, setFiles] = useState<CaseFiles | DataError>()
  const [attempt, setAttempt] = useState(0)
  const { variable, place } = state
  const loading = state.load.status === 'loading'

  useEffect(() => {
    let live = true
    Promise.all([loadCatalog(), loadRegions(), loadLeads()]).then(
      ([catalog, regions, leads]) => live && setFiles({ catalog, regions, leads }),
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
      placeName={state.place && placeName(state.place, regions)}
      hunch={state.hunch}
      furthest={furthestStep(state)}
      onGoTo={(screen) => dispatch({ type: 'goTo', screen })}
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

function CurrentScreen({ state, dispatch, files: { catalog, regions, leads } }: ScreenProps) {
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
      // The reducer only reaches the scene with a variable set.
      if (!state.variable) return null
      return (
        <PlacePicker
          variable={state.variable}
          regions={regions}
          leads={leads}
          place={state.place}
          onPick={(place) => dispatch({ type: 'pickPlace', place })}
        />
      )
    case 'brief':
      // The reducer only reaches the brief with a variable and a place set.
      if (!state.variable || !state.place) return null
      return (
        <CaseBrief
          variable={state.variable}
          placeName={placeName(state.place, regions)}
          hunch={state.hunch}
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
      // "See the verdict" only appears once the series is ready, so all of these are set.
      if (!state.variable || !state.place || !state.hunch || !state.load.series) return null
      return (
        <VerdictView
          variable={state.variable}
          placeName={placeName(state.place, regions)}
          series={state.load.series}
          deseasonalized={state.deseasonalized}
          hunch={state.hunch}
          regions={regions}
          onRestart={() => dispatch({ type: 'restart' })}
        />
      )
  }
}
