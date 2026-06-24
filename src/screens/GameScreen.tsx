import { useState, useEffect, useRef } from 'react'
import type { Team, Tile, Game } from '../types/game'
import type { TeamInfo } from '../types/socket-events'
import { loadGameState, saveGameState } from '../utils/sessionStore'
import GameBoard from '../components/Board/GameBoard'
import QuestionView from '../components/Question/QuestionView'
import SessionPanel from '../components/SessionPanel/SessionPanel'
import FootballDecorations from '../components/FootballDecorations'
import { useSounds } from '../hooks/useSounds'
import { useSocket } from '../hooks/useSocket'
import styles from './GameScreen.module.css'

const TEAM_COLORS = ['#e74c3c', '#3b82f6', '#22c55e', '#f97316']

function generateCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

interface Props {
  game: Game
  teams: Team[]
  theme: 'dark' | 'light'
  onThemeToggle: () => void
  onReset: () => void
  onGameComplete: (teams: Team[]) => void
}

interface ActiveTile {
  categoryIndex: number
  tileIndex: number
}

export default function GameScreen({ game, teams: initialTeams, theme, onThemeToggle, onReset, onGameComplete }: Props) {
  const savedGame = useRef(loadGameState()).current

  const [categories, setCategories] = useState(savedGame?.categories ?? game.categories)
  const [teams, setTeams] = useState(savedGame?.teams ?? initialTeams)
  const [active, setActive] = useState<ActiveTile | null>(null)
  const [buzzerWinner, setBuzzerWinner] = useState<TeamInfo | null>(null)
  const [showBuzzerPanel, setShowBuzzerPanel] = useState(false)
  const { playOpen, playClick, playHover } = useSounds()
  const socket = useSocket()
  const sessionCode = useRef(savedGame?.sessionCode ?? generateCode()).current

  // Persist in-game state on changes
  useEffect(() => {
    saveGameState({ categories, teams, sessionCode })
  }, [categories, teams, sessionCode])

  const teamColors = Object.fromEntries(
    teams.map((team, index) => [team.id, TEAM_COLORS[index % TEAM_COLORS.length]])
  )

  const activeTile: Tile | null = active
    ? categories[active.categoryIndex].tiles[active.tileIndex]
    : null

  // Register session with server once on mount
  useEffect(() => {
    const teamInfos: TeamInfo[] = teams.map((team, index) => ({
      index,
      name: team.name,
      color: TEAM_COLORS[index % TEAM_COLORS.length],
    }))

    function register() {
      socket.emit('create-session', { code: sessionCode, teams: teamInfos }, () => {})
    }

    if (socket.connected) {
      register()
    }
    socket.on('connect', register)

    socket.on('buzzed', (winner) => {
      setBuzzerWinner(winner)
    })

    return () => {
      socket.off('buzzed')
      socket.off('connect', register)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleTileClick(ci: number, ti: number) {
    playOpen()
    setActive({ categoryIndex: ci, tileIndex: ti })
    setBuzzerWinner(null)
    socket.emit('question-open', { code: sessionCode })
  }

  function handleAward(teamId: string | null, awardedPoints?: number) {
    if (!active) return
    const tilePoints = categories[active.categoryIndex].tiles[active.tileIndex].points
    const points = awardedPoints ?? tilePoints

    const updatedTeams = teamId !== null
      ? teams.map(t => t.id === teamId ? { ...t, score: t.score + points } : t)
      : teams

    if (teamId !== null) {
      setTeams(updatedTeams)
    }

    const nextCategories = categories.map(cat => ({ ...cat, tiles: [...cat.tiles] }))
    nextCategories[active.categoryIndex].tiles[active.tileIndex] = {
      ...nextCategories[active.categoryIndex].tiles[active.tileIndex],
      answered: true,
    }
    setCategories(nextCategories)
    setBuzzerWinner(null)
    socket.emit('question-close', { code: sessionCode })

    const gameComplete = nextCategories.every(cat => cat.tiles.every(t => t.answered))
    if (gameComplete) {
      onGameComplete(updatedTeams)
    } else {
      setActive(null)
    }
  }

  function handleAdjust(teamId: string, delta: number) {
    playClick()
    setTeams(prev =>
      prev.map(t => t.id === teamId ? { ...t, score: t.score + delta } : t)
    )
  }

  const themeStyle = game.theme ? {
    ...(game.theme.bg ? { '--color-bg': game.theme.bg } : {}),
    ...(game.theme.accent ? { '--color-accent': game.theme.accent, '--color-btn-primary': game.theme.accent } : {}),
  } as React.CSSProperties : undefined

  const isFootball = game.theme?.decorations === 'football'

  const sessionTeams = teams.map((team, index) => ({
    name: team.name,
    color: TEAM_COLORS[index % TEAM_COLORS.length],
    index,
  }))

  return (
    <div className={`${styles.screen} ${isFootball ? styles.footballScreen : ''}`} style={themeStyle}>
      {isFootball && <FootballDecorations />}
      <header className={styles.topBar}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{game.title}</h1>
          <div className={styles.controls}>
            <button
              className={styles.iconBtn}
              onMouseEnter={playHover}
              onClick={() => { playClick(); setShowBuzzerPanel(p => !p) }}
              title="Buzzer-panel"
              style={{ fontSize: '1rem' }}
            >
              📡
            </button>
            <button className={styles.iconBtn} onMouseEnter={playHover} onClick={() => { playClick(); onThemeToggle() }} title="Bytt tema">
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <button className={styles.iconBtn} onMouseEnter={playHover} onClick={() => { playClick(); onReset() }} title="Nytt spill">
              ↩
            </button>
          </div>
        </div>

        <div className={styles.scoresRow}>
          {teams.map((team) => (
            <div
              key={team.id}
              className={styles.teamChip}
              style={{ '--team-color': teamColors[team.id] } as React.CSSProperties}
            >
              <span className={styles.teamName}>{team.name}</span>
              <button className={styles.adjBtn} onMouseEnter={playHover} onClick={() => handleAdjust(team.id, -100)} aria-label="trekk fra">−</button>
              <span key={team.score} className={styles.teamScore}>{team.score}</span>
              <button className={styles.adjBtn} onMouseEnter={playHover} onClick={() => handleAdjust(team.id, 100)} aria-label="legg til">+</button>
            </div>
          ))}
        </div>

        {showBuzzerPanel && (
          <SessionPanel sessionCode={sessionCode} teams={sessionTeams} />
        )}
      </header>

      <main className={styles.boardArea}>
        <GameBoard
          categories={categories}
          onTileClick={handleTileClick}
          theme={game.theme}
        />
      </main>

      {activeTile && (
        <QuestionView
          tile={activeTile}
          teams={teams}
          teamColors={teamColors}
          buzzerWinner={buzzerWinner}
          onAward={handleAward}
        />
      )}
    </div>
  )
}
