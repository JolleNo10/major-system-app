import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { WordsProvider } from './context/WordsContext'
import { SettingsProvider } from './context/SettingsContext'
import { initAttempts } from './data/attemptStore'

// Open IndexedDB and run the one-time attempts migration at startup.
initAttempts()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <WordsProvider>
        <App />
      </WordsProvider>
    </SettingsProvider>
  </StrictMode>,
)
