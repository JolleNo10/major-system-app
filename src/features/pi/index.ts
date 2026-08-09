// Required architecture before modification:
// docs/architecture/features/PI.md
//
// Public interface of the pi feature. External code (app/ and other
// features) imports from '@/features/pi'; everything else in this folder
// is internal. Keep this surface small.

export { PiDrill } from '@/features/pi/PiDrill'
export { PI_PAIRS } from '@/features/pi/shared/piDigits'
export { bestFromStartReach, bestReach, loadPiSessions, type PiPositionStat, type PiSession, rankPiPositions } from '@/features/pi/shared/piStats'
export { getPiRangeScope, getPiSegmentScope, piPairItemId } from '@/features/pi/shared/piLearning'
