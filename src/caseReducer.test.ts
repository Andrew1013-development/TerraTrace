import { caseReducer, initialState } from './App'
import { sampleCatalog, sampleRegions } from './fixtures'
import type { Place } from './types'

const v = sampleCatalog[0]
const p: Place = { kind: 'region', id: sampleRegions[0].id }

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
