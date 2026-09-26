import { useState, type CSSProperties, type DragEvent } from 'react'
import type { TimelineQuestion } from '../../types/game'
import styles from './TimelineDisplay.module.css'

interface Props {
  content: TimelineQuestion
  revealed: boolean
  /** Called with the number of correctly placed events whenever the placement changes. */
  onCorrectCount?: (count: number) => void
}

function formatYear(year: number): string {
  return year < 0 ? `${-year} f.Kr.` : String(year)
}

/**
 * Plasser hendelsen. The years sit on the line as empty slots and the events wait
 * in a tray below. The host drags (or clicks, then clicks a slot) each event to
 * the year the players pick. The reveal puts every event in its right slot: green
 * where the host had placed it, red where it had to move.
 */
export default function TimelineDisplay({ content, revealed, onCorrectCount }: Props) {
  // Slot i holds the year of the i-th event by time; `answer[i]` is that event's index.
  const answer = content.events.map((_, i) => i).sort((a, b) => content.events[a].year - content.events[b].year)
  const [placed, setPlaced] = useState<(number | null)[]>(() => answer.map(() => null))
  const [selected, setSelected] = useState<number | null>(null)

  function update(next: (number | null)[]) {
    setPlaced(next)
    setSelected(null)
    onCorrectCount?.(next.filter((event, slot) => event === answer[slot]).length)
  }

  /** Moves an event into a slot (or back to the tray when slot is null), swapping with any occupant. */
  function move(event: number, slot: number | null) {
    if (revealed) return
    const next = [...placed]
    const from = next.indexOf(event)
    if (from !== -1) next[from] = null
    if (slot !== null) {
      const occupant = next[slot]
      if (occupant !== null && from !== -1) next[from] = occupant
      next[slot] = event
    }
    update(next)
  }

  function dropHandlers(slot: number | null) {
    return {
      onDragOver: (e: DragEvent) => {
        if (!revealed) e.preventDefault()
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault()
        const event = Number(e.dataTransfer.getData('text/plain'))
        if (Number.isInteger(event)) move(event, slot)
      },
    }
  }

  function card(event: number, className: string) {
    return (
      <button
        type="button"
        key={event}
        className={`${styles.card} ${className} ${selected === event ? styles.selected : ''}`}
        draggable={!revealed}
        disabled={revealed}
        onDragStart={e => e.dataTransfer.setData('text/plain', String(event))}
        onClick={e => {
          e.stopPropagation()
          setSelected(selected === event ? null : event)
        }}
      >
        {content.events[event].label}
      </button>
    )
  }

  const tray = content.events.map((_, i) => i).filter(i => !placed.includes(i))

  return (
    <div className={styles.container}>
      {content.title && <p className={styles.title}>{content.title}</p>}

      <div className={styles.timeline}>
        <div className={styles.line} aria-hidden="true" />
        <ol className={styles.slots} style={{ '--slots': answer.length } as CSSProperties}>
          {answer.map((correct, slot) => {
            const event = placed[slot]
            const right = event === correct
            return (
              <li
                key={slot}
                className={styles.slot}
                onClick={() => selected !== null && move(selected, slot)}
                {...dropHandlers(slot)}
              >
                <span className={styles.year}>{formatYear(content.events[correct].year)}</span>
                <span className={styles.dot} aria-hidden="true" />
                <div className={styles.drop}>
                  {revealed
                    ? card(correct, `${right ? styles.correct : styles.wrong} ${right ? '' : styles.moved}`)
                    : event !== null
                      ? card(event, styles.placed)
                      : <span className={styles.placeholder}>?</span>}
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      {!revealed && (
        <div className={styles.tray} onClick={() => selected !== null && move(selected, null)} {...dropHandlers(null)}>
          {tray.length > 0
            ? tray.map(event => card(event, styles.trayCard))
            : <span className={styles.trayEmpty}>Alle hendelser er plassert</span>}
        </div>
      )}
    </div>
  )
}
