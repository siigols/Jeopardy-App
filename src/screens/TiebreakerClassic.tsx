import type { CSSProperties } from 'react'
import { useState } from 'react'
import type { Team, SimpleQuestion } from '../types/game'
import { useSounds } from '../hooks/useSounds'
import styles from './TiebreakerScreen.module.css'

interface Props {
  tiedTeams: Team[]
  teamColorMap: Record<string, string>
  question: SimpleQuestion
  onAward: (teamId: string) => void
}

/**
 * The host-judged tiebreaker, unchanged: reveal the answer, then click whoever
 * got it right.
 *
 * Still the flow for every board whose tiebreaker answer isn't a number —
 * "7. minutt" can't be plotted on an axis, and a question like that is exactly
 * the kind a host should be free to judge.
 */
export default function TiebreakerClassic({ tiedTeams, teamColorMap, question, onAward }: Props) {
  const [revealed, setRevealed] = useState(false)
  const { playHover } = useSounds()

  return (
    <>
      <div className={styles.questionCard}>
        <p className={styles.questionLabel}>Avgjørende spørsmål</p>
        <p className={styles.questionText}>{question.question}</p>

        {revealed && (
          <div className={styles.answerSection}>
            <p className={styles.answerLabel}>Svar</p>
            <p className={styles.answerText}>{question.answer}</p>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {!revealed ? (
          <button className={styles.revealBtn} onMouseEnter={playHover} onClick={() => setRevealed(true)}>
            Vis svar
          </button>
        ) : (
          <>
            <p className={styles.awardLabel}>Hvem svarte riktig?</p>
            <div className={styles.awardButtons}>
              {tiedTeams.map(team => (
                <button
                  key={team.id}
                  className={styles.teamBtn}
                  style={{ '--team-color': teamColorMap[team.id] } as CSSProperties}
                  onMouseEnter={playHover}
                  onClick={() => onAward(team.id)}
                >
                  {team.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
