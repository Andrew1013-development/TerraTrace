import { useEffect, useRef, useState } from 'react'
import { liveOptions, narrow, nextQuestion, questions } from '../clues'
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
  const [moves, setMoves] = useState(0) // answers and restarts so far
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

  return (
    <section className="clues">
      <ScreenHeading>Gather the clues</ScreenHeading>

      {/* Keyed by moves, so each answer or restart remounts the cards and replays the rise-in animation. */}
      <div key={moves} className="clues-grid">
        <div className="card clues-main">
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
                    onClick={() => {
                      setSuspects(narrow(suspects, o))
                      setAsked([...asked, question.id])
                      setMoves(moves + 1)
                    }}
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
                  <button key={v.id} type="button" onClick={() => onVariable(v)}>
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {asked.length > 0 && (
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setSuspects(catalog)
                setAsked([])
                setMoves(moves + 1)
              }}
            >
              Start over
            </button>
          )}
        </div>

        <div className="card suspects">
          <p role="status" aria-live="polite" className="tile count">
            {left} {left === 1 ? 'suspect' : 'suspects'} left
          </p>
          {left > 1 && (
            <ul aria-label="Suspects" className="suspect-list">
              {suspects.map((v) => (
                <li key={v.id}>
                  <strong>{v.name}</strong>
                  <span>{v.definition}</span>
                </li>
              ))}
            </ul>
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
