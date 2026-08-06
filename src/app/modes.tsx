import type { ComponentType } from 'react'
import type { Mode, AnswerMode } from '@/core/types'
import { DecodingDrill, EncodingDrill, RepetitionDrill, ReverseSoundKeyDrill, SequenceDrill, SoundKeyDrill, SpeedRound, WeakSpots } from '@/features/major-system'
import { PiDrill } from '@/features/pi'
import { MajorCardsDrill, ThemedCardsDrill, PaoCardsDrill } from '@/features/cards'

// Single source of truth for every non-home mode: its header title, the drill
// component, and the ModeSelector card. Because it is Record<DrillMode, …>,
// TypeScript enforces that adding a Mode wires up all three — no more keeping
// MODE_TITLES, the App render switch, and ModeSelector's arrays in sync by hand.

export type DrillMode = Exclude<Mode, 'home'>

export interface ModeDef {
  title: string                                        // header title
  component: ComponentType<{ answerMode: AnswerMode }> // drill rendered in <main>
  group: 'major-system' | 'application'                // ModeSelector section
  hideAnswerToggle?: boolean                           // header omits the MC/typing toggle
  // ModeSelector card
  emoji: string
  subtitle: string
  description: string
  accent: string
}

export const HOME_TITLE = 'Mnemonics'

export const MODES: Record<DrillMode, ModeDef> = {
  encoding: {
    title: 'Encoding',
    component: EncodingDrill,
    group: 'major-system',
    emoji: '🧠',
    subtitle: 'Number → Word',
    description: 'See a number 00–99, recall its associated word',
    accent: 'group-hover:border-violet-500/60 group-hover:shadow-violet-900/20',
  },
  decoding: {
    title: 'Decoding',
    component: DecodingDrill,
    group: 'major-system',
    emoji: '🔍',
    subtitle: 'Word → Number',
    description: 'See a word, recall which number it represents',
    accent: 'group-hover:border-blue-500/60 group-hover:shadow-blue-900/20',
  },
  repetition: {
    title: 'Repetition',
    component: RepetitionDrill,
    group: 'major-system',
    emoji: '🔁',
    subtitle: 'Spaced repetition',
    description: 'Practice what\'s due — SM-2 schedules the next session automatically',
    accent: 'group-hover:border-violet-500/60 group-hover:shadow-violet-900/20',
  },
  'sound-key': {
    title: 'Sound Key',
    component: SoundKeyDrill,
    group: 'major-system',
    emoji: '🔢',
    subtitle: 'Digit → Sounds',
    description: 'What are the sounds for each digit 0–9?',
    accent: 'group-hover:border-emerald-500/60 group-hover:shadow-emerald-900/20',
  },
  'reverse-sound-key': {
    title: 'Reverse Sound Key',
    component: ReverseSoundKeyDrill,
    group: 'major-system',
    emoji: '🔤',
    subtitle: 'Sound → Digit',
    description: 'Which sound belongs to which digit?',
    accent: 'group-hover:border-teal-500/60 group-hover:shadow-teal-900/20',
  },
  sequence: {
    title: 'Sequences',
    component: SequenceDrill,
    group: 'major-system',
    emoji: '🔗',
    subtitle: 'Long number sequences',
    description: 'Encode and decode number sequences pair by pair',
    accent: 'group-hover:border-orange-500/60 group-hover:shadow-orange-900/20',
  },
  'speed-round': {
    title: 'Speed Round',
    component: SpeedRound,
    group: 'major-system',
    hideAnswerToggle: true,
    emoji: '⚡',
    subtitle: '60 seconds',
    description: 'How many encodings can you do in 60 seconds?',
    accent: 'group-hover:border-yellow-500/60 group-hover:shadow-yellow-900/20',
  },
  'weak-spots': {
    title: 'Weak Spots',
    component: WeakSpots,
    group: 'major-system',
    emoji: '🎯',
    subtitle: 'Your worst numbers',
    description: 'Drill on the numbers you make the most mistakes on',
    accent: 'group-hover:border-red-500/60 group-hover:shadow-red-900/20',
  },
  'pi-digits': {
    title: 'Pi',
    component: PiDrill,
    group: 'application',
    emoji: '𝝅',
    subtitle: 'Memo · Recite · Train · Anchors',
    description: 'Memorise and recite the digits of π using major system words',
    accent: 'group-hover:border-cyan-500/60 group-hover:shadow-cyan-900/20',
  },
  cards: {
    title: 'Card Deck',
    component: MajorCardsDrill,
    group: 'application',
    emoji: '🃏',
    subtitle: 'Encode 52 cards',
    description: 'Each card maps to a number — drill the word for every card in the deck',
    accent: 'group-hover:border-rose-500/60 group-hover:shadow-rose-900/20',
  },
  'themed-cards': {
    title: 'Themed Deck',
    component: ThemedCardsDrill,
    group: 'application',
    emoji: '🎭',
    subtitle: 'A person per card',
    description: 'Each suit is its own cast — recall the person for every card',
    accent: 'group-hover:border-fuchsia-500/60 group-hover:shadow-fuchsia-900/20',
  },
  'pao-cards': {
    title: 'PAO Deck',
    component: PaoCardsDrill,
    group: 'application',
    emoji: '🎬',
    subtitle: 'Person · Action · Object',
    description: 'Every card has a person, action and object — memorise the deck in 3-card images',
    accent: 'group-hover:border-purple-500/60 group-hover:shadow-purple-900/20',
  },
}

export const MODE_ENTRIES = Object.entries(MODES) as [DrillMode, ModeDef][]
