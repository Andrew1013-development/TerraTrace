import { useReducer } from 'react'
import { sampleCatalog, sampleRegions } from './fixtures'
import type { DemoCase, Hunch, Place, Series, Variable } from './types'
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
  // shortcut: error is a plain Error until Task A2 exports DataError; switch the type then.
  load: { status: 'idle' | 'loading' | 'ready' | 'error'; series?: Series; error?: Error }
}

export type CaseEvent =
  | { type: 'chooseVariable'; variable: Variable }
  | { type: 'openDemo'; variable: Variable; place: Place }
  | { type: 'pickPlace'; place: Place }
  | { type: 'confirm'; hunch: Hunch }
  | { type: 'change' }
  | { type: 'seeVerdict' }
  | { type: 'restart' }

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
  }
}

// shortcut: fixtures stand in for loadCatalog, loadRegions and demoCases until Tasks A3 and A7 land.
const catalog = sampleCatalog
const regions = sampleRegions
const demoCases: DemoCase[] = [
  { id: 'synthetic-demo', title: 'Synthetic demo case', variableId: catalog[0].id, place: { kind: 'region', id: regions[0].id } },
]

// shortcut: stands in for placeName from src/place until Task B4 lands; delete then.
function tempPlaceName(place: Place | undefined): string | undefined {
  if (!place) return undefined
  if (place.kind === 'point') return `${place.lat.toFixed(2)}, ${place.lon.toFixed(2)}`
  return regions.find((r) => r.id === place.id)?.name ?? place.id
}

export default function App() {
  const [state, dispatch] = useReducer(caseReducer, initialState)

  return (
    <Shell
      screen={state.screen}
      variable={state.variable}
      placeName={tempPlaceName(state.place)}
      hunch={state.hunch}
    >
      <CurrentScreen state={state} dispatch={dispatch} />
    </Shell>
  )
}

function CurrentScreen({ state, dispatch }: { state: CaseState; dispatch: (e: CaseEvent) => void }) {
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
      return (
        <CaseBrief
          onConfirm={(hunch) => dispatch({ type: 'confirm', hunch })}
          onChange={() => dispatch({ type: 'change' })}
        />
      )
    case 'evidence':
      return <Evidence onNext={() => dispatch({ type: 'seeVerdict' })} />
    case 'verdict':
      return <VerdictView onRestart={() => dispatch({ type: 'restart' })} />
  }
}
