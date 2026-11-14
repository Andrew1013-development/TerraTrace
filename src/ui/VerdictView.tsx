// Placeholder screen (Task C1). Task C6 adds the verdict, caveat and hunch line.
import { ScreenHeading } from './ScreenHeading'

export function VerdictView({ onRestart }: { onRestart: () => void }) {
  return (
    <section>
      <ScreenHeading>The verdict</ScreenHeading>
      <button type="button" onClick={onRestart}>Open a new case</button>
    </section>
  )
}
