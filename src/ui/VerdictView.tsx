// Placeholder screen (Task C1). Task C6 adds the verdict, caveat and hunch line.
import { PrimaryButton } from './PrimaryButton'
import { ScreenHeading } from './ScreenHeading'

export function VerdictView({ onRestart }: { onRestart: () => void }) {
  return (
    <section>
      <ScreenHeading>The verdict</ScreenHeading>
      <PrimaryButton onClick={onRestart}>Open a new case</PrimaryButton>
    </section>
  )
}
