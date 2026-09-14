import type { CSSProperties } from 'react'

export type LearningCompletionCelebration = 'subregion' | 'continent' | 'world'

interface SetTwinkle {
  left?: string
  right?: string
  top?: string
  bottom?: string
  delay: string
}

const SET_TWINKLES: readonly SetTwinkle[] = [
  { left: '2rem', top: '0.75rem', delay: '120ms' },
  { right: '3.5rem', top: '1.25rem', delay: '340ms' },
  { right: '1.75rem', bottom: '0.75rem', delay: '560ms' },
] as const

const createFireworkRays = (count: number) => Array.from({ length: count }, (_, index) => (index * 360) / count)

const FIREWORK_RAYS = createFireworkRays(8)
/** The world tier fires a denser burst so the top of the ladder reads as the biggest. */
const WORLD_FIREWORK_RAYS = createFireworkRays(12)

interface CelebrationPosition {
  left: string
  top: string
  delay: string
}

interface ConfettiPosition extends CelebrationPosition {
  rotate: string
}

const MEDIUM_BURSTS: readonly CelebrationPosition[] = [
  { left: '50%', top: '45%', delay: '0ms' },
  { left: '39%', top: '57%', delay: '260ms' },
  { left: '62%', top: '55%', delay: '520ms' },
]

const BIG_BURSTS: readonly CelebrationPosition[] = [
  { left: '28%', top: '30%', delay: '0ms' },
  { left: '49%', top: '45%', delay: '280ms' },
  { left: '72%', top: '32%', delay: '560ms' },
  { left: '37%', top: '68%', delay: '860ms' },
  { left: '64%', top: '64%', delay: '1.12s' },
]

const MEDIUM_CONFETTI: readonly ConfettiPosition[] = [
  { left: '40%', top: '48%', delay: '40ms', rotate: '-18deg' },
  { left: '46%', top: '43%', delay: '180ms', rotate: '24deg' },
  { left: '54%', top: '47%', delay: '280ms', rotate: '8deg' },
  { left: '61%', top: '50%', delay: '390ms', rotate: '-30deg' },
  { left: '36%', top: '57%', delay: '520ms', rotate: '18deg' },
  { left: '52%', top: '61%', delay: '680ms', rotate: '-12deg' },
  { left: '67%', top: '58%', delay: '760ms', rotate: '28deg' },
  { left: '43%', top: '66%', delay: '900ms', rotate: '-22deg' },
]

const BIG_CONFETTI: readonly ConfettiPosition[] = [
  { left: '22%', top: '26%', delay: '0ms', rotate: '-18deg' },
  { left: '31%', top: '35%', delay: '140ms', rotate: '24deg' },
  { left: '42%', top: '24%', delay: '260ms', rotate: '8deg' },
  { left: '55%', top: '30%', delay: '380ms', rotate: '-30deg' },
  { left: '68%', top: '24%', delay: '500ms', rotate: '18deg' },
  { left: '78%', top: '38%', delay: '620ms', rotate: '28deg' },
  { left: '25%', top: '48%', delay: '740ms', rotate: '-22deg' },
  { left: '35%', top: '53%', delay: '860ms', rotate: '12deg' },
  { left: '48%', top: '55%', delay: '980ms', rotate: '-8deg' },
  { left: '60%', top: '50%', delay: '1.1s', rotate: '22deg' },
  { left: '73%', top: '54%', delay: '1.22s', rotate: '-16deg' },
  { left: '30%', top: '70%', delay: '1.34s', rotate: '30deg' },
  { left: '44%', top: '74%', delay: '1.46s', rotate: '-26deg' },
  { left: '57%', top: '70%', delay: '1.58s', rotate: '16deg' },
  { left: '69%', top: '72%', delay: '1.7s', rotate: '-12deg' },
]

const MEDIUM_SPARKLES: readonly CelebrationPosition[] = [
  { left: '45%', top: '35%', delay: '180ms' },
  { left: '57%', top: '39%', delay: '430ms' },
  { left: '48%', top: '68%', delay: '720ms' },
]

