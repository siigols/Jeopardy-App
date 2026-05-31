import { useState } from 'react'
import type { Team, Tile, Game } from '../types/game'
import GameBoard from '../components/Board/GameBoard'
import QuestionView from '../components/Question/QuestionView'
import FootballDecorations from '../components/FootballDecorations'
import { useSounds } from '../hooks/useSounds'
import styles from './GameScreen.module.css'

const TEAM_COLORS = ['#e74c3c', '#3b82f6', '#22c55e', '#f97316']

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
  const [categories, setCategories] = useState(game.categories)
  const [teams, setTeams] = useState(initialTeams)
  const [active, setActive] = useState<ActiveTile | null>(null)
  const { playOpen } = useSounds()

  const teamColors = Object.fromEntries(
    teams.map((team, index) => [team.id, TEAM_COLORS[index % TEAM_COLORS.length]])
  )

  const activeTile: Tile | null = active
    ? categories[active.categoryIndex].tiles[active.tileIndex]
    : null

  function handleTileClick(ci: number, ti: number) {
    playOpen()
    setActive({ categoryIndex: ci, tileIndex: ti })
  }

  function handleAward(teamId: string | null) {
    if (!active) return
    const points = categories[active.categoryIndex].tiles[active.tileIndex].points

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

    // Check if game is now complete — transition immediately without showing the board
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


  // Apply per-board theme overrides as CSS custom properties
  const themeStyle = game.theme ? {
    ...(game.theme.bg ? { '--color-bg': game.theme.bg } : {}),
    ...(game.theme.accent ? { '--color-accent': game.theme.accent, '--color-btn-primary': game.theme.accent } : {}),
  } as React.CSSProperties : undefined

  const isFootball = game.theme?.decorations === 'football'

  return (
    <div className={`${styles.screen} ${isFootball ? styles.footballScreen : ''}`} style={themeStyle}>
      {isFootball && <FootballDecorations />}
      <header className={styles.topBar}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{game.title}</h1>
          <div className={styles.controls}>
            <button className={styles.iconBtn} onClick={onThemeToggle} title="Bytt tema">
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <button className={styles.iconBtn} onClick={onReset} title="Nytt spill">
              ↩
            </button>
          </div>
        </div>

        <div className={styles.scoresRow}>
          {teams.map((team, i) => (
            <div
              key={team.id}
              className={styles.teamChip}
              style={{ '--team-color': teamColors[team.id] } as React.CSSProperties}
            >
              <span className={styles.teamName}>{team.name}</span>
              <button className={styles.adjBtn} onClick={() => handleAdjust(team.id, -100)} aria-label="trekk fra">−</button>
              <span key={team.score} className={styles.teamScore}>{team.score}</span>
              <button className={styles.adjBtn} onClick={() => handleAdjust(team.id, 100)} aria-label="legg til">+</button>
            </div>
          ))}
        </div>
      </header>

      <main className={styles.boardArea}>
        <GameBoard
          categories={categories}
          onTileClick={handleTileClick}
          theme={game.theme}
        />
      </main>

      {activeTile && (
        <QuestionView tile={activeTile} teams={teams} teamColors={teamColors} onAward={handleAward} />
      )}
    </div>
  )
}
