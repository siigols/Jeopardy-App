import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useSounds } from '../../hooks/useSounds'
import type { HigherLowerItem, HigherLowerQuestion } from '../../types/game'
import styles from './HigherLowerDisplay.module.css'

interface Props {
  content: HigherLowerQuestion
  revealed: boolean
  onAllRevealed: () => void
}

interface PanelProps {
  item: HigherLowerItem
  /** Rendered below the label inside the overlay (value pill or hint). */
  children: ReactNode
  /** Optional badge rendered on top of the panel. */
  badge?: ReactNode
}

/**
 * A single competitor panel. Items with an `image` get a photo background;
 * imageless items fall back to a themed gradient card with a large label.
 */
function Panel({ item, children, badge }: PanelProps) {
  const hasImage = Boolean(item.image)

  return (
    <div className={styles.panel}>
      {hasImage ? (
        <img
          src={item.image}
          alt={item.label}
          className={styles.image}
          draggable={false}
        />
      ) : (
        <div className={styles.textPanel} aria-hidden="true" />
      )}

      <div className={hasImage ? styles.overlay : `${styles.overlay} ${styles.overlayText}`}>
        <span className={hasImage ? styles.label : `${styles.label} ${styles.labelLarge}`}>
          {item.label}
        </span>
        {children}
      </div>

      {badge}
    </div>
  )
}

export default function HigherLowerDisplay({ content, revealed, onAllRevealed }: Props) {
  // currentIndex points to the "right" challenger; left is currentIndex - 1
  const [currentIndex, setCurrentIndex] = useState(1)
  const [showingAnswer, setShowingAnswer] = useState(false)
  const { playClick } = useSounds()

  const leftItem = content.items[currentIndex - 1]
  const rightItem = content.items[currentIndex]
  const isHigher = rightItem.numericValue >= leftItem.numericValue

  // Preload next image so transition is instant (imageless items have nothing to load)
  useEffect(() => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= content.items.length) return
    const nextImage = content.items[nextIndex].image
    if (!nextImage) return
    const img = new Image()
    img.src = nextImage
  }, [currentIndex, content.items])

  function handleRevealCurrent() {
    playClick()
    setShowingAnswer(true)
  }

  function handleNext() {
    const nextIndex = currentIndex + 1
    if (nextIndex >= content.items.length) {
      onAllRevealed()
    } else {
      setCurrentIndex(nextIndex)
      setShowingAnswer(false)
    }
  }

  // When fully revealed by host, show everything
  useEffect(() => {
    if (revealed) {
      setShowingAnswer(true)
    }
  }, [revealed])

  return (
    <div className={styles.container}>
      <p className={styles.metric}>{content.metric}</p>
      <p className={styles.progress}>{currentIndex} / {content.items.length - 1}</p>

      <div className={styles.panels}>
        {/* Left panel — previous item (value always shown) */}
        <Panel key={currentIndex - 1} item={leftItem}>
          <span className={styles.value}>{leftItem.value}</span>
        </Panel>

        {/* VS divider */}
        <div className={styles.divider}>VS</div>

        {/* Right panel — challenger */}
        <Panel
          key={currentIndex}
          item={rightItem}
          badge={
            showingAnswer && (
              <div className={`${styles.answerBadge} ${isHigher ? styles.badgeHigher : styles.badgeLower}`}>
                {isHigher ? '▲ HIGHER' : '▼ LOWER'}
              </div>
            )
          }
        >
          {showingAnswer ? (
            <span className={`${styles.value} ${isHigher ? styles.higher : styles.lower}`}>
              {rightItem.value}
            </span>
          ) : (
            <span className={styles.hiddenHint}>Higher or Lower?</span>
          )}
        </Panel>
      </div>

      {/* Controls for host to step through */}
      {!revealed && (
        <div className={styles.controls}>
          {!showingAnswer ? (
            <button className={styles.controlBtn} onClick={handleRevealCurrent}>
              Vis svar
            </button>
          ) : (
            currentIndex < content.items.length - 1 && (
              <button className={styles.controlBtn} onClick={handleNext}>
                Neste →
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}
