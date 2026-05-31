import type { Category, Tile } from '../../types/game'
import QuestionTile from './QuestionTile'
import styles from './GameBoard.module.css'

interface Props {
  categories: Category[]
  onTileClick: (categoryIndex: number, tileIndex: number) => void
}

export default function GameBoard({ categories, onTileClick }: Props) {
  const rowCount = categories[0]?.tiles.length ?? 5

  return (
    <div
      className={styles.board}
      style={{ '--col-count': categories.length } as React.CSSProperties}
    >
      {/* Category headers */}
      {categories.map((cat, ci) => (
        <div key={ci} className={styles.header}>
          {cat.name}
        </div>
      ))}

      {/* Tile rows */}
      {Array.from({ length: rowCount }, (_, rowIndex) =>
        categories.map((cat, ci) => {
          const tile: Tile = cat.tiles[rowIndex]
          return (
            <div key={`${ci}-${rowIndex}`} className={styles.cell}>
              <QuestionTile
                tile={tile}
                onClick={() => onTileClick(ci, rowIndex)}
              />
            </div>
          )
        })
      )}
    </div>
  )
}
