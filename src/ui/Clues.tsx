import { useState } from 'react'
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
  const question = nextQuestion(suspects, asked, questions)
  const left = suspects.length

  return (
    <section className="clues">
      <ScreenHeading>Gather the clues</ScreenHeading>

      <div className="clues-grid">
        <div className="card clues-main">
          {question ? (
            <fieldset className="question">
              <legend>{question.text}</legend>
              <div className="options">
                {liveOptions(question, suspects).map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => {
                      setSuspects(narrow(suspects, o))
                      setAsked([...asked, question.id])
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
              <p className="solved-name">{suspects[0].name}</p>
              <p>{suspects[0].definition}</p>
              <PrimaryButton onClick={() => onVariable(suspects[0])}>Continue</PrimaryButton>
            </div>
          ) : (
            <div className="pick">
              <p className="question-text">Which one fits your question best?</p>
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
