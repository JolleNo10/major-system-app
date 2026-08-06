import { useEffect, useRef } from 'react'

// Dependency-free canvas fireworks, played once when mounted (a new full-recite
// record). Fixed full-viewport overlay, pointer-events-none so it never blocks
// the result buttons behind it; honours prefers-reduced-motion (renders a bare,
// static canvas). Zero network / no external lib, per the app's offline-precache
// constraint (CLAUDE.md).

interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; max: number; color: string; size: number
}

// Violet accent first (the app's brand), then a celebratory spread.
const COLORS = ['#a78bfa', '#c4b5fd', '#8b5cf6', '#22d3ee', '#67e8f9', '#4ade80', '#fbbf24', '#f472b6']
const BURST_SCHEDULE = [0, 220, 460, 680, 940, 1200, 1500] // ms after mount

export function RecordFireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    let particles: Particle[] = []
    const burst = (x: number, y: number) => {
      const base = COLORS[Math.floor(Math.random() * COLORS.length)]
      const n = 40 + Math.floor(Math.random() * 24)
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + Math.random() * 0.3
        const speed = 2 + Math.random() * 3.5
        particles.push({
          x, y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: 0,
          max: 55 + Math.random() * 35,
          color: Math.random() < 0.25 ? COLORS[Math.floor(Math.random() * COLORS.length)] : base,
          size: 1.5 + Math.random() * 2,
        })
      }
    }

    const start = performance.now()
    let fired = 0
    let running = true
    let raf = 0

    const tick = (now: number) => {
      if (!running) return
      const t = now - start
      const w = window.innerWidth, h = window.innerHeight
      while (fired < BURST_SCHEDULE.length && t >= BURST_SCHEDULE[fired]) {
        burst(w * (0.2 + Math.random() * 0.6), h * (0.2 + Math.random() * 0.35))
        fired++
      }
      ctx.clearRect(0, 0, w, h)
      particles = particles.filter(p => p.life < p.max)
      for (const p of particles) {
        p.life++
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.045          // gravity
        p.vx *= 0.99
        p.vy *= 0.99
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.max)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      if (fired < BURST_SCHEDULE.length || particles.length > 0) {
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 z-50 pointer-events-none" aria-hidden />
}
