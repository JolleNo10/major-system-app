import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { WordsProvider } from './context/WordsContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WordsProvider>
      <App />
    </WordsProvider>
  </StrictMode>,
)
