import type { Game } from '../types/game'
import { useSounds } from '../hooks/useSounds'
import styles from './BoardSelectScreen.module.css'

interface Props {
  boards: Game[]
  onSelect: (game: Game) => void
}

export default function BoardSelectScreen({ boards, onSelect }: Props) {
  const { playClick, playHover } = useSounds()

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>Jeopardy!</h1>
      <p className={styles.subtitle}>Velg brett</p>

      <div className={styles.grid}>
        {boards.map((board, i) => {
          const colors = board.theme?.categoryColors ?? []
          return (
            <button
              key={i}
              className={styles.card}
              onMouseEnter={playHover}
              onClick={() => { playClick(); onSelect(board) }}
            >
              <div className={styles.swatches}>
                {colors.slice(0, 5).map((c, j) => (
                  <div key={j} className={styles.swatch} style={{ background: c.tile }} />
                ))}
                {colors.length === 0 && (
                  <>
                    <div className={styles.swatch} style={{ background: '#4a1280' }} />
                    <div className={styles.swatch} style={{ background: '#0d5e56' }} />
                    <div className={styles.swatch} style={{ background: '#7c1038' }} />
                    <div className={styles.swatch} style={{ background: '#7a3008' }} />
                    <div className={styles.swatch} style={{ background: '#1a5c3a' }} />
                  </>
                )}
              </div>

              <h2 className={styles.cardTitle}>{board.title}</h2>

              {board.description && (
                <p className={styles.cardDesc}>{board.description}</p>
              )}

              <div className={styles.categories}>
                {board.categories.map((cat, j) => (
                  <span key={j} className={styles.catChip}>{cat.name}</span>
                ))}
              </div>

              <p className={styles.meta}>
                {board.categories.length} kategorier · {board.categories[0]?.tiles.length ?? 0} spørsmål hver
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
