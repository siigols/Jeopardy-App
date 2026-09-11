import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useSounds } from '../../hooks/useSounds'
import type { HigherLowerItem, HigherLowerQuestion } from '../../types/game'
import styles from './HigherLowerDisplay.module.css'

/** Which way the challenger's value went compared to the previous item. */
type Direction = 'higher' | 'lower'

const DIRECTION_LABEL: Record<Direction, string> = {
  higher: 'Høyere',
  lower: 'Lavere',
}

const DIRECTION_ARROW: Record<Direction, string> = {
  higher: '▲',
  lower: '▼',
}

interface Props {
  content: HigherLowerQuestion
  revealed: boolean
  onAllRevealed: () => void
  /**
   * Reports the running number of correct guesses, so the host's "hvor mange
   * riktige?" row can pre-select the tally instead of making them count by hand.
   */
  onCorrectCount?: (count: number) => void
}

/**
 * The true direction of comparison `index`, which puts `items[index + 1]` up
 * against `items[index]`. A tie counts as higher — the rule the display has
 * always used, kept so existing boards score the same way.
 */
function directionOf(items: HigherLowerItem[], index: number): Direction {
  return items[index + 1].numericValue >= items[index].numericValue ? 'higher' : 'lower'
}

/** How many of the guesses made so far match the truth. Unguessed slots count as neither. */
function countCorrect(items: HigherLowerItem[], guesses: (Direction | null)[]): number {
  return guesses.reduce<number>(
    (sum, guess, index) => (guess !== null && guess === directionOf(items, index) ? sum + 1 : sum),
    0,
  )
}

interface PanelProps {
  item: HigherLowerItem
  /** Rendered below the label inside the overlay (value pill or hint). */
  children: ReactNode
  /** Optional badge rendered on top of the panel. */
  badge?: ReactNode
  /** Tints the panel's frame once the host has guessed. */
  verdict?: 'correct' | 'wrong' | null
}

/**
 * A single competitor panel. Items with an `image` get a photo background;
 * imageless items fall back to a themed gradient card with a large label.
 */
