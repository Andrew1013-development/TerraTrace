// Placeholder screen (Task C1). Task C4 builds the real clue flow from these props.
import type { DemoCase, Variable } from '../types'
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
      <button type="button" onClick={() => onVariable(catalog[0])}>Continue</button>
      {demoCases.map((c) => (
        <button key={c.id} type="button" onClick={() => onDemo(c)}>
          Open a solved case
        </button>
      ))}
    </section>
  )
}
