// TEMPORARY (card C2, trap 2): until Task B2 lands, the stats functions are stubs that throw.
// These fall back to the SYNTHETIC sampleResult so the Evidence screen renders. Delete this file when
// B2 merges and call analyze, deseasonalize and countValid from '../stats' directly.
import { sampleResult } from '../fixtures'
import { analyze, countValid, deseasonalize } from '../stats'
import type { Series, TrendResult } from '../types'

export function analyzeOrSample(series: Series, deseasonalized: boolean): TrendResult | null {
  try {
    return analyze(series, deseasonalized)
  } catch {
    return { ...sampleResult, deseasonalized }
  }
}

export function plottedValues(series: Series, deseasonalized: boolean): (number | null)[] {
  if (!deseasonalized) return series.values
  try {
    return deseasonalize(series)
  } catch {
    return series.values
  }
}

export function validCount(series: Series): number {
  try {
    return countValid(series)
  } catch {
    return series.values.length
  }
}
