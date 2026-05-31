import { useState } from 'react'
import type { Team } from '../../types/game'
import TeamCard from './TeamCard'
import styles from './ScoreBoard.module.css'

interface Props {
  teams: Team[]
  onAdjust: (teamId: string, delta: number) => void
}

export default function ScoreBoard({ teams, onAdjust }: Props) {
  const [visible, setVisible] = useState(true)

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.toggleBtn}
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Hide scoreboard' : 'Show scoreboard'}
        title={visible ? 'Hide scoreboard' : 'Show scoreboard'}
      >
        {visible ? '▼ Scores' : '▲ Scores'}
      </button>

      {visible && (
        <div className={styles.panel}>
          <p className={styles.title}>Scores</p>
          {teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              onAdjust={delta => onAdjust(team.id, delta)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
