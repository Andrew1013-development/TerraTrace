// Animated illustrations for clue answers. Decorative only (aria-hidden); the button text carries the meaning.
// Motion lives in app.css and switches off under prefers-reduced-motion.
import { useEffect, useRef, useState, type ReactNode } from 'react'

export type ArtName =
  | 'question'
  | 'fire'
  | 'snowflake'
  | 'wind'
  | 'mountain'
  | 'cracked'
  | 'wave'
  | 'leaf'
  | 'rain'
  | 'mist'
  | 'sun'
  | 'clouds'
  | 'tree-gust'
  | 'tree-calm'
  | 'thermo-mid'
  | 'thermo-high'
  | 'thermo-low'

// "It feels hotter or colder": one piece of art per word, in the order the words appear.
const WORD_ART: Record<string, ArtName> = {
  hotter: 'fire',
  colder: 'snowflake',
  wetter: 'rain',
  drier: 'cracked',
  windier: 'tree-gust',
  calmer: 'tree-calm',
  sunnier: 'sun',
  cloudier: 'clouds',
}

// Tags (exact lower-case words shared by the questions and the catalog).
const TAG_ART: Record<string, ArtName[]> = {
  air: ['wind'],
  water: ['wave'],
  land: ['mountain'],
  life: ['leaf'],
  rain: ['rain'],
  snow: ['snowflake'],
  humidity: ['mist'],
  wind: ['tree-gust', 'tree-calm'],
  sun: ['sun'],
  cloud: ['clouds'],
  temperature: ['fire', 'snowflake'],
  average: ['thermo-mid'],
  maximum: ['thermo-high'],
  minimum: ['thermo-low'],
}

export function artForOption(option: { label: string; tags: string[] }): ArtName[] {
  const words = option.label.toLowerCase().match(/[a-z]+/g) ?? []
  const fromWords = words.map((w) => WORD_ART[w]).filter((a): a is ArtName => !!a)
  if (fromWords.length) return fromWords
  return option.tags.map((t) => TAG_ART[t]).find(Boolean) ?? ['question']
}

// A variable shows one piece of art from its most specific tag; the broad air/water/land/life tags come last.
const VARIABLE_ART: [string, ArtName][] = [
  ['maximum', 'thermo-high'],
  ['minimum', 'thermo-low'],
  ['average', 'thermo-mid'],
  ['temperature', 'thermo-mid'],
  ['rain', 'rain'],
  ['snow', 'snowflake'],
  ['humidity', 'mist'],
  ['wind', 'wind'],
  ['sun', 'sun'],
  ['cloud', 'clouds'],
  ['air', 'wind'],
  ['water', 'wave'],
  ['land', 'mountain'],
  ['life', 'leaf'],
]

export function artForVariable(tags: string[]): ArtName[] {
  const hit = VARIABLE_ART.find(([tag]) => tags.includes(tag))
  return [hit ? hit[1] : 'question']
}

const CYCLE_MS = 2200
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

