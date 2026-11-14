// Placeholder screen (Task C1). Task C5 builds the real picker.
import type { Place, Region } from '../types'
import { ScreenHeading } from './ScreenHeading'

export function PlacePicker({ regions, onPick }: { regions: Region[]; onPick: (place: Place) => void }) {
  return (
    <section>
      <ScreenHeading>Pick the scene</ScreenHeading>
      <button type="button" onClick={() => onPick({ kind: 'region', id: regions[0].id })}>
        Use this region
      </button>
    </section>
  )
}
