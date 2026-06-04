import { useState, useEffect, type CSSProperties } from 'react'
import type { Tile, Team } from '../../types/game'
import type { TeamInfo } from '../../types/socket-events'
import SimpleQuestionDisplay from './SimpleQuestionDisplay'
import { useSounds } from '../../hooks/useSounds'
import styles from './QuestionView.module.css'

interface Props {
  tile: Tile
  teams: Team[]
  teamColors: Record<string, string>
  buzzerWinner: TeamInfo | null
  onAward: (teamId: string | null) => void
}

export default function QuestionView({ tile, teams, teamColors, buzzerWinner, onAward }: Props) {
  const [revealed, setReveal] = useState(false)
  const { playReveal, playAward, playSkip, playBuzz, playHover } = useSounds()

  useEffect(() => {
    if (buzzerWinner) playBuzz()
  }, [buzzerWinner])

  function handleReveal() {
    playReveal()
    setReveal(true)
  }

  function handleAward(teamId: string) {
    playAward()
    onAward(teamId)
  }

  function handleSkip() {
    playSkip()
    onAward(null)
  }

  function renderContent() {
    switch (tile.content.type) {
      case 'simple':
        return <SimpleQuestionDisplay content={tile.content} revealed={revealed} />
      default:
        return <p>Ukjent spørsmålstype</p>
    }
  }

  return (
    <div
      className={`${styles.overlay}${buzzerWinner ? ` ${styles.buzzed}` : ''}`}
      style={buzzerWinner ? ({ '--team-color': buzzerWinner.color } as CSSProperties) : undefined}
    >
      {buzzerWinner && (
        <div className={styles.buzzerLabel}>
          {buzzerWinner.name} bezzerwizzet!
        </div>
      )}

      <div className={styles.points}>{tile.points}</div>

      <div className={styles.body}>
        {renderContent()}
      </div>

      <div className={styles.actions}>
        {!revealed ? (
          <button className={styles.revealBtn} onMouseEnter={playHover} onClick={handleReveal}>
            Vis svar
          </button>
        ) : (
          <div className={styles.awardSection}>
            <p className={styles.awardLabel}>Gi poeng til:</p>
            <div className={styles.awardButtons}>
              {teams.map(team => (
                <button
                  key={team.id}
                  className={styles.teamBtn}
                  style={{ '--team-color': teamColors[team.id] } as CSSProperties}
                  onMouseEnter={playHover}
                  onClick={() => handleAward(team.id)}
                >
                  {team.name}
                </button>
              ))}
              <button
                className={styles.skipBtn}
                onMouseEnter={playHover}
                onClick={handleSkip}
              >
                Ingen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
