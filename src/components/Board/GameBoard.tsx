import type { Category, Tile, GameTheme } from '../../types/game'
import QuestionTile from './QuestionTile'
import styles from './GameBoard.module.css'

interface Props {
  categories: Category[]
  onTileClick: (categoryIndex: number, tileIndex: number) => void
  theme?: GameTheme
}

// Default jewel-tone palette used when a board has no custom theme
const DEFAULT_COLORS = [
  { tile: '#4a1280', hover: '#5e18a0', header: '#330d5c' },
  { tile: '#0d5e56', hover: '#107a70', header: '#094440' },
  { tile: '#7c1038', hover: '#9e1448', header: '#590b28' },
  { tile: '#7a3008', hover: '#9c3e0a', header: '#562005' },
  { tile: '#1a5c3a', hover: '#22784c', header: '#10402a' },
]

export default function GameBoard({ categories, onTileClick, theme }: Props) {
  const rowCount = Math.max(...categories.map(c => c.tiles.length))
  const palette = theme?.categoryColors?.length ? theme.categoryColors : DEFAULT_COLORS

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
