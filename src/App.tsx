import { useState, useEffect } from 'react'
import type { Team } from './types/game'
import sampleGame from './data/sampleGame'
import SetupScreen from './screens/SetupScreen'
import GameScreen from './screens/GameScreen'

type AppState = 'setup' | 'game'
type Theme = 'dark' | 'light'

export default function App() {
  const [appState, setAppState] = useState<AppState>('setup')
  const [teams, setTeams] = useState<Team[]>([])
  const [theme, setTheme] = useState<Theme>('dark')
  const [gameKey, setGameKey] = useState(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function handleStart(selectedTeams: Team[]) {
    setTeams(selectedTeams)
    setAppState('game')
  }

  function handleReset() {
    setGameKey(k => k + 1)
    setAppState('setup')
  }

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  if (appState === 'setup') {
    return <SetupScreen onStart={handleStart} />
  }

  return (
    <GameScreen
      key={gameKey}
      game={sampleGame}
      teams={teams}
      theme={theme}
      onThemeToggle={toggleTheme}
      onReset={handleReset}
    />
  )
}
