import type { CSSProperties } from 'react'
import styles from './SessionPanel.module.css'

interface TeamEntry {
  name: string
  color: string
  index: number
}

interface Props {
  sessionCode: string
  teams: TeamEntry[]
  /** Team indices that have spent their one buzz this round. */
  usedBuzzes: number[]
  onResetBuzzes: () => void
}

export default function SessionPanel({ sessionCode, teams, usedBuzzes, onResetBuzzes }: Props) {
  const origin = window.location.origin

  function copyUrl(teamIndex: number) {
    const url = `${origin}/buzz.html?s=${sessionCode}&t=${teamIndex}`
    navigator.clipboard.writeText(url).catch(() => {})
  }

  return (
    <div className={styles.panel}>
      <div className={styles.codeRow}>
        <span className={styles.codeLabel}>Spillkode:</span>
        <span className={styles.code}>{sessionCode}</span>
        <button
          className={styles.resetBtn}
          onClick={onResetBuzzes}
          title="Gi alle lagene buzzeren tilbake"
        >
          Nullstill buzzere
        </button>
      </div>
      <div className={styles.teamList}>
        {teams.map(team => (
          <div key={team.index} className={styles.teamRow}>
            <span
              className={styles.teamDot}
              style={{ '--team-color': team.color } as CSSProperties}
            />
            <span className={styles.teamName}>{team.name}</span>
            <span className={styles.buzzStatus}>
              {usedBuzzes.includes(team.index) ? 'brukt' : 'ledig'}
            </span>
            <button
              className={styles.copyBtn}
              onClick={() => copyUrl(team.index)}
              title={`Kopier buzzer-lenke for ${team.name}`}
            >
              Kopier lenke
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
