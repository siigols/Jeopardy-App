import type { Tile } from '../../types/game'
import styles from './QuestionTile.module.css'

interface Props {
  tile: Tile
  tileBg: string
  tileHover: string
  onClick: () => void
}

export default function QuestionTile({ tile, tileBg, tileHover, onClick }: Props) {
  return (
    <button
      className={`${styles.tile} ${tile.answered ? styles.answered : ''}`}
      onClick={onClick}
      disabled={tile.answered}
      aria-label={tile.answered ? 'Answered' : `${tile.points} points`}
      style={!tile.answered ? {
        '--tile-bg': tileBg,
        '--tile-hover': tileHover,
      } as React.CSSProperties : undefined}
    >
      {!tile.answered && <span className={styles.points}>{tile.points}</span>}
    </button>
  )
}
