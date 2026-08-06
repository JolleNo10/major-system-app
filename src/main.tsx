import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { WordsProvider } from './context/WordsContext'
import { CardWordsProvider } from './context/CardWordsContext'
import { PaoCardsProvider } from './context/PaoCardsContext'
import { SoundKeyProvider } from './context/SoundKeyContext'
import { SettingsProvider } from './context/SettingsContext'
import { PageLayoutProvider } from './context/PageLayoutContext'
import { initAttempts } from './data/attemptStore'

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
