import type { CSSProperties } from 'react'
import type { TimelineQuestion } from '../../types/game'
import styles from './TimelineDisplay.module.css'

interface Props {
  content: TimelineQuestion
  revealed: boolean
}

const LETTERS = 'ABCDEFGH'

function formatYear(year: number): string {
  return year < 0 ? `${-year} f.Kr.` : String(year)
}

/**
 * Plasser hendelsen. Before the reveal only the anchor sits on the line, with the
 * other events lettered in a tray below it. The reveal drops every event into
 * its place on the line, one after another, with its year.
 */
export default function TimelineDisplay({ content, revealed }: Props) {
  const events = content.events.map((event, i) => ({ ...event, letter: LETTERS[i], order: i }))
  const onLine = revealed
    ? [...events, { ...content.anchor, letter: '', order: -1 }].sort((a, b) => a.year - b.year)
    : [{ ...content.anchor, letter: '', order: -1 }]

  return (
    <div className={styles.container}>
      <p className={styles.title}>{content.title || 'Plasser hendelsene på tidslinja'}</p>

      <div className={styles.timeline}>
        <div className={styles.line} aria-hidden="true" />
        <ol className={styles.slots} style={{ '--slots': onLine.length } as CSSProperties}>
          {onLine.map(item => {
            const isAnchor = item.order === -1
            return (
              <li
                key={isAnchor ? 'anchor' : item.letter}
                className={`${styles.slot} ${isAnchor ? styles.anchor : styles.placed}`}
                style={isAnchor ? undefined : ({ '--delay': `${item.order * 0.45}s` } as CSSProperties)}
              >
                <span className={styles.year}>{formatYear(item.year)}</span>
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.card}>
                  {!isAnchor && <span className={styles.letter}>{item.letter}</span>}
                  {item.label}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      {!revealed && (
        <ul className={styles.tray}>
          {events.map(event => (
            <li key={event.letter} className={styles.trayCard}>
              <span className={styles.letter}>{event.letter}</span>
              {event.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
