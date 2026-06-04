import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SoundProvider } from 'react-sounds'
import './index.css'
import App from './App.tsx'

document.documentElement.setAttribute('data-theme', 'dark')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SoundProvider preload={['ui/pop_open', 'arcade/level_up', 'arcade/coin_bling', 'game/miss', 'ambient/heartbeat', 'ui/button_soft', 'ui/button_medium', 'arcade/power_up']}>
      <App />
    </SoundProvider>
  </StrictMode>,
)
