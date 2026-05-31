import { useState } from 'react'
import type { Team } from '../types/game'
import styles from './SetupScreen.module.css'

interface Props {
  gameTitle: string
  onStart: (teams: Team[]) => void
  onBack: () => void
}

const DEFAULT_NAMES = ['Lag 1', 'Lag 2', 'Lag 3', 'Lag 4']

export default function SetupScreen({ gameTitle, onStart, onBack }: Props) {
  const [teamCount, setTeamCount] = useState(2)
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES)

  function handleNameChange(index: number, value: string) {
    setNames(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function handleStart() {
    const teams: Team[] = names.slice(0, teamCount).map((name, i) => ({
      id: `team-${i}`,
      name: name.trim() || `Lag ${i + 1}`,
      score: 0,
    }))
    onStart(teams)
  }

  return (
    <div className={styles.screen}>
      <button className={styles.backBtn} onClick={onBack}>← Tilbake</button>

      <h1 className={styles.title}>Jeopardy!</h1>
      <p className={styles.boardName}>{gameTitle}</p>

      <div className={styles.card}>
        <h2 className={styles.subtitle}>Oppsett</h2>

        <div className={styles.field}>
          <label className={styles.label}>Antall lag</label>
          <div className={styles.countBtns}>
            {[2, 3, 4].map(n => (
              <button
                key={n}
                className={`${styles.countBtn} ${teamCount === n ? styles.active : ''}`}
                onClick={() => setTeamCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Lagnavn</label>
          <div className={styles.inputs}>
            {Array.from({ length: teamCount }, (_, i) => (
              <input
                key={i}
                className={styles.input}
                value={names[i] ?? `Lag ${i + 1}`}
                onChange={e => handleNameChange(i, e.target.value)}
                placeholder={`Lag ${i + 1}`}
                maxLength={24}
              />
            ))}
          </div>
        </div>

        <button className={styles.startBtn} onClick={handleStart}>
          Start spill
        </button>
      </div>
    </div>
  )
}
