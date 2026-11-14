// Animated illustrations for clue answers. Decorative only (aria-hidden); the button text carries the meaning.
// Each answer's tags pick a sequence of art; several pieces cycle (fire, then a snowflake). Motion lives in app.css
// and switches off under prefers-reduced-motion.
import { useEffect, useRef, useState, type ReactNode } from 'react'

export type ArtName =
  | 'question'
  | 'fire'
  | 'snowflake'
  | 'wind'
  | 'mountain'
  | 'wave'
  | 'leaf'
  | 'rain'
  | 'mist'
  | 'sun'
  | 'cloud'
  | 'thermo-mid'
  | 'thermo-high'
  | 'thermo-low'

// Tags come from the clue questions and the catalog (exact lower-case words).
const TAG_ART: Record<string, ArtName[]> = {
  temperature: ['fire', 'snowflake'],
  air: ['wind'],
  wind: ['wind'],
  land: ['mountain'],
  water: ['wave'],
  life: ['leaf'],
  rain: ['rain'],
  snow: ['snowflake'],
  humidity: ['mist'],
  soil: ['mountain'],
  sun: ['sun'],
  cloud: ['cloud'],
  average: ['thermo-mid'],
  maximum: ['thermo-high'],
  minimum: ['thermo-low'],
}

export function artFor(tags: string[]): ArtName[] {
  const names = tags.flatMap((t) => TAG_ART[t] ?? [])
  const unique = [...new Set(names)].slice(0, 3)
  return unique.length ? unique : ['question']
}

const CYCLE_MS = 1700
const SWAP_MS = 240

// Shows `names` (cycling when there are several); the outgoing piece shrinks and fades as the next grows in.
export function ClueArt({ names, popping }: { names: ArtName[]; popping: boolean }) {
  const [index, setIndex] = useState(0)
  const key = names.join('+')
  useEffect(() => {
    setIndex(0)
    if (names.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % names.length), CYCLE_MS)
    return () => clearInterval(id)
  }, [key, names.length])

  const shown = names[index] ?? names[0]
  const [leaving, setLeaving] = useState<ArtName>()
  const last = useRef(shown)
  useEffect(() => {
    if (last.current === shown) return
    setLeaving(last.current)
    last.current = shown
    const id = setTimeout(() => setLeaving(undefined), SWAP_MS)
    return () => clearTimeout(id)
  }, [shown])

  return (
    <div className="clue-art" aria-hidden="true">
      {leaving && (
        <div key={`out-${leaving}`} className="art-layer art-exit">
          <Art name={leaving} />
        </div>
      )}
      <div key={`in-${shown}`} className={`art-layer art-enter${popping ? ' art-pop' : ''}`} data-art={shown}>
        <Art name={shown} />
      </div>
    </div>
  )
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" focusable="false">
      {children}
    </svg>
  )
}