function Panel({ item, children, badge, verdict = null }: PanelProps) {
  const hasImage = Boolean(item.image)
  const verdictClass = verdict === 'correct'
    ? styles.panelCorrect
    : verdict === 'wrong'
      ? styles.panelWrong
      : ''

  return (
    <div className={`${styles.panel} ${verdictClass}`}>
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

export default function HigherLowerDisplay({ content, revealed, onAllRevealed, onCorrectCount }: Props) {
  const comparisonCount = Math.max(0, content.items.length - 1)

  // currentIndex points to the "right" challenger; left is currentIndex - 1.
  // Comparison n (0-based) is the one between items[n] and items[n + 1].
  const [currentIndex, setCurrentIndex] = useState(1)
  const [guesses, setGuesses] = useState<(Direction | null)[]>(() => Array(comparisonCount).fill(null))
  const [showRecap, setShowRecap] = useState(false)
  const { playHover } = useSounds()

  // Preload next image so transition is instant (imageless items have nothing to load)
  useEffect(() => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= content.items.length) return
    const nextImage = content.items[nextIndex].image
    if (!nextImage) return
    const img = new Image()
    img.src = nextImage
  }, [currentIndex, content.items])

  // Guard against malformed content: one item has nothing to compare against.
  if (comparisonCount === 0) {
    return <p className={styles.empty}>Denne oppgaven mangler nok elementer.</p>
  }

  // `revealed` means the host hit "Hopp til oppsummering" below the question, so
  // it lands on the recap the same way finishing the last comparison does.
  const inRecap = showRecap || revealed
  const comparisonIndex = currentIndex - 1
  const leftItem = content.items[comparisonIndex]
  const rightItem = content.items[currentIndex]
  const actual = directionOf(content.items, comparisonIndex)
  const guess = guesses[comparisonIndex] ?? null
  const isCorrect = guess === actual
  const isLastComparison = currentIndex >= content.items.length - 1
  const correctCount = countCorrect(content.items, guesses)

  function handleGuess(direction: Direction) {
    if (guess !== null) return
    const next = [...guesses]
    next[comparisonIndex] = direction
    setGuesses(next)
    onCorrectCount?.(countCorrect(content.items, next))
  }

  function handleNext() {
    if (isLastComparison) {
      setShowRecap(true)
      onAllRevealed()
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const header = (
    <header className={styles.head}>
      <p className={styles.metric}>{content.metric}</p>
      <div className={styles.dots} aria-hidden="true">
        {guesses.map((item, index) => {
          const state = item === null
            ? ''
            : item === directionOf(content.items, index)
              ? styles.dotCorrect
              : styles.dotWrong
          const current = !inRecap && index === comparisonIndex ? styles.dotCurrent : ''
          return <span key={index} className={`${styles.dot} ${state} ${current}`} />
        })}
      </div>
    </header>
  )

  if (inRecap) {
    return (
      <div className={styles.container}>
        {header}

        <div className={styles.recap}>
          <p className={styles.recapScore}>
            <strong>{correctCount}</strong> av {comparisonCount} riktige
          </p>

          <ol className={styles.recapList}>
            {content.items.slice(0, -1).map((item, index) => {
              const challenger = content.items[index + 1]
              const truth = directionOf(content.items, index)
              const made = guesses[index] ?? null
              const rowClass = made === null
                ? styles.rowNeutral
                : made === truth
                  ? styles.rowCorrect
                  : styles.rowWrong

              return (
                <li key={index} className={`${styles.recapRow} ${rowClass}`}>
                  <span className={styles.recapNum}>{index + 1}</span>

                  <span className={styles.recapPair}>
                    <span className={styles.recapItem}>
                      {item.label}
                      <b className={styles.recapValue}>{item.value}</b>
                    </span>
                    <span className={styles.recapArrow}>vs</span>
                    <span className={styles.recapItem}>
                      {challenger.label}
                      <b className={styles.recapValue}>{challenger.value}</b>
                    </span>
                  </span>

                  <span className={styles.recapTruth}>
                    {DIRECTION_ARROW[truth]} {DIRECTION_LABEL[truth]}
                  </span>

                  <span className={styles.recapVerdict}>
                    {made === null ? '–' : made === truth ? '✓' : '✗'}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {header}

      <div className={styles.panels}>
        {/* Left panel — previous item (value always shown) */}
        <Panel key={comparisonIndex} item={leftItem}>
          <span className={styles.value}>{leftItem.value}</span>
        </Panel>

        <div className={styles.divider}>
          <span className={styles.dividerBadge}>VS</span>
        </div>

        {/* Right panel — challenger */}
        <Panel
          key={currentIndex}
          item={rightItem}
          verdict={guess === null ? null : isCorrect ? 'correct' : 'wrong'}
          badge={
            guess !== null && (
              <div className={`${styles.answerBadge} ${isCorrect ? styles.badgeCorrect : styles.badgeWrong}`}>
                <span className={styles.badgeMark}>{isCorrect ? '✓' : '✗'}</span>
                {DIRECTION_ARROW[actual]} {DIRECTION_LABEL[actual].toUpperCase()}
              </div>
            )
          }
        >
          {guess !== null ? (
            <span className={styles.value}>{rightItem.value}</span>
          ) : (
            <span className={styles.hiddenHint}>Høyere eller lavere?</span>
          )}
        </Panel>
      </div>

      <div className={styles.controls}>
        {guess === null ? (
          <div className={styles.guessRow}>
            <button
              type="button"
              className={`${styles.guessBtn} ${styles.guessHigher}`}
              onMouseEnter={playHover}
              onClick={() => handleGuess('higher')}
            >
              <span className={styles.guessArrow}>▲</span> Høyere
            </button>
            <button
              type="button"
              className={`${styles.guessBtn} ${styles.guessLower}`}
              onMouseEnter={playHover}
              onClick={() => handleGuess('lower')}
            >
              <span className={styles.guessArrow}>▼</span> Lavere
            </button>
          </div>
        ) : (
          <div className={styles.resultRow}>
            <p className={`${styles.guessedNote} ${isCorrect ? styles.noteCorrect : styles.noteWrong}`}>
              Gjettet {DIRECTION_LABEL[guess].toLowerCase()} — {isCorrect ? 'riktig!' : 'feil'}
            </p>
            <button
              type="button"
              className={styles.nextBtn}
              onMouseEnter={playHover}
              onClick={handleNext}
            >
              {isLastComparison ? 'Se oppsummering →' : 'Neste →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
