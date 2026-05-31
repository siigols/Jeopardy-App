import type { Team } from '../../types/game'
import styles from './TeamCard.module.css'

interface Props {
  team: Team
  onAdjust: (delta: number) => void
}

export default function TeamCard({ team, onAdjust }: Props) {
  return (
    <div className={styles.card}>
      <p className={styles.name}>{team.name}</p>
      <div className={styles.scoreRow}>
        <button className={styles.adjBtn} onClick={() => onAdjust(-100)} aria-label="Subtract 100">−</button>
        <span className={styles.score}>{team.score}</span>
        <button className={styles.adjBtn} onClick={() => onAdjust(100)} aria-label="Add 100">+</button>
      </div>
    </div>
  )
}
