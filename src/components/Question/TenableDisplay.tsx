import type { TenableQuestion } from '../../types/game'
import styles from './TenableDisplay.module.css'

interface Props {
  content: TenableQuestion
  revealedCount: number
  selectedIndex: number | null
  selectionEnabled: boolean
  onSelectIndex: (index: number) => void
}

export default function TenableDisplay({
  content,
  revealedCount,
  selectedIndex,
  selectionEnabled,
  onSelectIndex,
}: Props) {
  return (
    <div className={styles.container}>
      <h2 className={styles.prompt}>{content.prompt}</h2>

      <ol className={styles.list}>
        {content.items.map((item, index) => {
          const isVisible = index < revealedCount
          const isSelectable = selectionEnabled && isVisible
          const isSelected = selectedIndex === index

          return (
            <li key={`${item}-${index}`}>
              <button
                className={`${styles.row} ${isVisible ? styles.rowVisible : ''} ${isSelectable ? styles.rowSelectable : ''} ${isSelected ? styles.rowSelected : ''}`}
                type="button"
                disabled={!isSelectable}
                onClick={() => onSelectIndex(index)}
              >
                <span className={styles.rank}>{index + 1}</span>
                <span className={styles.answer}>{isVisible ? item : '---'}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}