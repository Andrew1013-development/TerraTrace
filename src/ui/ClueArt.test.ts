import { artForOption, artForVariable } from './ClueArt'

const option = (label: string, tags: string[]) => ({ label, tags })

test('"X or Y" options show the art for each word, in order', () => {
  expect(artForOption(option('It feels hotter or colder', ['temperature']))).toEqual(['fire', 'snowflake'])
  expect(artForOption(option('It feels wetter or drier', ['rain', 'snow', 'humidity']))).toEqual(['rain', 'cracked'])
  expect(artForOption(option('It feels windier or calmer', ['wind']))).toEqual(['tree-gust', 'tree-calm'])
  expect(artForOption(option('It feels sunnier or cloudier', ['sun', 'cloud']))).toEqual(['sun', 'clouds'])
})

test('other options use their tag', () => {
  expect(artForOption(option('The air', ['air']))).toEqual(['wind'])
  expect(artForOption(option('Water', ['water']))).toEqual(['wave'])
  expect(artForOption(option('The land', ['land']))).toEqual(['mountain'])
  expect(artForOption(option('Living things', ['life']))).toEqual(['leaf'])
  expect(artForOption(option('Rain', ['rain']))).toEqual(['rain'])
  expect(artForOption(option('Snow', ['snow']))).toEqual(['snowflake'])
  expect(artForOption(option('Moisture in the air', ['humidity']))).toEqual(['mist'])
  expect(artForOption(option('A usual day', ['average']))).toEqual(['thermo-mid'])
  expect(artForOption(option('The hottest part of the day', ['maximum']))).toEqual(['thermo-high'])
  expect(artForOption(option('The coldest part of the night', ['minimum']))).toEqual(['thermo-low'])
  expect(artForOption(option('Something new', ['unknown']))).toEqual(['question'])
})

test('a variable shows one piece of art from its most specific tag, never the broad air/water/land one', () => {
  expect(artForVariable(['air', 'temperature', 'average'])).toEqual(['thermo-mid'])
  expect(artForVariable(['air', 'temperature', 'maximum'])).toEqual(['thermo-high'])
  expect(artForVariable(['air', 'temperature', 'minimum'])).toEqual(['thermo-low'])
  expect(artForVariable(['land', 'temperature'])).toEqual(['thermo-mid'])
  expect(artForVariable(['air', 'water', 'rain'])).toEqual(['rain'])
  expect(artForVariable(['air', 'water', 'snow'])).toEqual(['snowflake'])
  expect(artForVariable(['air', 'water', 'humidity'])).toEqual(['mist'])
  expect(artForVariable(['air', 'wind'])).toEqual(['wind'])
  expect(artForVariable(['air', 'sun'])).toEqual(['sun'])
  expect(artForVariable(['air', 'cloud'])).toEqual(['clouds'])
  expect(artForVariable(['air'])).toEqual(['wind'])
  expect(artForVariable([])).toEqual(['question'])
})
