import { useState } from 'react'
import type { Team, Tile } from '../types/game'
import type { Game } from '../types/game'
import GameBoard from '../components/Board/GameBoard'
import QuestionView from '../components/Question/QuestionView'
import ScoreBoard from '../components/ScoreBoard/ScoreBoard'
import styles from './GameScreen.module.css'

interface Props {
  game: Game
  teams: Team[]
  theme: 'dark' | 'light'
  onThemeToggle: () => void
  onReset: () => void
}

interface ActiveTile {
  categoryIndex: number
  tileIndex: number
}

export default function GameScreen({ game, teams: initialTeams, theme, onThemeToggle, onReset }: Props) {
  const [categories, setCategories] = useState(game.categories)
  const [teams, setTeams] = useState(initialTeams)
  const [active, setActive] = useState<ActiveTile | null>(null)

  const activeTile: Tile | null = active
    ? categories[active.categoryIndex].tiles[active.tileIndex]
    : null

  function handleTileClick(ci: number, ti: number) {
    setActive({ categoryIndex: ci, tileIndex: ti })
  }

  function handleAward(teamId: string | null) {
    if (!active) return
    const points = categories[active.categoryIndex].tiles[active.tileIndex].points

    if (teamId !== null) {
      setTeams(prev =>
        prev.map(t => t.id === teamId ? { ...t, score: t.score + points } : t)
      )
    }

    setCategories(prev => {
      const next = prev.map(cat => ({ ...cat, tiles: [...cat.tiles] }))
      next[active.categoryIndex].tiles[active.tileIndex] = {
        ...next[active.categoryIndex].tiles[active.tileIndex],
        answered: true,
      }
      return next
    })

    setActive(null)
  }

  function handleAdjust(teamId: string, delta: number) {
    setTeams(prev =>
      prev.map(t => t.id === teamId ? { ...t, score: t.score + delta } : t)
    )
  }

  const allAnswered = categories.every(cat => cat.tiles.every(t => t.answered))

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <h1 className={styles.title}>{game.title}</h1>
        <div className={styles.topActions}>
          <button className={styles.iconBtn} onClick={onThemeToggle} title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className={styles.iconBtn} onClick={onReset} title="New game">
            ↩ Reset
          </button>
        </div>
      </div>

      <div className={styles.boardWrapper}>
        <GameBoard categories={categories} onTileClick={handleTileClick} />
      </div>

      {allAnswered && (
        <div className={styles.winBanner}>
          🎉 Game Over! Final scores above.
        </div>
      )}

      <ScoreBoard teams={teams} onAdjust={handleAdjust} />

      {activeTile && (
        <QuestionView tile={activeTile} teams={teams} onAward={handleAward} />
      )}
    </div>
  )
}
