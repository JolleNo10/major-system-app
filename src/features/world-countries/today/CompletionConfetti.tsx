import type { CSSProperties } from 'react'
import './CompletionCelebration.css'

const CONFETTI = [
  { left: '9%', delay: '0ms', duration: '2.25s', drift: '-10px', color: 'bg-cyan-300' },
  { left: '18%', delay: '140ms', duration: '2.5s', drift: '22px', color: 'bg-amber-300' },
  { left: '29%', delay: '70ms', duration: '2.35s', drift: '14px', color: 'bg-emerald-300' },
  { left: '39%', delay: '220ms', duration: '2.55s', drift: '-18px', color: 'bg-blue-300' },
  { left: '51%', delay: '30ms', duration: '2.4s', drift: '17px', color: 'bg-amber-200' },
  { left: '62%', delay: '180ms', duration: '2.3s', drift: '-14px', color: 'bg-cyan-200' },
  { left: '72%', delay: '95ms', duration: '2.6s', drift: '20px', color: 'bg-emerald-300' },
  { left: '81%', delay: '260ms', duration: '2.4s', drift: '-20px', color: 'bg-blue-300' },
  { left: '89%', delay: '45ms', duration: '2.5s', drift: '12px', color: 'bg-amber-300' },
  { left: '44%', delay: '310ms', duration: '2.35s', drift: '-12px', color: 'bg-cyan-300' },
] as const

export function CompletionConfetti() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">
      {CONFETTI.map(piece => (
        <span
          key={`${piece.left}-${piece.delay}`}
          className={`wc-completion-confetti absolute top-0 h-3 w-1.5 rounded-sm ${piece.color}`}
          style={{
            left: piece.left,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            '--wc-completion-confetti-drift': piece.drift,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}
