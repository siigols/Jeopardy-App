import { useEffect, useState, type CSSProperties } from 'react'
import { useSocket } from '../hooks/useSocket'
import type { TeamInfo } from '../types/socket-events'
import styles from './BuzzerScreen.module.css'

type BuzzerState = 'connecting' | 'waiting' | 'ready' | 'won' | 'lost'

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

  useEffect(() => {
    function join() {
      socket.emit('join-buzzer', { code: sessionCode, teamIndex }, (res) => {
        setTeamName(res.teamName)
        setTeamColor(res.teamColor)
        if (res.buzzer) {
          if (res.buzzer.index === teamIndex) setState('won')
          else setState('lost')
          setWinner(res.buzzer)
        } else if (res.questionOpen) {
          setState('ready')
        } else {
          setState('waiting')
        }
      })
    }

    if (socket.connected) {
      join()
    } else {
      socket.once('connect', join)
    }

    socket.on('question-opened', () => {
      setState('ready')
      setWinner(null)
    })

    socket.on('question-closed', () => {
      setState('waiting')
      setWinner(null)
    })

    socket.on('buzzed', (w) => {
      setWinner(w)
      setState(w.index === teamIndex ? 'won' : 'lost')
    })

    return () => {
      socket.off('question-opened')
      socket.off('question-closed')
      socket.off('buzzed')
      socket.off('connect', join)
    }
  }, [socket, sessionCode, teamIndex])

  function handleBuzz() {
    if (state !== 'ready') return
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
          <p className={styles.statusText}>Du buzzet inn!</p>
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