function Tree({ gust }: { gust: boolean }) {
  return (
    <Svg>
      <path d="M14 104h92" stroke="#7A9B5A" strokeWidth="5" strokeLinecap="round" />
      <g className={gust ? 'a-tree-gust' : 'a-tree-calm'}>
        <path d="M58 104c1-14 0-28 2-40" stroke="#6B4423" strokeWidth="8" strokeLinecap="round" fill="none" />
        <g className={gust ? 'a-canopy-gust' : 'a-canopy-calm'}>
          <circle cx="60" cy="46" r="22" fill="#3FA34D" />
          <circle cx="44" cy="54" r="15" fill="#4DB85B" />
          <circle cx="76" cy="54" r="15" fill="#358F42" />
          <circle cx="60" cy="30" r="14" fill="#4DB85B" />
        </g>
      </g>
      {gust && (
        <g className="a-blown" fill="#4DB85B">
          <ellipse cx="80" cy="40" rx="4" ry="2" />
          <ellipse cx="74" cy="60" rx="3.5" ry="1.8" />
          <ellipse cx="86" cy="52" rx="3" ry="1.6" />
        </g>
      )}
      {gust && (
        <g stroke="#9CC8F0" strokeWidth="3" strokeLinecap="round" fill="none">
          <path className="a-streak a-streak-1" pathLength={100} d="M4 40h26" />
          <path className="a-streak a-streak-2" pathLength={100} d="M2 70h22" />
        </g>
      )}
    </Svg>
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
          <g className="a-spin-slow" stroke="#7CC4FF" strokeWidth="6" strokeLinecap="round" fill="none">
            <circle cx="60" cy="60" r="50" stroke="none" fill="none" />
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
      // Each gust runs out to its curl and back again, at its own speed.
      return (
        <Svg>
          <g stroke="#5AB0F0" strokeWidth="7" strokeLinecap="round" fill="none">
            <path className="a-gust a-gust-1" pathLength={100} d="M12 44h62a12 12 0 1 0-12-12" />
            <path className="a-gust a-gust-2" pathLength={100} d="M12 64h80a12 12 0 1 1-12 12" />
            <path className="a-gust a-gust-3" pathLength={100} d="M20 84h44a9 9 0 1 0-9-9" />
          </g>
        </Svg>
      )
    case 'mountain':
      return (
        <Svg>
          <path d="M8 100l36-56 18 26 14-18 36 48z" fill="#8B5A2B" />
          <path d="M44 44l-9 14 9-4 7 8z" fill="#F2E6D8" />
          <path
            className="a-crack"
            pathLength={100}
            d="M38 100l10-18-6-8 9-12M80 100l-6-14 8-10"
            stroke="#3E2410"
            strokeWidth="3"
            fill="none"
          />
        </Svg>
      )
    case 'cracked':
      return (
        <Svg>
          <circle className="a-heat" cx="92" cy="26" r="11" fill="#FFC93C" />
          <path d="M8 62l104 0 0 40-104 0z" fill="#C8955C" />
          <path d="M8 62h104" stroke="#A8743E" strokeWidth="3" />
          <g stroke="#6B4423" strokeWidth="3" strokeLinecap="round" fill="none">
            <path className="a-crack" pathLength={100} d="M22 62l8 14-6 12 4 14" />
            <path className="a-crack a-crack-2" pathLength={100} d="M30 76l20 4 10-12 16 6 6-16" />
            <path className="a-crack a-crack-3" pathLength={100} d="M50 80l2 22M76 74l12 14 18-4M88 88l-4 14" />
          </g>
          <g className="a-dust" fill="#D9B07E">
            <circle cx="40" cy="56" r="2.5" />
            <circle cx="70" cy="58" r="2" />
            <circle cx="96" cy="56" r="2.5" />
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
          <g stroke="#8FB3E0" strokeWidth="7" strokeLinecap="round" fill="none">
            <path className="a-drift" d="M18 42c12-8 22 8 34 0s22 8 34 0 14 0 16 0" />
            <path className="a-drift a-drift-2" d="M24 62c12-8 22 8 34 0s22 8 34 0" opacity=".75" />
            <path className="a-drift a-drift-3" d="M18 82c12-8 22 8 34 0s22 8 34 0 14 0 16 0" opacity=".5" />
          </g>
        </Svg>
      )
    case 'sun':
      return (
        <Svg>
          <g className="a-spin-slow" stroke="#F5B400" strokeWidth="6" strokeLinecap="round">
            {Array.from({ length: 8 }, (_, i) => (
              <path key={i} d="M60 8v14" transform={`rotate(${i * 45} 60 60)`} />
            ))}
          </g>
          <circle className="a-pulse" cx="60" cy="60" r="24" fill="#FFC93C" />
        </Svg>
      )
    case 'clouds':
      return (
        <Svg>
          <path className="a-drift a-drift-3" d="M20 40a9 9 0 0 1 1-18 12 12 0 0 1 22-2 9 9 0 0 1 3 20z" fill="#EEF2F8" stroke="#9AA7C4" strokeWidth="3" />
          <path className="a-drift" d="M32 86a20 20 0 0 1 2-40 26 26 0 0 1 50-4 20 20 0 0 1 6 44z" fill="#E3E9F3" stroke="#9AA7C4" strokeWidth="4" />
          <path className="a-drift a-drift-2" d="M78 104a8 8 0 0 1 1-16 11 11 0 0 1 20-2 8 8 0 0 1 3 18z" fill="#EEF2F8" stroke="#9AA7C4" strokeWidth="3" />
        </Svg>
      )
    case 'tree-gust':
      return <Tree gust />
    case 'tree-calm':
      return <Tree gust={false} />
    case 'thermo-mid':
      // A usual day: orange mercury settles at half way.
      return (
        <Svg>
          <rect x="48" y="12" width="24" height="76" rx="12" fill="#FFFFFF" stroke="#4A5170" strokeWidth="4" />
          <rect className="a-rise" x="54" y="50" width="12" height="36" rx="6" fill="#F57C00" />
          <circle cx="60" cy="96" r="16" fill="#F57C00" stroke="#4A5170" strokeWidth="4" />
        </Svg>
      )
    case 'thermo-high':
      // The hottest: red mercury overshoots, the top breaks off in shards and the mercury spills over.
      return (
        <Svg>
          <path d="M48 30V86M72 30V86" stroke="#4A5170" strokeWidth="4" strokeLinecap="round" />
          <path d="M51 30h18V86H51z" fill="#FFFFFF" />
          <rect className="a-overflow" x="54" y="10" width="12" height="78" rx="6" fill="#E43700" />
          <path className="a-cap" d="M48 30v-6a12 12 0 0 1 24 0v6" fill="#FFFFFF" stroke="#4A5170" strokeWidth="4" strokeLinejoin="round" />
          <path className="a-rim" d="M48 31l4-6 4 5 4-7 4 6 4-5 4 7" fill="none" stroke="#4A5170" strokeWidth="3" strokeLinejoin="round" />
          <g fill="#C5D3E8" stroke="#4A5170" strokeWidth="1.5">
            <path className="a-shard a-shard-1" d="M50 22l6-4 1 6z" />
            <path className="a-shard a-shard-2" d="M58 16l5 1-2 6z" />
            <path className="a-shard a-shard-3" d="M66 20l6 3-5 3z" />
          </g>
          <g fill="#E43700">
            <path className="a-spill a-spill-1" d="M50 26c-3 4-3 8 0 9 3-1 3-5 0-9z" />
            <path className="a-spill a-spill-2" d="M70 26c-3 4-3 8 0 9 3-1 3-5 0-9z" />
            <circle className="a-spill a-spill-3" cx="60" cy="18" r="3" />
          </g>
          <circle cx="60" cy="96" r="16" fill="#E43700" stroke="#4A5170" strokeWidth="4" />
        </Svg>
      )
    case 'thermo-low':
      // The coldest: blue mercury creeps up while the glass shivers, and frost flashes across it.
      return (
        <Svg>
          <g className="a-shiver">
            <rect x="48" y="12" width="24" height="76" rx="12" fill="#FFFFFF" stroke="#4A5170" strokeWidth="4" />
            <rect className="a-creep" x="54" y="62" width="12" height="24" rx="6" fill="#2E96F5" />
            <circle cx="60" cy="96" r="16" fill="#2E96F5" stroke="#4A5170" strokeWidth="4" />
            <g className="a-frost" stroke="#BFE3FF" strokeWidth="1.6" strokeLinecap="round" fill="none">
              <path d="M50 22l6 6 -3 6 6 5M70 30l-5 4 2 7-6 4M52 52l6 3 4-4 6 4M66 64l-6 4 1 6M48 80l7-3 5 4M56 92l-6 6M66 90l7 4 2 6M44 100l6-2" />
              <path d="M38 40l6 2M80 46l-6 3M36 70l7-1M84 76l-6-2" opacity=".7" />
            </g>
          </g>
        </Svg>
      )
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
