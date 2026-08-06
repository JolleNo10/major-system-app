import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/app/index.css'
import App from '@/app/App'
import { WordsProvider } from '@/features/major-system/WordsContext'
import { CardWordsProvider } from '@/features/cards/CardWordsContext'
import { PaoCardsProvider } from '@/features/pao/PaoCardsContext'
import { SoundKeyProvider } from '@/features/major-system/SoundKeyContext'
import { SettingsProvider } from '@/app/settings/SettingsContext'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { initAttempts } from '@/core/scoring/attemptStore'

// Open IndexedDB and run the one-time attempts migration at startup.
initAttempts()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <WordsProvider>
        <CardWordsProvider>
          <PaoCardsProvider>
            <SoundKeyProvider>
              <PageLayoutProvider>
                <App />
              </PageLayoutProvider>
            </SoundKeyProvider>
          </PaoCardsProvider>
        </CardWordsProvider>
      </WordsProvider>
    </SettingsProvider>
  </StrictMode>,
)
