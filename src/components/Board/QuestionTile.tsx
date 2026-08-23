import { tilePointsLabel, type Tile } from '../../types/game'
import styles from './QuestionTile.module.css'

interface Props {
  tile: Tile
  tileBg: string
  tileHover: string
  onClick: () => void
}

export default function QuestionTile({ tile, tileBg, tileHover, onClick }: Props) {
  const { label, isRange } = tilePointsLabel(tile)
  // Visible label stays compact ("0-1000"); screen readers get the spoken form.
  const spokenLabel = isRange ? label.replace('-', ' til ') : label

  return (
    <button
      className={`${styles.tile} ${tile.answered ? styles.answered : ''}`}
      onClick={onClick}
      disabled={tile.answered}
      aria-label={tile.answered ? 'Besvart' : `${spokenLabel} poeng`}
      style={!tile.answered ? {
        '--tile-bg': tileBg,
        '--tile-hover': tileHover,
      } as React.CSSProperties : undefined}
    >
      {!tile.answered && (
        <span className={`${styles.points} ${isRange ? styles.pointsRange : ''}`}>{label}</span>
      )}
    </button>
  )
}
