import { useEffect, useRef, useState } from 'react'
import { liveOptions, narrow, nextQuestion, questions } from '../clues'
import { artFor, ClueArt } from './ClueArt'
import type { DemoCase, Variable } from '../types'
import { PrimaryButton } from './PrimaryButton'
import { ScreenHeading } from './ScreenHeading'

type CluesProps = {
  catalog: Variable[]
  demoCases: DemoCase[]
  onVariable: (v: Variable) => void
  onDemo: (c: DemoCase) => void
}

export function Clues({ catalog, demoCases, onVariable, onDemo }: CluesProps) {
  const [suspects, setSuspects] = useState(catalog)
  const [asked, setAsked] = useState<string[]>([])
  const [moves, setMoves] = useState(0) // answers so far
  const [hovered, setHovered] = useState<string[]>() // tags of the hovered or focused choice
  const [popping, setPopping] = useState(false)
  const question = nextQuestion(suspects, asked, questions)
  const left = suspects.length

  // After each answer or restart, focus what comes next, so keyboard and screen reader users keep their place.
  const next = useRef<HTMLElement | null>(null)
  const setNext = (el: HTMLElement | null) => {
    next.current = el
  }
  useEffect(() => {
    if (moves > 0) next.current?.focus()
  }, [moves])

  // A click first squeezes and pops the illustration, then applies; without motion it applies at once.
  const withPop = (apply: () => void) => {
    if (popping) return
    const motion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: no-preference)').matches
    if (!motion) return apply()
    setPopping(true)
    setTimeout(() => {
      setPopping(false)
      setHovered(undefined)
      apply()
    }, 320)
  }
  const hover = (tags: string[]) => ({
    onMouseEnter: () => setHovered(tags),
    onFocus: () => setHovered(tags),
    onMouseLeave: () => !popping && setHovered(undefined),
    onBlur: () => !popping && setHovered(undefined),
  })
  const art = hovered ? artFor(hovered) : left === 1 ? artFor(suspects[0].tags) : artFor([])

  return (
    <section className="clues">
      <ScreenHeading>Gather the clues</ScreenHeading>

      {/* Keyed by moves, so each answer or restart remounts the cards and replays the rise-in animation. */}
      <div key={moves} className="clues-grid">
        <div className="card clues-main">
          <div className="clues-body">
          {question ? (
            <fieldset className="question">
              <legend ref={setNext} tabIndex={-1}>
                {question.text}
              </legend>
              <div className="options">
                {liveOptions(question, suspects).map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    {...hover(o.tags)}
                    onClick={() =>
                      withPop(() => {
                        setSuspects(narrow(suspects, o))
                        setAsked([...asked, question.id])
                        setMoves(moves + 1)
                      })
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : left === 1 ? (
            <div className="solved">
              <p className="eyebrow">Your variable</p>
              <p ref={setNext} tabIndex={-1} className="solved-name">
                {suspects[0].name}
              </p>
              <p>{suspects[0].definition}</p>
              <PrimaryButton onClick={() => onVariable(suspects[0])}>Continue</PrimaryButton>
            </div>
          ) : (
            <div className="pick">
              <p ref={setNext} tabIndex={-1} className="question-text">
                Which one fits your question best?
              </p>
              <div className="options">
                {suspects.map((v) => (
                  <button key={v.id} type="button" {...hover(v.tags)} onClick={() => withPop(() => onVariable(v))}>
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>
          <ClueArt names={art} popping={popping} />
        </div>

        <div className="card suspects">
          <p role="status" aria-live="polite" className="tile count">
            {left} {left === 1 ? 'suspect' : 'suspects'} left
          </p>
          {left > 1 && (
            // Scrolls inside a fixed height, so a long list doesn't stretch the page; focusable for keyboard scrolling.
            <div className="suspect-scroll" tabIndex={0} role="region" aria-label="Suspect list">
              <ul aria-label="Suspects" className="suspect-list">
                {suspects.map((v) => (
                  <li key={v.id}>
                    <strong>{v.name}</strong>
                    <span>{v.definition}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {demoCases.length > 0 && (
        <section className="solved-cases" aria-labelledby="solved-cases-heading">
          <h2 id="solved-cases-heading">Open a solved case</h2>
          <div className="solved-case-list">
            {demoCases.map((c) => (
              <button key={c.id} type="button" className="solved-case" onClick={() => onDemo(c)}>
                {c.title}
              </button>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}
