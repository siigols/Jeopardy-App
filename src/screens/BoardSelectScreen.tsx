import { useNavigate } from 'react-router-dom'
import type { BoardSummary } from '../types/game'
import { DEFAULT_CATEGORY_COLORS } from '../data/boardThemes'
import { useSounds } from '../hooks/useSounds'
import styles from './BoardSelectScreen.module.css'

function PencilIcon() {
  return (
    <svg
      className={styles.editIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

interface Props {
  boards: BoardSummary[]
  onSelect: (id: number) => void
}

export default function BoardSelectScreen({ boards, onSelect }: Props) {
  const { playClick, playHover } = useSounds()
  const navigate = useNavigate()

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>Jeopardy!</h1>
      <p className={styles.subtitle}>Velg brett</p>

      <div className={styles.actions}>
        <button
          className={styles.newBtn}
          onMouseEnter={playHover}
          onClick={() => { playClick(); navigate('/boards/new') }}
        >
          Ny tavle
        </button>
      </div>

      <div className={styles.grid}>
        {boards.map(board => {
          const colors = board.theme?.categoryColors ?? []
          return (
            <div key={board.id} className={styles.card}>
              <button
                className={styles.cardMain}
                onMouseEnter={playHover}
                onClick={() => { playClick(); onSelect(board.id) }}
              >
                <div className={styles.swatches}>
                  {colors.slice(0, 5).map((c, j) => (
                    <div key={j} className={styles.swatch} style={{ background: c.tile }} />
                  ))}
                  {colors.length === 0 && DEFAULT_CATEGORY_COLORS.map((c, j) => (
                    <div key={j} className={styles.swatch} style={{ background: c.tile }} />
                  ))}
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
                  {board.categories.length} kategorier
                </p>
              </button>

              {board.editable && (
                <button
                  className={styles.editBtn}
                  aria-label={`Rediger ${board.title}`}
                  title="Rediger"
                  onMouseEnter={playHover}
                  onClick={e => {
                    e.stopPropagation()
                    playClick()
                    navigate(`/boards/${board.id}/edit`)
                  }}
                >
                  <PencilIcon />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
