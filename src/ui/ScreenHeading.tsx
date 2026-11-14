import { useEffect, useRef, type ReactNode } from 'react'

// Each screen's single h1; takes focus when the screen appears (architecture section 9).
export function ScreenHeading({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => ref.current?.focus(), [])
  return (
    <h1 ref={ref} tabIndex={-1}>
      {children}
    </h1>
  )
}
