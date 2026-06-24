import { useEffect, useState } from 'react'
import { useSounds } from '../../hooks/useSounds'
import type { HigherLowerQuestion } from '../../types/game'
import styles from './HigherLowerDisplay.module.css'

interface Props {
  content: HigherLowerQuestion
  revealed: boolean
  onAllRevealed: () => void
}

export default function HigherLowerDisplay({ content, revealed, onAllRevealed }: Props) {
  // currentIndex points to the "right" challenger; left is currentIndex - 1
  const [currentIndex, setCurrentIndex] = useState(1)
  const [showingAnswer, setShowingAnswer] = useState(false)
  const { playClick } = useSounds()

  const leftItem = content.items[currentIndex - 1]
  const rightItem = content.items[currentIndex]
  const isHigher = rightItem.numericValue >= leftItem.numericValue

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
        <div className={styles.panel}>
          <img
            src={leftItem.image}
            alt={leftItem.label}
            className={styles.image}
            draggable={false}
          />
          <div className={styles.overlay}>
            <span className={styles.label}>{leftItem.label}</span>
            <span className={styles.value}>{leftItem.value}</span>
          </div>
        </div>

        {/* VS divider */}
        <div className={styles.divider}>VS</div>

        {/* Right panel — challenger */}
        <div className={styles.panel}>
          <img
            src={rightItem.image}
            alt={rightItem.label}
            className={styles.image}
            draggable={false}
          />
          <div className={styles.overlay}>
            <span className={styles.label}>{rightItem.label}</span>
            {showingAnswer ? (
              <span className={`${styles.value} ${isHigher ? styles.higher : styles.lower}`}>
                {rightItem.value}
              </span>
            ) : (
              <span className={styles.hiddenHint}>Higher or Lower?</span>
            )}
          </div>

          {showingAnswer && (
            <div className={`${styles.answerBadge} ${isHigher ? styles.badgeHigher : styles.badgeLower}`}>
              {isHigher ? '▲ HIGHER' : '▼ LOWER'}
            </div>
          )}
        </div>
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
