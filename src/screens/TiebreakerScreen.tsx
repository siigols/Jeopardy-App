import React, { useState, type CSSProperties } from 'react'
import type { Team, SimpleQuestion } from '../types/game'
import { useSounds } from '../hooks/useSounds'
import styles from './TiebreakerScreen.module.css'

const TEAM_COLORS = ['#e74c3c', '#3b82f6', '#22c55e', '#f97316']

const DEFAULT_TIEBREAKER: SimpleQuestion = {
  type: 'simple',
  question: 'Hvilket år ble FN grunnlagt?',
  answer: '1945',
}

interface Props {
  tiedTeams: Team[]
  allTeams: Team[]
  question?: SimpleQuestion
  onResolved: (updatedTeams: Team[]) => void
}

export default function TiebreakerScreen({ tiedTeams, allTeams, question, onResolved }: Props) {
  const [revealed, setRevealed] = useState(false)
  const { playReveal, playAward } = useSounds()

  const q = question ?? DEFAULT_TIEBREAKER

  // Build color map from original team order
  const teamColorMap = Object.fromEntries(
    allTeams.map((t, i) => [t.id, TEAM_COLORS[i % TEAM_COLORS.length]])
  )

  function handleReveal() {
    playReveal()
    setRevealed(true)
  }

  function handleAward(teamId: string) {
    playAward()
    // Award 1 bonus point to the winner to break the tie
    const updatedTeams = allTeams.map(t =>
      t.id === teamId ? { ...t, score: t.score + 1 } : t
    )
    onResolved(updatedTeams)
  }

  return (
    <div className={styles.screen}>
      {/* Pulsing rings */}
      <div className={styles.ring} />
      <div className={styles.ring2} />

      {/* Title */}
      <h1 className={styles.title}>⚡ Tiebreaker!</h1>
      <p className={styles.subtitle}>Det er uavgjort – ett spørsmål avgjør alt!</p>

      {/* Face-off */}
      <div className={styles.faceoff}>
        {tiedTeams.map((team, i) => (
          <React.Fragment key={team.id}>
            {i > 0 && <span className={styles.vs}>VS</span>}
            <div
              className={styles.teamCard}
              style={{ '--team-color': teamColorMap[team.id] } as CSSProperties}
            >
              <span className={styles.teamCardName}>{team.name}</span>
              <span className={styles.teamCardScore}>{team.score}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Question */}
      <div className={styles.questionCard}>
        <p className={styles.questionLabel}>Avgjørende spørsmål</p>
        <p className={styles.questionText}>{q.question}</p>

        {revealed && (
          <div className={styles.answerSection}>
            <p className={styles.answerLabel}>Svar</p>
            <p className={styles.answerText}>{q.answer}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {!revealed ? (
          <button className={styles.revealBtn} onClick={handleReveal}>
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
                  onClick={() => handleAward(team.id)}
                >
                  {team.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
