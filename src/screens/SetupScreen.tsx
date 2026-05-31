import { useState } from 'react'
import type { Team } from '../types/game'
import styles from './SetupScreen.module.css'

interface Props {
  onStart: (teams: Team[]) => void
}

const DEFAULT_NAMES = ['Team 1', 'Team 2', 'Team 3', 'Team 4']

export default function SetupScreen({ onStart }: Props) {
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
      name: name.trim() || `Team ${i + 1}`,
      score: 0,
    }))
    onStart(teams)
  }

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>Jeopardy!</h1>
      <div className={styles.card}>
        <h2 className={styles.subtitle}>Setup</h2>

        <div className={styles.field}>
          <label className={styles.label}>Number of teams</label>
          <div className={styles.countBtns}>
            {[2, 3, 4, 5, 6].map(n => (
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
          <label className={styles.label}>Team names</label>
          <div className={styles.inputs}>
            {Array.from({ length: teamCount }, (_, i) => (
              <input
                key={i}
                className={styles.input}
                value={names[i] ?? `Team ${i + 1}`}
                onChange={e => handleNameChange(i, e.target.value)}
                placeholder={`Team ${i + 1}`}
                maxLength={24}
              />
            ))}
          </div>
        </div>

        <button className={styles.startBtn} onClick={handleStart}>
          Start Game
        </button>
      </div>
    </div>
  )
}
