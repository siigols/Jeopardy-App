import type { CSSProperties } from 'react'
import styles from './BuzzerBadge.module.css'

interface Props {
  teamName: string
  teamColor: string
}

export default function BuzzerBadge({ teamName, teamColor }: Props) {
  return (
    <div
      className={styles.badge}
      style={{ '--team-color': teamColor } as CSSProperties}
    >
      <span className={styles.dot} />
      <span className={styles.label}>{teamName} buzzet inn!</span>
    </div>
  )
}
