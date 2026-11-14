// Placeholder screen (Task C1). Task C3 adds the sentence and the hunch radio group.
import type { Hunch } from '../types'
import { ScreenHeading } from './ScreenHeading'

type Props = { onConfirm: (hunch: Hunch) => void; onChange: () => void }

export function CaseBrief({ onConfirm, onChange }: Props) {
  return (
    <section>
      <ScreenHeading>Case brief</ScreenHeading>
      <button type="button" onClick={() => onConfirm('rise')}>Yes, show me the evidence</button>
      <button type="button" onClick={onChange}>Change</button>
    </section>
  )
}
