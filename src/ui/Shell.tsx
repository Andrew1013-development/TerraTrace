import { useEffect, useState, type ReactNode } from 'react'
import type { Screen } from '../App'
import { listName } from '../place'
import type { Hunch, Variable } from '../types'
import fullLogo from './brand/space-apps-color-white.svg'
import { ChartIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardIcon, GlobeIcon, ScaleIcon, SearchIcon } from './icons'
import smallLogo from './brand/space-apps-small-white.svg'

type ShellProps = {
  screen: Screen
  variable?: Variable
  placeName?: string
  hunch?: Hunch
  furthest?: number // index of the furthest step the answers allow; defaults to the current step
  onGoTo?: (screen: Screen) => void
  children: ReactNode
}

const STEPS: { screen: Screen; label: string; Icon: (p: { size?: number }) => ReactNode }[] = [
  { screen: 'clues', label: 'Clues', Icon: SearchIcon },
  { screen: 'scene', label: 'Scene', Icon: GlobeIcon },
  { screen: 'brief', label: 'Brief', Icon: ClipboardIcon },
  { screen: 'evidence', label: 'Evidence', Icon: ChartIcon },
  { screen: 'verdict', label: 'Verdict', Icon: ScaleIcon },
]

const HUNCH_TEXT: Record<Hunch, string> = {
  rise: 'Hunch: rising',
  fall: 'Hunch: falling',
  none: 'Hunch: no change',
}

const WIDE = '(min-width: 768px)'

const wideQuery = () => (typeof window.matchMedia === 'function' ? window.matchMedia(WIDE) : undefined)

function useWide() {
  const [wide, setWide] = useState(() => wideQuery()?.matches ?? true)
  // One listener for the screen's life: matchMedia returns a new object on every call.
  useEffect(() => {
    const query = wideQuery()
    if (!query) return
    const onChange = (e: MediaQueryListEvent) => setWide(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return wide
}

export function Shell({ screen, variable, placeName, hunch, furthest, onGoTo = () => {}, children }: ShellProps) {
  const wide = useWide()
  const [open, setOpen] = useState(wide)
  useEffect(() => setOpen(wide), [wide])
  // Bumped when the current step is clicked, so that screen remounts and starts again.
  const [visit, setVisit] = useState(0)

  const currentIndex = STEPS.findIndex((s) => s.screen === screen)
  const reach = Math.max(furthest ?? currentIndex, currentIndex)
  const values: Partial<Record<Screen, string>> = {
    clues: variable?.name,
    scene: placeName && listName(placeName),
    brief: hunch ? HUNCH_TEXT[hunch] : undefined,
  }
  const context = [variable?.name, placeName, variable && `since ${variable.startYear}`].filter(Boolean).join(' · ')
  const go = (i: number) => (i === currentIndex ? setVisit((n) => n + 1) : onGoTo(STEPS[i].screen))

  // On wide screens the steps are always listed; on phones they sit behind a "Case so far" toggle.
  const steps = (
    <ol className="rail-steps">
      {STEPS.map((step, i) => {
        const current = i === currentIndex
        const reached = i <= reach
        const value = current ? 'You are here' : reached ? values[step.screen] : 'Not yet'
        const state = current ? 'current' : reached ? 'done' : 'todo'
        const inner = (
          <>
            <span className="rail-step-icon">
              <step.Icon size={22} />
            </span>
            <span className="rail-step-text">
              <span className="rail-step-label">
                {i + 1} {step.label}
              </span>
              {value && <span className="rail-step-value underline underline-yellow">{value}</span>}
            </span>
          </>
        )
        return (
          <li key={step.screen} className={`rail-step is-${state}`} aria-current={current ? 'step' : undefined}>
            {reached ? (
              <button
                type="button"
                className="rail-step-button"
                title={current ? 'Start this step again' : `Go back to ${step.label}`}
                onClick={() => go(i)}
              >
                {inner}
              </button>
            ) : (
              <span className="rail-step-button">{inner}</span>
            )}
          </li>
        )
      })}
    </ol>
  )

  return (
    <div className="shell">
      <aside className="rail" aria-label="Case progress">
        <div className="rail-inner">
          <div className="rail-brand">
            <img src={smallLogo} alt="" width={44} height={44} />
            <span className="rail-name">TerraTrace</span>
            <span className="rail-strip-step">
              Step {currentIndex + 1} of 5: {STEPS[currentIndex].label}
            </span>
          </div>
          {wide ? (
            steps
          ) : (
            <details className="rail-details" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
              <summary>Case so far</summary>
              {steps}
            </details>
          )}
        </div>
      </aside>
      <main className="panel">
        {/* Keyed by screen (and restarts), so each new screen remounts and plays the rise-in animation. */}
        <div key={`${screen}-${visit}`} className="screen">
          {context && <p className="context">{context}</p>}
          {children}
        </div>
        <nav className="step-nav" aria-label="Steps">
          <button type="button" disabled={currentIndex === 0} onClick={() => go(currentIndex - 1)}>
            <ChevronLeftIcon size={20} />
            Previous
          </button>
          <button type="button" disabled={currentIndex + 1 > reach} onClick={() => go(currentIndex + 1)}>
            Next
            <ChevronRightIcon size={20} />
          </button>
        </nav>
      </main>
      <footer className="built-for">
        <span>Built for</span>
        <img src={fullLogo} alt="NASA Space Apps Challenge" width={190} />
      </footer>
    </div>
  )
}
