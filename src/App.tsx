import { useState, useEffect } from 'react'
import type { Team, Game } from './types/game'
import { ALL_BOARDS } from './data/index'
import BoardSelectScreen from './screens/BoardSelectScreen'
import SetupScreen from './screens/SetupScreen'
import GameScreen from './screens/GameScreen'
import TiebreakerScreen from './screens/TiebreakerScreen'
import PodiumScreen from './screens/PodiumScreen'

type AppState = 'board-select' | 'setup' | 'game' | 'tiebreaker' | 'podium'
type Theme = 'dark' | 'light'

export default function App() {
  const [appState, setAppState] = useState<AppState>('board-select')
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [finalTeams, setFinalTeams] = useState<Team[]>([])
  const [tiedTeams, setTiedTeams] = useState<Team[]>([])
  const [theme, setTheme] = useState<Theme>('dark')
  const [gameKey, setGameKey] = useState(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function handleBoardSelect(game: Game) {
    setSelectedGame(game)
    setAppState('setup')
  }

  function handleStart(selectedTeams: Team[]) {
    setTeams(selectedTeams)
    setAppState('game')
  }

  function handleReset() {
    setGameKey(k => k + 1)
    setAppState('board-select')
  }

  function handleGameComplete(endTeams: Team[]) {
    // Check for tie at the top
    const sorted = [...endTeams].sort((a, b) => b.score - a.score)
    const topScore = sorted[0].score
    const tied = sorted.filter(t => t.score === topScore)

    if (tied.length > 1) {
      // Tie for first — go to tiebreaker
      setFinalTeams(endTeams)
      setTiedTeams(tied)
      setAppState('tiebreaker')
    } else {
      setFinalTeams(endTeams)
      setAppState('podium')
    }
  }

  function handleTiebreakerResolved(updatedTeams: Team[]) {
    setFinalTeams(updatedTeams)
    setAppState('podium')
  }

  function handlePlayAgain() {
    setGameKey(k => k + 1)
    setAppState('game')
  }

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  if (appState === 'board-select') {
    return <BoardSelectScreen boards={ALL_BOARDS} onSelect={handleBoardSelect} />
  }

  if (appState === 'setup' && selectedGame) {
    return (
      <SetupScreen
        gameTitle={selectedGame.title}
        onStart={handleStart}
        onBack={() => setAppState('board-select')}
      />
    )
  }

  if (appState === 'game' && selectedGame) {
    return (
      <GameScreen
        key={gameKey}
        game={selectedGame}
        teams={teams}
        theme={theme}
        onThemeToggle={toggleTheme}
        onReset={handleReset}
        onGameComplete={handleGameComplete}
      />
    )
  }

  if (appState === 'tiebreaker' && selectedGame) {
    return (
      <TiebreakerScreen
        tiedTeams={tiedTeams}
        allTeams={finalTeams}
        question={selectedGame.tiebreaker}
        onResolved={handleTiebreakerResolved}
      />
    )
  }

  if (appState === 'podium' && selectedGame) {
    return (
      <PodiumScreen
        teams={finalTeams}
        game={selectedGame}
        onPlayAgain={handlePlayAgain}
        onNewBoard={handleReset}
      />
    )
  }

  return null
}