const BIG_SPARKLES: readonly CelebrationPosition[] = [
  { left: '25%', top: '42%', delay: '80ms' },
  { left: '43%', top: '34%', delay: '320ms' },
  { left: '59%', top: '42%', delay: '560ms' },
  { left: '76%', top: '48%', delay: '820ms' },
  { left: '36%', top: '78%', delay: '1.1s' },
  { left: '66%', top: '76%', delay: '1.36s' },
]

const WORLD_BURSTS: readonly CelebrationPosition[] = [
  { left: '16%', top: '28%', delay: '0ms' },
  { left: '34%', top: '40%', delay: '190ms' },
  { left: '50%', top: '24%', delay: '380ms' },
  { left: '66%', top: '38%', delay: '570ms' },
  { left: '84%', top: '30%', delay: '760ms' },
  { left: '25%', top: '64%', delay: '950ms' },
  { left: '45%', top: '58%', delay: '1.14s' },
  { left: '63%', top: '70%', delay: '1.33s' },
  { left: '80%', top: '60%', delay: '1.52s' },
]

const WORLD_CONFETTI: readonly ConfettiPosition[] = [
  { left: '10%', top: '22%', delay: '0ms', rotate: '-24deg' },
  { left: '19%', top: '31%', delay: '90ms', rotate: '18deg' },
  { left: '27%', top: '20%', delay: '180ms', rotate: '-8deg' },
  { left: '35%', top: '28%', delay: '270ms', rotate: '30deg' },
  { left: '43%', top: '18%', delay: '360ms', rotate: '-16deg' },
  { left: '51%', top: '30%', delay: '450ms', rotate: '22deg' },
  { left: '59%', top: '19%', delay: '540ms', rotate: '-28deg' },
  { left: '67%', top: '27%', delay: '630ms', rotate: '12deg' },
  { left: '75%', top: '17%', delay: '720ms', rotate: '-20deg' },
  { left: '83%', top: '29%', delay: '810ms', rotate: '26deg' },
  { left: '90%', top: '23%', delay: '900ms', rotate: '-12deg' },
  { left: '13%', top: '44%', delay: '990ms', rotate: '20deg' },
  { left: '22%', top: '52%', delay: '1.08s', rotate: '-26deg' },
  { left: '31%', top: '42%', delay: '1.17s', rotate: '14deg' },
  { left: '40%', top: '50%', delay: '1.26s', rotate: '-18deg' },
  { left: '49%', top: '41%', delay: '1.35s', rotate: '28deg' },
  { left: '57%', top: '49%', delay: '1.44s', rotate: '-10deg' },
  { left: '66%', top: '43%', delay: '1.53s', rotate: '24deg' },
  { left: '74%', top: '51%', delay: '1.62s', rotate: '-22deg' },
  { left: '82%', top: '45%', delay: '1.71s', rotate: '16deg' },
  { left: '89%', top: '53%', delay: '1.8s', rotate: '-30deg' },
  { left: '16%', top: '66%', delay: '1.89s', rotate: '10deg' },
  { left: '25%', top: '74%', delay: '1.98s', rotate: '-14deg' },
  { left: '34%', top: '64%', delay: '2.07s', rotate: '22deg' },
  { left: '43%', top: '72%', delay: '2.16s', rotate: '-24deg' },
  { left: '52%', top: '66%', delay: '2.25s', rotate: '18deg' },
  { left: '61%', top: '74%', delay: '2.34s', rotate: '-8deg' },
  { left: '70%', top: '65%', delay: '2.43s', rotate: '30deg' },
  { left: '79%', top: '72%', delay: '2.52s', rotate: '-20deg' },
  { left: '87%', top: '67%', delay: '2.61s', rotate: '12deg' },
]

