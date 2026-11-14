// Small line icons drawn for Case File (24 × 24, stroke = currentColor). Decorative: always aria-hidden.
import type { ReactNode } from 'react'

function Icon({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

type P = { size?: number }

export const SearchIcon = ({ size }: P) => (
  <Icon size={size}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M15 15l5 5" />
  </Icon>
)

export const GlobeIcon = ({ size }: P) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
  </Icon>
)

export const ClipboardIcon = ({ size }: P) => (
  <Icon size={size}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" />
  </Icon>
)

export const ChartIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 20V4M4 20h16" />
    <path d="M7 15l4-4 3 3 5-6" />
  </Icon>
)

export const ScaleIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M12 4v16M8 20h8M5 7h14" />
    <path d="M5 7l-3 6h6zM19 7l-3 6h6z" />
  </Icon>
)

export const ArrowUpIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 17l6-6 4 4 6-7" />
    <path d="M15 8h5v5" />
  </Icon>
)

export const ArrowDownIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 7l6 6 4-4 6 7" />
    <path d="M15 16h5v-5" />
  </Icon>
)

export const FlatIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M3 12c3-3 5 3 9 0s6 3 9 0" />
  </Icon>
)

export const QuestionIcon = ({ size }: P) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5V14M12 17.5v.01" />
  </Icon>
)

export const SpeedIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 17a8 8 0 1 1 16 0" />
    <path d="M12 17l4-5" />
  </Icon>
)

export const RulerIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 9h16v6H4z" />
    <path d="M8 9v3M12 9v3M16 9v3" />
  </Icon>
)

export const PinIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" />
    <circle cx="12" cy="10" r="2.2" />
  </Icon>
)

export const ChevronLeftIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M15 6l-6 6 6 6" />
  </Icon>
)

export const ChevronRightIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
)
