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
  expect(initialState).toEqual({ screen: 'clues', deseasonalized: true, period: null, load: { status: 'idle' } })
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
    { screen: 'verdict', variable: v, place: p, hunch: 'none', deseasonalized: false, period: { start: 1990, end: 2010 }, load: { status: 'loading' } },
    { type: 'restart' },
  )
  expect(s).toEqual(initialState)
})

test('an event that does not belong to the current screen changes nothing', () => {
  expect(caseReducer(initialState, { type: 'seeVerdict' })).toBe(initialState)
})

// Navigation (rail steps, Previous and Next): moving back keeps answers; changing an answer clears what follows it.
import { furthestStep } from './App'

const done = {
  screen: 'verdict' as const,
  variable: v,
  place: p,
  hunch: 'rise' as const,
  deseasonalized: true,
  period: null,
  load: { status: 'ready' as const, series: sampleSeries },
}

test('furthestStep counts how far the answers so far allow', () => {
  expect(furthestStep(initialState)).toBe(0)
  expect(furthestStep({ ...initialState, variable: v })).toBe(1)
  expect(furthestStep({ ...initialState, variable: v, place: p })).toBe(2)
  expect(furthestStep({ ...initialState, variable: v, place: p, hunch: 'rise', load: { status: 'loading' } })).toBe(3)
  expect(furthestStep(done)).toBe(4)
})

test('goTo an earlier step moves there and keeps every answer', () => {
  const s = caseReducer(done, { type: 'goTo', screen: 'scene' })
  expect(s).toEqual({ ...done, screen: 'scene' })
})

test('goTo a step not reached yet changes nothing', () => {
  const atScene = { ...initialState, screen: 'scene' as const, variable: v }
  expect(caseReducer(atScene, { type: 'goTo', screen: 'brief' })).toBe(atScene)
})

test('picking a different place clears the hunch and the series', () => {
  const back = caseReducer(done, { type: 'goTo', screen: 'scene' })
  const other: Place = { kind: 'region', id: 'arctic-canada' }
  const s = caseReducer(back, { type: 'pickPlace', place: other })
  expect(s).toMatchObject({ screen: 'brief', variable: v, place: other, hunch: undefined, load: { status: 'idle' } })
  expect(furthestStep(s)).toBe(2)
})

test('confirming the same place again keeps the later answers', () => {
  const back = caseReducer(done, { type: 'goTo', screen: 'scene' })
  const s = caseReducer(back, { type: 'pickPlace', place: { kind: 'region', id: p.kind === 'region' ? p.id : '' } })
  expect(s).toMatchObject({ screen: 'brief', hunch: 'rise', load: { status: 'ready' } })
})

test('choosing a different variable clears the place, hunch and series', () => {
  const back = caseReducer(done, { type: 'goTo', screen: 'clues' })
  const s = caseReducer(back, { type: 'chooseVariable', variable: sampleCatalog[1] })
  expect(s).toMatchObject({ screen: 'scene', variable: sampleCatalog[1], place: undefined, hunch: undefined, load: { status: 'idle' } })
})

test('a new hunch on a revisited brief keeps the loaded series', () => {
  const back = caseReducer(done, { type: 'goTo', screen: 'brief' })
  const s = caseReducer(back, { type: 'confirm', hunch: 'fall' })
  expect(s).toMatchObject({ screen: 'evidence', hunch: 'fall', load: { status: 'ready', series: sampleSeries } })
})

test('setPeriod sets the years and keeps the loaded series (no refetch)', () => {
  const s = caseReducer({ ...done, screen: 'evidence' }, { type: 'setPeriod', period: { start: 1995, end: 2025 } })
  expect(s.period).toEqual({ start: 1995, end: 2025 })
  expect(s.load).toBe(done.load)
  expect(caseReducer(s, { type: 'setPeriod', period: null }).period).toBeNull()
})

test('the period resets when the variable or place changes, and on Change', () => {
  const narrowed = { ...done, period: { start: 1995, end: 2025 } }
  const variable = caseReducer({ ...narrowed, screen: 'clues' }, { type: 'chooseVariable', variable: sampleCatalog[1] })
  const place = caseReducer({ ...narrowed, screen: 'scene' }, { type: 'pickPlace', place: { kind: 'region', id: 'other' } })
  const change = caseReducer({ ...narrowed, screen: 'brief' }, { type: 'change' })
  const demo = caseReducer({ ...narrowed, screen: 'clues' }, { type: 'openDemo', variable: v, place: p })
  expect([variable, place, change, demo].map((s) => s.period)).toEqual([null, null, null, null])
})
