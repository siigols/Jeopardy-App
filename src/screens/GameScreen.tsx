import { useCallback, useEffect, useRef, useState } from 'react'
import GameBoard from '../components/Board/GameBoard'
import BoardBackground from '../components/Backgrounds/BoardBackground'
import QuestionView from '../components/Question/QuestionView'
import SessionPanel from '../components/SessionPanel/SessionPanel'
import { useSocket } from '../hooks/useSocket'
import { useSounds } from '../hooks/useSounds'
import { buzzerEnabledForType } from '../types/game'
import type { Game, Team, Tile } from '../types/game'
import type { TeamInfo } from '../types/socket-events'
import { loadGameState, saveGameState } from '../utils/sessionStore'
import styles from './GameScreen.module.css'

const TEAM_COLORS = ['#e74c3c', '#3b82f6', '#22c55e', '#f97316']

interface Props {
  game: Game
  teams: Team[]
  /** Owned by App so it survives into the tiebreaker. */
  sessionCode: string
  theme: 'dark' | 'light'
  onThemeToggle: () => void
  onReset: () => void
  onGameComplete: (teams: Team[]) => void
}

interface ActiveTile {
  categoryIndex: number
  tileIndex: number
}

export default function GameScreen({ game, teams: initialTeams, sessionCode, theme, onThemeToggle, onReset, onGameComplete }: Props) {
  const savedGame = useRef(loadGameState()).current

  const [categories, setCategories] = useState(savedGame?.categories ?? game.categories)
  const [teams, setTeams] = useState(savedGame?.teams ?? initialTeams)
  const [active, setActive] = useState<ActiveTile | null>(null)
  const [buzzerWinner, setBuzzerWinner] = useState<TeamInfo | null>(null)
  /** Team indices that have spent their one buzz this round, mirrored from the server. */
  const [usedBuzzes, setUsedBuzzes] = useState<number[]>([])
  const [showBuzzerPanel, setShowBuzzerPanel] = useState(false)
  const { playOpen, playHover } = useSounds()
  const socket = useSocket()

  // Persist in-game state on changes. The code is still written here as well as
  // in App's own state — that copy is what the one-shot migration in App reads.
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
      socket.emit('create-session', { code: sessionCode, teams: teamInfos }, (res) => {
        setUsedBuzzes(res.used)
      })
    }

    if (socket.connected) {
      register()
    }
    socket.on('connect', register)

    socket.on('buzzed', (winner) => {
      setBuzzerWinner(winner)
    })

    socket.on('buzz-state', ({ used }) => {
      setUsedBuzzes(used)
    })

    return () => {
      socket.off('buzzed')
      socket.off('buzz-state')
      socket.off('connect', register)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleTileClick(ci: number, ti: number) {
    playOpen()
    setActive({ categoryIndex: ci, tileIndex: ti })
    setBuzzerWinner(null)

    // Host-driven types take no buzz-ins. Closing rather than simply not opening
    // matters: it disarms phones still armed from the previous tile.
    const tile = categories[ci].tiles[ti]
    socket.emit(
      buzzerEnabledForType(tile.content.type) ? 'question-open' : 'question-close',
      { code: sessionCode },
    )
  }

  /**
   * Undoes a misclick: returns to the board without burning the tile. The whole
   * QuestionView unmounts, which is also what stops a beat-for-beat clip and the
   * tenable reveal timer — see BeatForBeatDisplay's note on resetting by unmount.
   */
  const closeQuestion = useCallback(() => {
    setActive(null)
    setBuzzerWinner(null)
    socket.emit('question-close', { code: sessionCode })
  }, [socket, sessionCode])

  // Esc backs out of an open question. Unlike the preview's two-level Esc, it
  // never leaves the game itself.
  useEffect(() => {
    if (!active) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeQuestion()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [active, closeQuestion])

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
    setTeams(prev =>
      prev.map(t => t.id === teamId ? { ...t, score: t.score + delta } : t)
    )
  }

  const themeStyle = game.theme ? {
    ...(game.theme.bg ? { '--color-bg': game.theme.bg } : {}),
    ...(game.theme.accent ? { '--color-accent': game.theme.accent, '--color-btn-primary': game.theme.accent } : {}),
  } as React.CSSProperties : undefined

  // The football class only compensates for the trophy image's height.
  const isFootball = game.theme?.decorations === 'football'

  const sessionTeams = teams.map((team, index) => ({
    name: team.name,
    color: TEAM_COLORS[index % TEAM_COLORS.length],
    index,
  }))

  return (
    <div className={`${styles.screen} ${isFootball ? styles.footballScreen : ''}`} style={themeStyle}>
      <BoardBackground id={game.theme?.decorations} image={game.theme?.backgroundImage} />
      <header className={styles.topBar}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{game.title}</h1>
          <div className={styles.controls}>
            <button
              className={styles.iconBtn}
              onMouseEnter={playHover}
              onClick={() => setShowBuzzerPanel(p => !p)}
              title="Buzzer-panel"
            >
              📡
            </button>
            <button className={styles.iconBtn} onMouseEnter={playHover} onClick={() => onThemeToggle()} title="Bytt tema">
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <button className={styles.iconBtn} onMouseEnter={playHover} onClick={() => onReset()} title="Nytt spill">
              ↩
            </button>
          </div>
        </div>

        <div className={styles.scoresRow}>
          {teams.map((team, index) => (
            <div
              key={team.id}
              className={`${styles.teamChip} ${usedBuzzes.includes(index) ? styles.teamChipSpent : ''}`}
              style={{ '--team-color': teamColors[team.id] } as React.CSSProperties}
              title={usedBuzzes.includes(index) ? 'Buzzeren er brukt' : 'Har buzzer igjen'}
            >
              <span className={styles.buzzDot} aria-hidden>{usedBuzzes.includes(index) ? '○' : '●'}</span>
              <span className={styles.teamName}>{team.name}</span>
              <button className={styles.adjBtn} onMouseEnter={playHover} onClick={() => handleAdjust(team.id, -100)} aria-label="trekk fra">−</button>
              <span key={team.score} className={styles.teamScore}>{team.score}</span>
              <button className={styles.adjBtn} onMouseEnter={playHover} onClick={() => handleAdjust(team.id, 100)} aria-label="legg til">+</button>
            </div>
          ))}
        </div>

        {showBuzzerPanel && (
          <SessionPanel
            sessionCode={sessionCode}
            teams={sessionTeams}
            usedBuzzes={usedBuzzes}
            onResetBuzzes={() => socket.emit('buzz-reset', { code: sessionCode })}
          />
        )}
      </header>

      <main className={styles.boardArea}>
        <GameBoard
          categories={categories}
          onTileClick={handleTileClick}
          theme={game.theme}
        />
      </main>

      {active && activeTile && (
        <QuestionView
          key={`${active.categoryIndex}-${active.tileIndex}`}
          tile={activeTile}
          teams={teams}
          teamColors={teamColors}
          buzzerWinner={buzzerWinner}
          onAward={handleAward}
          onClose={closeQuestion}
        />
      )}
    </div>
  )
}
