import type { Category, Tile, GameTheme } from '../../types/game'
import { DEFAULT_CATEGORY_COLORS } from '../../data/boardThemes'
import QuestionTile from './QuestionTile'
import styles from './GameBoard.module.css'

interface Props {
  categories: Category[]
  onTileClick: (categoryIndex: number, tileIndex: number) => void
  theme?: GameTheme
}

export default function GameBoard({ categories, onTileClick, theme }: Props) {
  const rowCount = Math.max(...categories.map(c => c.tiles.length))
  const palette = theme?.categoryColors?.length ? theme.categoryColors : DEFAULT_CATEGORY_COLORS

  return (
    <div
      className={styles.board}
      style={{ '--col-count': categories.length } as React.CSSProperties}
    >
      {categories.map((cat, ci) => {
        const c = palette[ci % palette.length]
        return (
          <div
            key={ci}
            className={styles.header}
            style={{ background: c.header } as React.CSSProperties}
          >
            {cat.name}
          </div>
        )
      })}

      {Array.from({ length: rowCount }, (_, rowIndex) =>
        categories.map((cat, ci) => {
          const tile: Tile | undefined = cat.tiles[rowIndex]
          const c = palette[ci % palette.length]
          if (!tile) {
            return <div key={`${ci}-${rowIndex}`} className={styles.cell} />
          }
          return (
            <div key={`${ci}-${rowIndex}`} className={styles.cell}>
              <QuestionTile
                tile={tile}
                tileBg={c.tile}
                tileHover={c.hover}
                onClick={() => onTileClick(ci, rowIndex)}
              />
            </div>
          )
        })
      )}
    </div>
  )
}
