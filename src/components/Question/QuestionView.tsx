import { useState } from 'react'
import type { Tile, Team } from '../../types/game'
import SimpleQuestionDisplay from './SimpleQuestionDisplay'
import styles from './QuestionView.module.css'

interface Props {
  tile: Tile
  teams: Team[]
  onAward: (teamId: string | null) => void
}

export default function QuestionView({ tile, teams, onAward }: Props) {
  const [revealed, setReveal] = useState(false)

  function renderContent() {
    switch (tile.content.type) {
      case 'simple':
        return <SimpleQuestionDisplay content={tile.content} revealed={revealed} />
      default:
        return <p>Unknown question type</p>
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.points}>${tile.points}</div>

      <div className={styles.body}>
        {renderContent()}
      </div>

      <div className={styles.actions}>
        {!revealed ? (
          <button className={styles.revealBtn} onClick={() => setReveal(true)}>
            Reveal Answer
          </button>
        ) : (
          <div className={styles.awardSection}>
            <p className={styles.awardLabel}>Award points to:</p>
            <div className={styles.awardButtons}>
              {teams.map(team => (
                <button
                  key={team.id}
                  className={styles.teamBtn}
                  onClick={() => onAward(team.id)}
                >
                  {team.name}
                </button>
              ))}
              <button
                className={styles.skipBtn}
                onClick={() => onAward(null)}
              >
                No one / Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
