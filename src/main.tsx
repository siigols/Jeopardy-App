import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SoundProvider } from 'react-sounds'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import CodeGate from './components/CodeGate/CodeGate.tsx'
import BoardEditorScreen from './screens/BoardEditorScreen.tsx'

document.documentElement.setAttribute('data-theme', 'dark')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SoundProvider preload={['ui/pop_open', 'arcade/level_up', 'arcade/coin_bling', 'game/miss', 'ambient/heartbeat', 'ui/button_soft', 'ui/button_medium', 'arcade/power_up']}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route
            path="/boards/new"
            element={
              <CodeGate>
                <BoardEditorScreen mode="create" />
              </CodeGate>
            }
          />
          <Route
            path="/boards/:id/edit"
            element={
              <CodeGate>
                <BoardEditorScreen mode="edit" />
              </CodeGate>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SoundProvider>
  </StrictMode>,
)
