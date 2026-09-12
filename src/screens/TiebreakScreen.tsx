import { useId, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import type { TiebreakPhoneState } from '../types/socket-events'
import { nbNumber, parseNumericInput } from '../utils/parseNumber'
import styles from './TiebreakScreen.module.css'

interface Props {
  teamName: string
  teamColor: string
  teamIndex: number
  state: TiebreakPhoneState
  /** Resolves false when the server rejected the submit (stale round, duplicate…). */
  onSubmit: (value: number) => Promise<boolean>
}

/**
 * The phone half of the numeric tiebreaker: the tied teams type an estimate,
 * everyone else watches. Rendered by BuzzerScreen, which owns the socket — see
 * the note there on why the switch happens at that level.
 */
export default function TiebreakScreen({ teamName, teamColor, teamIndex, state, onSubmit }: Props) {
  // The draft carries the round it was typed for, so a new round empties the
  // field without an effect: the same phone is being asked a new question, and
  // the old number must not be sitting there ready to submit.
  const [draft, setDraft] = useState({ round: state.round, text: '' })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fieldId = useId()

  const text = draft.round === state.round ? draft.text : ''
  const parsed = parseNumericInput(text)
  const bgStyle = { '--team-color': teamColor } as CSSProperties

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (parsed === null || sending) return
    setSending(true)
    setError(null)
    const ok = await onSubmit(parsed)
    setSending(false)
    setError(ok ? null : 'Svaret ble ikke registrert. Prøv igjen.')
  }

  const progress = `${state.submittedCount} av ${state.participantCount} lag har svart`

  if (state.phase === 'revealed') {
    const own = state.ownValue
    const correct = state.correct
    const won =
      own !== null &&
      correct !== null &&
      state.answers !== null &&
      isClosest(state.answers, correct, teamIndex)

    return (
      <div className={styles.page} style={bgStyle}>
        <p className={styles.teamLabel}>{teamName}</p>
        <div className={`${styles.badge} ${won ? styles.badgeWon : styles.badgeLost}`}>
          {won ? '🏆' : own === null ? '–' : '✕'}
        </div>
        <p className={styles.bigValue}>
          {correct === null ? '?' : nbNumber.format(correct)}
        </p>
        <p className={styles.statusText}>
          {own === null
            ? 'Dere svarte ikke'
            : `Deres svar: ${nbNumber.format(own)}`}
        </p>
        <p className={styles.statusText}>{won ? 'Nærmest! 🎉' : 'Se storskjermen'}</p>
      </div>
    )
  }

  if (!state.isParticipant) {
    return (
      <div className={styles.page} style={bgStyle}>
        <p className={styles.teamLabel}>{teamName}</p>
        <div className={`${styles.badge} ${styles.badgeIdle}`}>👀</div>
        <p className={styles.statusText}>
          Dere er ute av kampen om førsteplassen
        </p>
        <p className={styles.statusMuted}>Se storskjermen</p>
      </div>
    )
  }

  if (state.hasSubmitted) {
    return (
      <div className={styles.page} style={bgStyle}>
        <p className={styles.teamLabel}>{teamName}</p>
        <div className={`${styles.badge} ${styles.badgeLocked}`}>✓</div>
        <p className={styles.bigValue}>
          {state.ownValue === null ? '' : nbNumber.format(state.ownValue)}
        </p>
        <p className={styles.statusText}>Svaret er låst</p>
        <p className={styles.statusMuted}>{progress}</p>
      </div>
    )
  }

  return (
    // flex-start rather than the buzzer's centred layout: the soft keyboard
    // shrinks the visual viewport, and centred content ends up behind it.
    <form className={`${styles.page} ${styles.pageForm}`} style={bgStyle} onSubmit={handleSubmit}>
      <p className={styles.teamLabel}>{teamName}</p>
      <p className={styles.kicker}>Tiebreaker</p>
      <label className={styles.question} htmlFor={fieldId}>
        {state.question}
      </label>
      <input
        // Not type="number": iOS gives it a keypad with no comma, which makes a
        // Norwegian decimal impossible to type.
        id={fieldId}
        ref={inputRef}
        className={styles.input}
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        placeholder="Tallet ditt"
        value={text}
        onChange={e => setDraft({ round: state.round, text: e.target.value })}
        onFocus={() => inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })}
      />
      <p className={styles.echo}>
        {parsed === null ? ' ' : nbNumber.format(parsed)}
      </p>
      <button className={styles.submitBtn} type="submit" disabled={parsed === null || sending}>
        {sending ? 'Sender…' : 'Lås inn svaret'}
      </button>
      {error && <p className={styles.error}>{error}</p>}
      <p className={styles.statusMuted}>{progress}</p>
    </form>
  )
}

/**
 * Whether this team is (jointly) nearest the answer. The epsilon is scaled to
 * the magnitude so float noise never decides it — the host applies the same
 * rule, and a phone disagreeing with the big screen would be worse than either
 * answer alone.
 */
function isClosest(
  answers: { index: number; value: number }[],
  correct: number,
  teamIndex: number,
): boolean {
  const own = answers.find(a => a.index === teamIndex)
  if (!own) return false
  const eps = 1e-9 * Math.max(1, Math.abs(correct))
  const ownDist = Math.abs(own.value - correct)
  return answers.every(a => Math.abs(a.value - correct) >= ownDist - eps)
}
