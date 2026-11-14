import { artFor } from './ClueArt'

test('artFor maps tags to art, cycling for several, with a question mark when none match', () => {
  expect(artFor(['temperature'])).toEqual(['fire', 'snowflake'])
  expect(artFor(['sun', 'cloud'])).toEqual(['sun', 'cloud'])
  expect(artFor(['air'])).toEqual(['wind'])
  expect(artFor(['land'])).toEqual(['mountain'])
  expect(artFor(['rain', 'snow', 'humidity'])).toEqual(['rain', 'snowflake', 'mist'])
  expect(artFor(['unknown-tag'])).toEqual(['question'])
  expect(artFor([])).toEqual(['question'])
})
