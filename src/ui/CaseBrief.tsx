// Placeholder screen (Task C1). Task C3 adds the sentence and the hunch radio group.
import type { Hunch } from '../types'
import { PrimaryButton } from './PrimaryButton'
import { ScreenHeading } from './ScreenHeading'

type Props = { onConfirm: (hunch: Hunch) => void; onChange: () => void }

export function CaseBrief({ onConfirm, onChange }: Props) {
  return (
    <section>
      <ScreenHeading>Case brief</ScreenHeading>
      <PrimaryButton onClick={() => onConfirm('rise')}>Yes, show me the evidence</PrimaryButton>
      <button type="button" onClick={onChange}>Change</button>
    </section>
  )
}
