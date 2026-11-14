// TEMPORARY: stands in for getSeries from src/data until Task A2 merges.
// Same signature; returns the SYNTHETIC sampleSeries. Swap the App import to './data' and delete this file then.
import { sampleSeries } from '../fixtures'
import type { Place, Series, Variable } from '../types'

export function getSeries(_variable: Variable, _place: Place): Promise<Series> {
  return Promise.resolve(sampleSeries)
}
