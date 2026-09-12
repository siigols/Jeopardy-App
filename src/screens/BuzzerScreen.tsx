import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useSound } from 'react-sounds'
import { useSocket } from '../hooks/useSocket'
import TiebreakScreen from './TiebreakScreen'
import type { TeamInfo, TiebreakPhoneState } from '../types/socket-events'
import styles from './BuzzerScreen.module.css'

type BuzzerState = 'connecting' | 'waiting' | 'ready' | 'won' | 'lost' | 'spent'

interface Props {
  sessionCode: string
  teamIndex: number
}

export default function BuzzerScreen({ sessionCode, teamIndex }: Props) {
  const socket = useSocket()
  const [state, setState] = useState<BuzzerState>('connecting')
  const [teamName, setTeamName] = useState('')
  const [teamColor, setTeamColor] = useState('#888')
  const [winner, setWinner] = useState<TeamInfo | null>(null)
  /**
   * The live tiebreak round, or null outside one. Held here rather than in
   * TiebreakScreen because this component owns the socket — moving the switch
   * up to BuzzerApp would mean a second connection or hoisting the socket out.
   */
  const [tiebreak, setTiebreak] = useState<TiebreakPhoneState | null>(null)
  // Mirror the server's view. Refs because the socket listeners are registered
  // once and must read the current values, not the ones in their closure.
  const spent = useRef(false)
  const questionOpen = useRef(false)

  const { play: playBuzzPress } = useSound('ui/button_hard')

  useEffect(() => {
    /** The state to show when this team isn't the subject of a live buzz. */
    function idleState(): BuzzerState {
      if (spent.current) return 'spent'
      return questionOpen.current ? 'ready' : 'waiting'
    }

    function join() {
      socket.emit('join-buzzer', { code: sessionCode, teamIndex }, (res) => {
        setTeamName(res.teamName)
        setTeamColor(res.teamColor)
        spent.current = res.used.includes(teamIndex)
        questionOpen.current = res.questionOpen
        // The ack is the whole resync, so a phone reloading mid-tiebreak comes
        // straight back to the screen it left.
        setTiebreak(res.tiebreak)
        if (res.buzzer) {
          setWinner(res.buzzer)
          setState(res.buzzer.index === teamIndex ? 'won' : 'lost')
        } else {
          setState(idleState())
        }
      })
    }

    if (socket.connected) {
      join()
    }
    socket.on('connect', join)

    socket.on('question-opened', () => {
      questionOpen.current = true
      setWinner(null)
      setState(idleState())
    })

    socket.on('question-closed', () => {
      questionOpen.current = false
      setWinner(null)
      setState(idleState())
    })

    socket.on('buzzed', (w) => {
      setWinner(w)
      setState(w.index === teamIndex ? 'won' : 'lost')
    })

    socket.on('tiebreak-started', ({ round, participants, question }) => {
      setTiebreak({
        round,
        question,
        isParticipant: participants.includes(teamIndex),
        hasSubmitted: false,
        ownValue: null,
        submittedCount: 0,
        participantCount: participants.length,
        phase: 'collecting',
        correct: null,
        answers: null,
      })
    })

    socket.on('tiebreak-progress', ({ round, submitted }) => {
      // Ignore a broadcast for a round this phone has already moved past.
      setTiebreak(prev =>
        prev && prev.round === round
          ? { ...prev, submittedCount: submitted.length, hasSubmitted: submitted.includes(teamIndex) }
          : prev
      )
    })

    socket.on('tiebreak-revealed', ({ round, correct, answers }) => {
      setTiebreak(prev =>
        prev && prev.round === round ? { ...prev, phase: 'revealed', correct, answers } : prev
      )
    })

    socket.on('tiebreak-ended', () => {
      setTiebreak(null)
    })

    socket.on('buzz-state', ({ used }) => {
      spent.current = used.includes(teamIndex)
      // The won/lost result of the current question stays on screen until the
      // host opens or closes it; only the idle states re-derive here. This is
      // also what lets the host's reset button hand a spent phone its buzz back
      // mid-question.
      setState(prev => (prev === 'won' || prev === 'lost' || prev === 'connecting' ? prev : idleState()))
    })

    return () => {
      socket.off('question-opened')
      socket.off('question-closed')
      socket.off('buzzed')
      socket.off('buzz-state')
      socket.off('tiebreak-started')
      socket.off('tiebreak-progress')
      socket.off('tiebreak-revealed')
      socket.off('tiebreak-ended')
      socket.off('connect', join)
    }
  }, [socket, sessionCode, teamIndex])

  function handleBuzz() {
    if (state !== 'ready') return
    playBuzzPress()
    socket.emit('buzz', { code: sessionCode, teamIndex })
  }

  /**
   * Locks on the server's ack rather than optimistically: a stale round or a
   * duplicate has to surface as a retryable error, not as a phone that thinks
   * it answered.
   */
  function handleTiebreakSubmit(value: number): Promise<boolean> {
    const round = tiebreak?.round
    if (round === undefined) return Promise.resolve(false)
    return new Promise(resolve => {
      socket.emit('tiebreak-submit', { code: sessionCode, round, teamIndex, value }, res => {
        if (res.ok) {
          setTiebreak(prev =>
            prev && prev.round === round ? { ...prev, hasSubmitted: true, ownValue: value } : prev
          )
        }
        resolve(res.ok)
      })
    })
  }

  const bgStyle = {
    '--team-color': teamColor,
  } as CSSProperties

  if (state === 'connecting') {
    return (
      <div className={styles.page} style={bgStyle}>
        <div className={styles.spinner} />
        <p className={styles.statusText}>Kobler til…</p>
      </div>
    )
  }

  // A tiebreak round takes over the whole phone: there is no buzzing in it.
  if (tiebreak) {
    return (
      <TiebreakScreen
        teamName={teamName}
        teamColor={teamColor}
        teamIndex={teamIndex}
        state={tiebreak}
        onSubmit={handleTiebreakSubmit}
      />
    )
  }

  return (
    <div className={styles.page} style={bgStyle}>
      <p className={styles.teamLabel}>{teamName}</p>

      {state === 'waiting' && (
        <>
          <button className={`${styles.buzzBtn} ${styles.btnWaiting}`} disabled>
            Venter…
          </button>
          <p className={styles.statusText}>Vent på spørsmålet</p>
        </>
      )}

      {state === 'ready' && (
        <>
          <button className={`${styles.buzzBtn} ${styles.btnReady}`} onClick={handleBuzz}>
            Besserwizz!
          </button>
          <p className={styles.statusText}>Trykk raskt!</p>
        </>
      )}

      {state === 'won' && (
        <>
          <button className={`${styles.buzzBtn} ${styles.btnWon}`} disabled>
            ✓
          </button>
          <p className={styles.statusText}>Du bezzerwizzet!</p>
        </>
      )}

      {state === 'spent' && (
        <>
          <button className={`${styles.buzzBtn} ${styles.btnSpent}`} disabled>
            ⏳
          </button>
          <p className={styles.statusText}>Buzzeren er brukt — venter på ny runde</p>
        </>
      )}

      {state === 'lost' && (
        <>
          <button className={`${styles.buzzBtn} ${styles.btnLost}`} disabled>
            ✕
          </button>
          <p className={styles.statusText}>{winner?.name ?? '?'} var raskest</p>
        </>
      )}
    </div>
  )
}
