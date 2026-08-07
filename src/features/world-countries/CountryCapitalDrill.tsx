import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MultipleChoice } from '@/core/ui/MultipleChoice'
import { ScoreBar } from '@/core/ui/ScoreBar'
import { TypingInput } from '@/core/ui/TypingInput'
import { countries, type Continent, type Country } from '@/features/world-countries/countries'
import {
  buildCountryQuestion,
  matchesPlaceName,
  pickCountry,
  type CountryQuestion,
  type CountryQuizDirection,
} from '@/features/world-countries/countryQuiz'
import type { AnswerMode } from '@/core/types'

const CONTINENTS: Continent[] = [
  'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania',
]

type ContinentFilter = Continent | 'All'

function makeQuestion(
  pool: Country[],
  direction: CountryQuizDirection,
  previousCountry?: string,
): CountryQuestion {
  return buildCountryQuestion(pickCountry(pool, previousCountry), countries, direction)
}

function CountryCapitalDrill({
  answerMode,
  direction,
  onDirectionChange,
}: {
  answerMode: AnswerMode
  direction: CountryQuizDirection
  onDirectionChange: (direction: CountryQuizDirection) => void
}) {
  const [continent, setContinent] = useState<ContinentFilter>('All')
  const [subregion, setSubregion] = useState('All')
  const [question, setQuestion] = useState(() => makeQuestion(countries, direction))
  const [answered, setAnswered] = useState<string | null>(null)
  const [answeredCorrect, setAnsweredCorrect] = useState<boolean | null>(null)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [covered, setCovered] = useState<Set<string>>(() => new Set())
  const nextTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const availableSubregions = useMemo(() => {
    const filtered = continent === 'All'
      ? countries
      : countries.filter(entry => entry.continent === continent)
    return [...new Set(filtered.map(entry => entry.subregion))].sort()
  }, [continent])

  const pool = useMemo(() => countries.filter(entry => (
    (continent === 'All' || entry.continent === continent)
    && (subregion === 'All' || entry.subregion === subregion)
  )), [continent, subregion])

  const resetSession = useCallback((nextPool: Country[]) => {
    if (nextTimer.current) clearTimeout(nextTimer.current)
    setQuestion(makeQuestion(nextPool, direction))
    setAnswered(null)
    setAnsweredCorrect(null)
    setCorrect(0)
    setWrong(0)
    setStreak(0)
    setBestStreak(0)
    setCovered(new Set())
  }, [direction])

  const firstPoolRender = useRef(true)
  useEffect(() => {
    if (firstPoolRender.current) {
      firstPoolRender.current = false
      return
    }
    resetSession(pool)
  }, [pool, resetSession])

  useEffect(() => () => {
    if (nextTimer.current) clearTimeout(nextTimer.current)
  }, [])

  const showNext = useCallback(() => {
    setQuestion(current => makeQuestion(pool, direction, current.entry.country))
    setAnswered(null)
    setAnsweredCorrect(null)
  }, [direction, pool])

  const handleAnswer = useCallback((value: string) => {
    if (answered !== null) return
    const isCorrect = matchesPlaceName(value, question.answer)
    setAnswered(value)
    setAnsweredCorrect(isCorrect)
    if (isCorrect) {
      setCorrect(count => count + 1)
      setStreak(count => {
        const next = count + 1
        setBestStreak(best => Math.max(best, next))
        return next
      })
      setCovered(previous => new Set(previous).add(question.entry.country))
    } else {
      setWrong(count => count + 1)
      setStreak(0)
    }
    nextTimer.current = setTimeout(showNext, 1400)
  }, [answered, question, showNext])

  const selectContinent = (next: ContinentFilter) => {
    setContinent(next)
    setSubregion('All')
  }

  const questionLabel = direction === 'country-to-capital'
    ? 'What is the capital of'
    : 'Which country has the capital'
  const answerLabel = direction === 'country-to-capital' ? 'capital' : 'country'
  const progress = pool.length ? Math.round((covered.size / pool.length) * 100) : 0

  return (
    <div className="flex flex-col items-center gap-8 py-4 animate-fade-in">
      <div className="flex gap-1 p-1 rounded-lg bg-zinc-800">
        <button
          onClick={() => onDirectionChange('country-to-capital')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            direction === 'country-to-capital'
              ? 'bg-cyan-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Country → Capital
        </button>
        <button
          onClick={() => onDirectionChange('capital-to-country')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            direction === 'capital-to-country'
              ? 'bg-cyan-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Capital → Country
        </button>
      </div>

      <div className="w-full max-w-md space-y-3 -mt-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 shrink-0">Continent:</span>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Continent filter">
            {(['All', ...CONTINENTS] as ContinentFilter[]).map(item => (
              <button
                key={item}
                onClick={() => selectContinent(item)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  continent === item
                    ? 'bg-cyan-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {item === 'All' ? 'All' : item}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="country-subregion" className="text-xs text-zinc-500 shrink-0">Region:</label>
          <select
            id="country-subregion"
            value={subregion}
            onChange={event => setSubregion(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-500"
          >
            <option value="All">All regions</option>
            {availableSubregions.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <span className="text-xs tabular-nums text-zinc-500 shrink-0">{pool.length}</span>
        </div>
      </div>

      <div className="w-full max-w-md text-center">
        <p className="text-xs text-zinc-600 uppercase tracking-widest mb-3">
          {questionLabel}
        </p>
        <h1 className="text-4xl sm:text-5xl font-black text-zinc-100 leading-tight tracking-tight break-words">
          {question.prompt}
        </h1>
        <p className="mt-3 text-sm text-zinc-500">{question.entry.continent} · {question.entry.subregion}</p>
      </div>

      <div className="w-full max-w-md">
        {answerMode === 'multiple-choice' ? (
          <MultipleChoice
            options={question.options}
            correctAnswer={question.answer}
            onAnswer={handleAnswer}
            answered={answered}
          />
        ) : (
          <TypingInput
            onAnswer={handleAnswer}
            answeredCorrect={answeredCorrect}
            correctAnswer={question.answer}
            placeholder={`Type the ${answerLabel}...`}
          />
        )}
      </div>

      {answered !== null && (
        <div className={`w-full max-w-md rounded-xl border px-4 py-3 text-center text-sm ${
          answeredCorrect
            ? 'border-green-500/30 bg-green-500/10 text-green-300'
            : 'border-red-500/30 bg-red-500/10 text-red-300'
        }`}>
          <span className="font-semibold">{question.entry.country}</span>
          <span className="text-zinc-500"> — </span>
          <span className="font-semibold">{question.entry.capital}</span>
        </div>
      )}

      <ScoreBar correct={correct} wrong={wrong} streak={streak} bestStreak={bestStreak} />

      <div className="w-full max-w-md pt-1">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-zinc-500">Countries recalled this session</span>
          <span className="text-zinc-400 tabular-nums">{covered.size}/{pool.length} · {progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full bg-cyan-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <button
          onClick={() => resetSession(pool)}
          className="mt-4 w-full min-h-[40px] rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
        >
          Reset session
        </button>
      </div>
    </div>
  )
}

export function WorldCountriesDrill({ answerMode }: { answerMode: AnswerMode }) {
  const [direction, setDirection] = useState<CountryQuizDirection>('country-to-capital')

  return <CountryCapitalDrill
    key={direction}
    answerMode={answerMode}
    direction={direction}
    onDirectionChange={setDirection}
  />
}
