import { caseReducer, initialState } from './App'
import { sampleCatalog, sampleRegions, sampleSeries } from './fixtures'
import type { Place } from './types'

const v = sampleCatalog[0]
const p: Place = { kind: 'region', id: sampleRegions[0].id }
const loadingCase = { ...initialState, screen: 'evidence' as const, variable: v, place: p, load: { status: 'loading' as const } }

test('a response for the current variable and place is stored as ready', () => {
  const s = caseReducer(loadingCase, { type: 'loaded', variable: v, place: p, series: sampleSeries })
  expect(s.load).toEqual({ status: 'ready', series: sampleSeries })
})

test('a late response for an old selection is ignored', () => {
  const old = sampleCatalog[1]
  expect(caseReducer(loadingCase, { type: 'loaded', variable: old, place: p, series: sampleSeries })).toBe(loadingCase)
  const error = Object.assign(new Error('x'), { kind: 'network' as const })
  expect(caseReducer(loadingCase, { type: 'failed', variable: v, place: { kind: 'region', id: 'other' }, error })).toBe(
    loadingCase,
  )
})

test('a failure stays on the same screen with the error', () => {
  const error = Object.assign(new Error('x'), { kind: 'network' as const })
  const s = caseReducer(loadingCase, { type: 'failed', variable: v, place: p, error })
  expect(s).toMatchObject({ screen: 'evidence', load: { status: 'error', error } })
})

test('the toggle flips the seasonal setting without touching the load', () => {
  const ready = { ...loadingCase, load: { status: 'ready' as const, series: sampleSeries } }
  const s = caseReducer(ready, { type: 'toggle' })
  expect(s.deseasonalized).toBe(false)
  expect(s.load).toBe(ready.load)
})

test('starts on clues with the seasonal toggle on and nothing loaded', () => {
  expect(initialState).toEqual({ screen: 'clues', deseasonalized: true, load: { status: 'idle' } })
})

test('the brief confirm stores the hunch and starts loading', () => {
  const s = caseReducer({ ...initialState, screen: 'brief', variable: v, place: p }, { type: 'confirm', hunch: 'rise' })
  expect(s).toMatchObject({ screen: 'evidence', hunch: 'rise', load: { status: 'loading' } })
})

test('Change clears variable, place and hunch', () => {
  const s = caseReducer({ ...initialState, screen: 'brief', variable: v, place: p, hunch: 'fall' }, { type: 'change' })
  expect(s.screen).toBe('clues')
  expect(s.variable).toBeUndefined()
  expect(s.place).toBeUndefined()
  expect(s.hunch).toBeUndefined()
})

test('restart resets everything', () => {
  const s = caseReducer(
    { screen: 'verdict', variable: v, place: p, hunch: 'none', deseasonalized: false, load: { status: 'loading' } },
    { type: 'restart' },
  )
  expect(s).toEqual(initialState)
})

test('an event that does not belong to the current screen changes nothing', () => {
  expect(caseReducer(initialState, { type: 'seeVerdict' })).toBe(initialState)
})

// Integration report, defect 1: a failed load needs a way back to the scene.
test('changePlace after a failed load goes back to the scene and keeps the variable', () => {
  const error = Object.assign(new Error('x'), { kind: 'network' as const })
  const failed = { ...loadingCase, hunch: 'rise' as const, load: { status: 'error' as const, error } }
  expect(caseReducer(failed, { type: 'changePlace' })).toEqual({
    ...initialState,
    screen: 'scene',
    variable: v,
    place: undefined,
    hunch: undefined,
  })
})

test('changePlace is ignored unless the evidence screen shows an error', () => {
  const ready = { ...loadingCase, load: { status: 'ready' as const, series: sampleSeries } }
  for (const s of [loadingCase, ready, initialState, { ...loadingCase, screen: 'verdict' as const }]) {
    expect(caseReducer(s, { type: 'changePlace' })).toBe(s)
  }
})

test('a late failure after changePlace is ignored', () => {
  const error = Object.assign(new Error('x'), { kind: 'network' as const })
  const back = caseReducer({ ...loadingCase, load: { status: 'error', error } }, { type: 'changePlace' })
  expect(caseReducer(back, { type: 'failed', variable: v, place: p, error })).toBe(back)
})
