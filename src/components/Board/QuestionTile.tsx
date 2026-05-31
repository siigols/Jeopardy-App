import type { Tile } from '../../types/game'
import styles from './QuestionTile.module.css'

interface Props {
  tile: Tile
  onClick: () => void
}

export default function QuestionTile({ tile, onClick }: Props) {
  return (
    <button
      className={`${styles.tile} ${tile.answered ? styles.answered : ''}`}
      onClick={onClick}
      disabled={tile.answered}
      aria-label={tile.answered ? 'Answered' : `${tile.points} points`}
    >
      {tile.answered ? '' : (
        <span className={styles.points}>{tile.points}</span>
      )}
    </button>
  )
}
