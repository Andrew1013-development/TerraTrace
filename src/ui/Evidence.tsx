// Placeholder screen (Task C1). Task C2 adds the chart, statistics and toggle.
import { ScreenHeading } from './ScreenHeading'

export function Evidence({ onNext }: { onNext: () => void }) {
  return (
    <section>
      <ScreenHeading>The evidence</ScreenHeading>
      <button type="button" onClick={onNext}>See the verdict</button>
    </section>
  )
}
