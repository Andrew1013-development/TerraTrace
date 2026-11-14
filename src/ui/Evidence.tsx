// Placeholder screen (Task C1). Task C2 adds the chart, statistics and toggle.
import { PrimaryButton } from './PrimaryButton'
import { ScreenHeading } from './ScreenHeading'

export function Evidence({ onNext }: { onNext: () => void }) {
  return (
    <section>
      <ScreenHeading>The evidence</ScreenHeading>
      <PrimaryButton onClick={onNext}>See the verdict</PrimaryButton>
    </section>
  )
}
