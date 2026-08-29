import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const practiceDirectory = resolve(process.cwd(), 'src/features/world-countries/practice')
const practiceSourceFiles = readdirSync(practiceDirectory)
  .filter(fileName => /\.(ts|tsx)$/.test(fileName) && !fileName.includes('.test.'))
  .map(fileName => resolve(practiceDirectory, fileName))
const learningModesPath = resolve(process.cwd(), 'src/features/world-countries/learning/learnPracticeModes.ts')

describe('Practice ownership', () => {
  it('keeps top-level Practice and Quiz implementation independent from Drill internals', () => {
    for (const filePath of practiceSourceFiles) {
      expect(readFileSync(filePath, 'utf8')).not.toMatch(/from ['"][^'\"]*\/drill(?:\/|['"])/)
    }
  })

  it('keeps the combined Learning and Practice setup type out of Learning', () => {
    const source = readFileSync(learningModesPath, 'utf8')

    expect(source).not.toMatch(/from ['"][^'\"]*\/practice(?:\/|['"])/)
    expect(source).not.toContain('WorldCountriesLearnPracticeMode')
  })
})
