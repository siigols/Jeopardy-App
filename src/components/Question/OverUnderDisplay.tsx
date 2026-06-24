import { useState } from 'react'
import { useSounds } from '../../hooks/useSounds'
import type { OverUnderQuestion } from '../../types/game'
import styles from './OverUnderDisplay.module.css'

interface Props {
  content: OverUnderQuestion
  revealed: boolean
  onAllRevealed: () => void
}

export default function OverUnderDisplay({ content, revealed, onAllRevealed }: Props) {
  const [revealedItems, setRevealedItems] = useState<Set<number>>(new Set())
  const { playClick } = useSounds()

  function handleItemClick(index: number) {
    if (revealed || revealedItems.has(index)) return

    playClick()

    const next = new Set(revealedItems)
    next.add(index)
    setRevealedItems(next)

    if (next.size === content.items.length) {
      onAllRevealed()
    }
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.statement}>{content.statement}</h2>

      <div className={styles.grid}>
        {content.items.map((item, index) => {
          const isRevealed = revealed || revealedItems.has(index)
          return (
            <button
              key={index}
              className={`${styles.card} ${isRevealed ? styles.cardRevealed : ''}`}
              onClick={() => handleItemClick(index)}
            >
              <img
                src={item.image}
                alt={item.label || `Bilde ${index + 1}`}
                className={styles.image}
                draggable={false}
              />

              {item.label && (
                <span className={styles.label}>{item.label}</span>
              )}

              {!isRevealed && (
                <div className={styles.clickHint}></div>
              )}

              {isRevealed && (
                <div className={`${styles.answerOverlay} ${item.answer === 'over' ? styles.over : styles.under}`}>
                  <span className={styles.answerBadge}>
                    {item.answer === 'over' ? 'OVER' : 'UNDER'}
                  </span>
                  <span className={styles.answerValue}>{item.value}</span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