const WORLD_SPARKLES: readonly CelebrationPosition[] = [
  { left: '12%', top: '36%', delay: '140ms' },
  { left: '28%', top: '24%', delay: '420ms' },
  { left: '41%', top: '38%', delay: '700ms' },
  { left: '55%', top: '26%', delay: '980ms' },
  { left: '69%', top: '36%', delay: '1.26s' },
  { left: '85%', top: '28%', delay: '1.54s' },
  { left: '20%', top: '58%', delay: '1.82s' },
  { left: '37%', top: '70%', delay: '2.1s' },
  { left: '53%', top: '60%', delay: '2.38s' },
  { left: '71%', top: '68%', delay: '2.66s' },
  { left: '88%', top: '58%', delay: '2.94s' },
]

const MILESTONE_PROFILES: Readonly<Record<LearningCompletionCelebration, {
  bursts: readonly CelebrationPosition[]
  confetti: readonly ConfettiPosition[]
  sparkles: readonly CelebrationPosition[]
  rays: readonly number[]
  modifierClassName: string
}>> = {
  subregion: {
    bursts: MEDIUM_BURSTS,
    confetti: MEDIUM_CONFETTI,
    sparkles: MEDIUM_SPARKLES,
    rays: FIREWORK_RAYS,
    modifierClassName: '',
  },
  continent: {
    bursts: BIG_BURSTS,
    confetti: BIG_CONFETTI,
    sparkles: BIG_SPARKLES,
    rays: FIREWORK_RAYS,
    modifierClassName: 'world-learning-milestone-big',
  },
  world: {
    bursts: WORLD_BURSTS,
    confetti: WORLD_CONFETTI,
    sparkles: WORLD_SPARKLES,
    rays: WORLD_FIREWORK_RAYS,
    modifierClassName: 'world-learning-milestone-world',
  },
}

export function LearningSetCelebration() {
  return (
    <div data-celebration-level="set" className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="world-learning-set-glow absolute inset-0 rounded-[inherit] border border-green-300/40" />
      <div className="world-learning-set-shine absolute inset-0" />
      {SET_TWINKLES.map((twinkle, index) => (
        <span
          key={index}
          className="world-learning-set-twinkle absolute size-1 rounded-full bg-emerald-100 shadow-[0_0_8px_rgba(167,243,208,0.9)]"
          style={{ left: twinkle.left, right: twinkle.right, top: twinkle.top, bottom: twinkle.bottom, animationDelay: twinkle.delay }}
        />
      ))}
    </div>
  )
}

export function LearningMilestoneCelebration({ level }: { level: LearningCompletionCelebration }) {
  const profile = MILESTONE_PROFILES[level]

  return (
    <div
      data-celebration-level={level}
      className={`world-learning-milestone pointer-events-none absolute inset-0 overflow-hidden ${profile.modifierClassName}`}
      aria-hidden="true"
    >
      <div className="world-learning-milestone-glow absolute inset-0" />
      {profile.bursts.map((burst, burstIndex) => (
        <span key={`burst-${burstIndex}`} className="world-learning-firework absolute" style={{ left: burst.left, top: burst.top }}>
          {profile.rays.map(angle => (
            <span
              key={angle}
              className="world-learning-firework-ray"
              style={{ '--learning-firework-angle': `${angle}deg`, '--learning-firework-delay': burst.delay } as CSSProperties}
            />
          ))}
          <span className="world-learning-firework-core" style={{ animationDelay: burst.delay }} />
        </span>
      ))}
      {profile.confetti.map((piece, index) => (
        <span
          key={`confetti-${index}`}
          className="world-learning-confetti absolute"
          style={{ left: piece.left, top: piece.top, '--learning-confetti-delay': piece.delay, '--learning-confetti-rotate': piece.rotate } as CSSProperties}
        />
      ))}
      {profile.sparkles.map((sparkle, index) => (
        <span
          key={`sparkle-${index}`}
          className="world-learning-sparkle absolute size-2"
          style={{ left: sparkle.left, top: sparkle.top, animationDelay: sparkle.delay }}
        />
      ))}
    </div>
  )
}
