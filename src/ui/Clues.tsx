// Placeholder screen (Task C1). Task C4 builds the real clue flow from these props.
import type { DemoCase, Variable } from '../types'
import { PrimaryButton } from './PrimaryButton'
import { ScreenHeading } from './ScreenHeading'

type Props = {
  catalog: Variable[]
  demoCases: DemoCase[]
  onVariable: (v: Variable) => void
  onDemo: (c: DemoCase) => void
}

export function Clues({ catalog, demoCases, onVariable, onDemo }: Props) {
  return (
    <section>
      <ScreenHeading>Gather the clues</ScreenHeading>
      <PrimaryButton onClick={() => onVariable(catalog[0])}>Continue</PrimaryButton>
      {demoCases.map((c) => (
        <button key={c.id} type="button" onClick={() => onDemo(c)}>
          Open a solved case
        </button>
      ))}
    </section>
  )
}
