import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useSound } from 'react-sounds'
import { useSocket } from '../hooks/useSocket'
import type { TeamInfo } from '../types/socket-events'
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
  const prevState = useRef<BuzzerState>('connecting')
  // Mirror the server's view. Refs because the socket listeners are registered
  // once and must read the current values, not the ones in their closure.
  const spent = useRef(false)
  const questionOpen = useRef(false)

  const { play: playHeartbeat } = useSound('ambient/heartbeat')
  const { play: playBuzzPress } = useSound('ui/button_hard')

  useEffect(() => {
    if (state === 'won' && prevState.current !== 'won') {
      playHeartbeat()
    }
    prevState.current = state
  }, [state, playHeartbeat])

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
      socket.off('connect', join)
    }
  }, [socket, sessionCode, teamIndex])

  function handleBuzz() {
    if (state !== 'ready') return
    playBuzzPress()
    socket.emit('buzz', { code: sessionCode, teamIndex })
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
