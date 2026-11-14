import type { ReactNode } from 'react'
import { starBurst } from './starBurst'

type PrimaryButtonProps = { children: ReactNode; onClick: () => void; disabled?: boolean }

export function PrimaryButton({ children, onClick, disabled }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      className="btn-primary"
      disabled={disabled}
      onClick={(e) => {
        starBurst(e.currentTarget)
        onClick()
      }}
    >
      {children}
      <span aria-hidden="true">✓</span>
    </button>
  )
}
