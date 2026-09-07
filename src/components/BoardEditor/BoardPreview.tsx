import { useCallback, useEffect, useMemo, useState } from 'react'
import BoardBackground from '../Backgrounds/BoardBackground'
import GameBoard from '../Board/GameBoard'
import QuestionView from '../Question/QuestionView'
import { useSounds } from '../../hooks/useSounds'
import type { Game, Tile } from '../../types/game'
import ImageCheckPanel from './ImageCheckPanel'
import styles from './BoardPreview.module.css'

interface Props {
  game: Game
  /** How many ruter the author has actually filled in, shown as a reminder. */
  filledCount: number
  totalCount: number
  onClose: () => void
}

interface ActiveTile {
  categoryIndex: number
  tileIndex: number
}

const tileKey = (ci: number, ti: number) => `${ci}-${ti}`

/**
 * Plays the board the way a game would, without being a game: no teams, no
 * points, no socket session and nothing saved. Tiles are never consumed — an
 * opened one is only marked as checked — so the author can go back and forth
 * while fixing a question.
 */
export default function BoardPreview({ game, filledCount, totalCount, onClose }: Props) {
  const [active, setActive] = useState<ActiveTile | null>(null)
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  const [showImages, setShowImages] = useState(false)
  const { playOpen, playClick, playHover } = useSounds()

  const activeTile: Tile | null = active
    ? game.categories[active.categoryIndex]?.tiles[active.tileIndex] ?? null
    : null

  const closeQuestion = useCallback(() => setActive(null), [])

  // Esc closes the question first, then the preview itself.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (active) setActive(null)
      else onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [active, onClose])

  const openTile = useCallback((ci: number, ti: number) => {
    playOpen()
    setSeen(prev => new Set(prev).add(tileKey(ci, ti)))
    setActive({ categoryIndex: ci, tileIndex: ti })
  }, [playOpen])

  const isSeen = useCallback((ci: number, ti: number) => seen.has(tileKey(ci, ti)), [seen])

  const themeStyle = useMemo(
    () =>
      game.theme
        ? ({
            ...(game.theme.bg ? { '--color-bg': game.theme.bg } : {}),
            ...(game.theme.accent
              ? { '--color-accent': game.theme.accent, '--color-btn-primary': game.theme.accent }
              : {}),
          } as React.CSSProperties)
        : undefined,
    [game.theme],
  )

  const isFootball = game.theme?.decorations === 'football'

  return (
    <div className={`${styles.overlay} ${isFootball ? styles.football : ''}`} style={themeStyle}>
      <BoardBackground id={game.theme?.decorations} image={game.theme?.backgroundImage} />

      <header className={styles.topBar}>
        <div className={styles.titles}>
          <span className={styles.badge}>Forhåndsvisning</span>
          <span className={styles.title}>{game.title.trim() || 'Uten tittel'}</span>
          <span className={styles.meta}>
            {filledCount} av {totalCount} ruter fylt ut
          </span>
        </div>

        <div className={styles.controls}>
          <button
            className={`${styles.btn} ${showImages ? styles.btnActive : ''}`}
            onMouseEnter={playHover}
            onClick={() => { playClick(); setShowImages(v => !v) }}
            aria-pressed={showImages}
          >
            Bildesjekk
          </button>
          <button
            className={styles.btn}
            onMouseEnter={playHover}
            onClick={() => { playClick(); setSeen(new Set()) }}
            disabled={seen.size === 0}
          >
            Nullstill merking
          </button>
          <button className={styles.btn} onMouseEnter={playHover} onClick={() => { playClick(); onClose() }}>
            Lukk forhåndsvisning
          </button>
        </div>
      </header>

      <main className={styles.boardArea}>
        <GameBoard
          categories={game.categories}
          onTileClick={openTile}
          theme={game.theme}
          isSeen={isSeen}
        />
      </main>

      {showImages && (
        <ImageCheckPanel
          game={game}
          onGoToTile={(ci, ti) => { setShowImages(false); openTile(ci, ti) }}
        />
      )}

      {active && activeTile && (
        // Keyed on the tile so jumping straight from one question to another
        // (via the image panel) starts unrevealed instead of inheriting state.
        <QuestionView
          key={tileKey(active.categoryIndex, active.tileIndex)}
          tile={activeTile}
          previewMode
          onClose={closeQuestion}
        />
      )}
    </div>
  )
}
