import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import BuzzerApp from './BuzzerApp.tsx'

document.documentElement.setAttribute('data-theme', 'dark')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BuzzerApp />
  </StrictMode>,
)
