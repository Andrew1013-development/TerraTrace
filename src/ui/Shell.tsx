import { useEffect, useState, type ReactNode } from 'react'
import type { Screen } from '../App'
import type { Hunch, Variable } from '../types'
import fullLogo from './brand/space-apps-color-white.svg'
import smallLogo from './brand/space-apps-small-white.svg'

type ShellProps = {
  screen: Screen
  variable?: Variable
  placeName?: string
  hunch?: Hunch
  children: ReactNode
}

const STEPS: { screen: Screen; label: string }[] = [
  { screen: 'clues', label: 'Clues' },
  { screen: 'scene', label: 'Scene' },
  { screen: 'brief', label: 'Brief' },
  { screen: 'evidence', label: 'Evidence' },
  { screen: 'verdict', label: 'Verdict' },
]

const HUNCH_TEXT: Record<Hunch, string> = {
  rise: 'Hunch: rising',
  fall: 'Hunch: falling',
  none: 'Hunch: no change',
}

const WIDE = '(min-width: 768px)'

function useWide() {
  const query = typeof window.matchMedia === 'function' ? window.matchMedia(WIDE) : undefined
  const [wide, setWide] = useState(query?.matches ?? true)
  useEffect(() => {
    if (!query) return
    const onChange = (e: MediaQueryListEvent) => setWide(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [query])
  return wide
}

export function Shell({ screen, variable, placeName, hunch, children }: ShellProps) {
  const wide = useWide()
  const [open, setOpen] = useState(wide)
  useEffect(() => setOpen(wide), [wide])

  const currentIndex = STEPS.findIndex((s) => s.screen === screen)
  const values: Partial<Record<Screen, string>> = {
    clues: variable?.name,
    scene: placeName,
    brief: hunch ? HUNCH_TEXT[hunch] : undefined,
  }
  const context = [variable?.name, placeName, variable && `since ${variable.startYear}`].filter(Boolean).join(' · ')

  return (
    <div className="shell">
      <aside className="rail" aria-label="Case progress">
        <div className="rail-brand">
          <img src={smallLogo} alt="" width={28} height={28} />
          <span className="rail-name">Case File</span>
          <span className="rail-strip-step">
            Step {currentIndex + 1} of 5: {STEPS[currentIndex].label}
          </span>
        </div>
        <details className="rail-details" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
          <summary>Case so far</summary>
          <ol className="rail-steps">
            {STEPS.map((step, i) => {
              const current = i === currentIndex
              const reached = i < currentIndex || values[step.screen] !== undefined
              const value = current ? 'You are here' : reached ? values[step.screen] : 'Not yet'
              const state = current ? 'current' : reached ? 'done' : 'todo'
              return (
                <li key={step.screen} className={`rail-step is-${state}`} aria-current={current ? 'step' : undefined}>
                  <span className="rail-step-label">
                    {i + 1} {step.label}
                  </span>
                  {value && <span className="rail-step-value underline underline-yellow">{value}</span>}
                </li>
              )
            })}
          </ol>
        </details>
      </aside>
      <main className="panel">
        {context && <p className="context">{context}</p>}
        {children}
      </main>
      <footer className="built-for">
        <span>Built for</span>
        <img src={fullLogo} alt="NASA Space Apps Challenge" width={150} />
      </footer>
    </div>
  )
}