function Art({ name }: { name: ArtName }) {
  switch (name) {
    case 'fire':
      return (
        <Svg>
          <defs>
            <linearGradient id="g-fire" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#E43700" />
              <stop offset=".55" stopColor="#F57C00" />
              <stop offset="1" stopColor="#FFC93C" />
            </linearGradient>
          </defs>
          <g className="a-flicker">
            <path d="M60 14c6 18 26 28 26 52a26 26 0 0 1-52 0c0-12 6-20 12-26 1 9 5 14 10 16-4-14 0-28 4-42z" fill="url(#g-fire)" />
            <path d="M60 58c4 8 12 12 12 22a12 12 0 0 1-24 0c0-6 4-10 7-13 1 4 3 6 5 7-1-6 0-11 0-16z" fill="#FFE08A" />
          </g>
        </Svg>
      )
    case 'snowflake':
      return (
        <Svg>
          <g className="a-spin" stroke="#7CC4FF" strokeWidth="6" strokeLinecap="round" fill="none">
            {[0, 60, 120].map((r) => (
              <g key={r} transform={`rotate(${r} 60 60)`}>
                <path d="M60 16v88" />
                <path d="M60 30l-10-10M60 30l10-10M60 90l-10 10M60 90l10 10" />
              </g>
            ))}
            <circle cx="60" cy="60" r="7" fill="#FFFFFF" stroke="#7CC4FF" />
          </g>
        </Svg>
      )
    case 'wind':
      return (
        <Svg>
          <g className="a-blow" stroke="#5AB0F0" strokeWidth="7" strokeLinecap="round" fill="none">
            <path d="M14 44h58a12 12 0 1 0-12-12" />
            <path d="M14 64h76a12 12 0 1 1-12 12" />
            <path d="M14 84h40" />
          </g>
        </Svg>
      )
    case 'mountain':
      return (
        <Svg>
          <g className="a-crackle">
            <path d="M8 100l36-56 18 26 14-18 36 48z" fill="#8B5A2B" />
            <path d="M44 44l-9 14 9-4 7 8z" fill="#F2E6D8" />
            <path d="M38 100l10-18-6-8 9-12M80 100l-6-14 8-10" stroke="#3E2410" strokeWidth="3" fill="none" className="a-crack" />
          </g>
        </Svg>
      )
    case 'wave':
      return (
        <Svg>
          <g className="a-wave" stroke="#0960E1" strokeWidth="7" strokeLinecap="round" fill="none">
            <path d="M-20 52c15-12 25-12 40 0s25 12 40 0 25-12 40 0 25 12 40 0" />
            <path d="M-20 76c15-12 25-12 40 0s25 12 40 0 25-12 40 0 25 12 40 0" opacity=".6" />
          </g>
        </Svg>
      )
    case 'leaf':
      return (
        <Svg>
          <g className="a-sway">
            <path d="M60 104C30 90 22 56 40 22c34 6 52 40 30 76" fill="#3FA34D" />
            <path d="M60 104C52 76 48 54 40 22" stroke="#1F6B2A" strokeWidth="4" fill="none" />
          </g>
        </Svg>
      )
    case 'rain':
      return (
        <Svg>
          <path d="M30 52a18 18 0 0 1 4-35 22 22 0 0 1 42 4 16 16 0 0 1 14 31z" fill="#B9C6DA" />
          <g className="a-fall" fill="#0960E1">
            <path d="M38 66l-5 12a5 5 0 0 0 10 0z" />
            <path d="M60 72l-5 12a5 5 0 0 0 10 0z" />
            <path d="M82 66l-5 12a5 5 0 0 0 10 0z" />
          </g>
        </Svg>
      )
    case 'mist':
      return (
        <Svg>
          <g className="a-drift" stroke="#8FB3E0" strokeWidth="7" strokeLinecap="round" fill="none">
            <path d="M18 42c12-8 22 8 34 0s22 8 34 0 14 0 16 0" />
            <path d="M24 62c12-8 22 8 34 0s22 8 34 0" opacity=".75" />
            <path d="M18 82c12-8 22 8 34 0s22 8 34 0 14 0 16 0" opacity=".5" />
          </g>
        </Svg>
      )
    case 'sun':
      return (
        <Svg>
          <g className="a-spin" stroke="#F5B400" strokeWidth="6" strokeLinecap="round">
            {Array.from({ length: 8 }, (_, i) => (
              <path key={i} d="M60 10v14" transform={`rotate(${i * 45} 60 60)`} />
            ))}
          </g>
          <circle cx="60" cy="60" r="24" fill="#FFC93C" />
        </Svg>
      )
    case 'cloud':
      return (
        <Svg>
          <path
            className="a-drift"
            d="M32 86a20 20 0 0 1 2-40 26 26 0 0 1 50-4 20 20 0 0 1 6 44z"
            fill="#E3E9F3"
            stroke="#9AA7C4"
            strokeWidth="4"
          />
        </Svg>
      )
    case 'thermo-mid':
    case 'thermo-high':
    case 'thermo-low': {
      const level = name === 'thermo-high' ? 22 : name === 'thermo-low' ? 66 : 44
      return (
        <Svg>
          <rect x="48" y="12" width="24" height="76" rx="12" fill="#FFFFFF" stroke="#4A5170" strokeWidth="4" />
          <rect className="a-rise" x="54" y={level} width="12" height={86 - level} rx="6" fill="#E43700" />
          <circle cx="60" cy="96" r="16" fill="#E43700" stroke="#4A5170" strokeWidth="4" />
        </Svg>
      )
    }
    default:
      return (
        <Svg>
          <g className="a-bob">
            <path
              d="M42 44a18 18 0 1 1 26 16c-5 3-8 7-8 13v4"
              stroke="#0042A6"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="60" cy="95" r="6.5" fill="#0042A6" />
          </g>
        </Svg>
      )
  }
}
