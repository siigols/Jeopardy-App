import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SoundProvider } from 'react-sounds'
import './index.css'
import BuzzerApp from './BuzzerApp.tsx'

document.documentElement.setAttribute('data-theme', 'dark')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SoundProvider preload={['ambient/heartbeat', 'ui/button_hard', 'ui/button_soft']}>
      <BuzzerApp />
    </SoundProvider>
  </StrictMode>,
)
