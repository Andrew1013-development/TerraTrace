// Decoration only: a short burst of falling stars from a primary button when it is clicked.
// Stars live on document.body because the click usually replaces the screen, and the button with it.

const COUNT = 18
const LIFE_MS = 600
const GRAVITY = 900 // px/s²
const COLORS = ['var(--yellow)', 'var(--orange)']

type Star = { el: HTMLSpanElement; x: number; y: number; vx: number; vy: number; r: number; vr: number }

export function starBurst(button: HTMLElement): void {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

  const box = button.getBoundingClientRect()
  const stars: Star[] = []
  for (let i = 0; i < COUNT; i++) {
    const el = document.createElement('span')
    el.dataset.star = ''
    el.setAttribute('aria-hidden', 'true')
    el.textContent = '✦'
    el.className = 'star'
    el.style.color = COLORS[i % 2]
    el.style.fontSize = `${8 + Math.round(Math.random() * 6)}px`
    document.body.appendChild(el)

    const angle = ((27 + Math.random() * 126) * Math.PI) / 180 // upward and outward
    const speed = 140 + Math.random() * 160
    stars.push({
      el,
      x: box.left + Math.random() * box.width,
      y: box.top + box.height * 0.3,
      vx: Math.cos(angle) * speed,
      vy: -Math.sin(angle) * speed,
      r: Math.random() * 360,
      vr: (Math.random() - 0.5) * 600,
    })
  }

  const start = performance.now()
  let last = start
  const frame = (now: number) => {
    const dt = Math.min(0.032, (now - last) / 1000)
    last = now
    const k = Math.min(1, (now - start) / LIFE_MS)
    for (const s of stars) {
      s.vy += GRAVITY * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.r += s.vr * dt
      s.el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) rotate(${s.r.toFixed(0)}deg)`
      s.el.style.opacity = (1 - k * k).toFixed(2)
    }
    if (k < 1 && stars[0].el.isConnected && typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(frame)
    }
  }
  frame(start)

  // Removal does not depend on frames arriving (background tabs pause them).
  setTimeout(() => stars.forEach((s) => s.el.remove()), LIFE_MS)
}
