import type { WorldCountriesLearningMode } from '@/features/world-countries/learning/learnPracticeModes'
import type { WorldCountriesPracticeMode } from '@/features/world-countries/practice/practiceModes'

/** Combined setup choice presented by Drill's Learn & Practise coordinator. */
export type WorldCountriesLearnPracticeMode = WorldCountriesLearningMode | WorldCountriesPracticeMode
