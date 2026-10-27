import { useState } from 'react'
import type { Team } from '../types/game'
import { useSounds } from '../hooks/useSounds'
import styles from './SetupScreen.module.css'
import { Input } from '../components/ui'
import { MIN_TEAMS, MAX_TEAMS, DEFAULT_TEAM_NAMES } from '../data/teams'

interface Props {
  gameTitle: string
  onStart: (teams: Team[]) => void
  onBack: () => void
}

const COUNT_OPTIONS = Array.from(
  { length: MAX_TEAMS - MIN_TEAMS + 1 },
  (_, i) => MIN_TEAMS + i
)

export default function SetupScreen({ gameTitle, onStart, onBack }: Props) {
  const [teamCount, setTeamCount] = useState(MIN_TEAMS)
  const [names, setNames] = useState<string[]>(DEFAULT_TEAM_NAMES)
  const { playHover, playStart } = useSounds()

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
    playStart()
    onStart(teams)
  }

  return (
    <div className={styles.screen}>
      <button className={styles.backBtn} onMouseEnter={playHover} onClick={() => onBack()}>← Tilbake</button>

      <h1 className={styles.title}>Jeopardy!</h1>
      <p className={styles.boardName}>{gameTitle}</p>

      <div className={styles.card}>
        <h2 className={styles.subtitle}>Oppsett</h2>

        <div className={styles.field}>
          <label className={styles.label}>Antall lag</label>
          <div className={styles.countBtns}>
            {COUNT_OPTIONS.map(n => (
              <button
                key={n}
                className={`${styles.countBtn} ${teamCount === n ? styles.active : ''}`}
                onMouseEnter={playHover}
                onClick={() => setTeamCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Lagnavn</label>
          <div className={`${styles.inputs} ${teamCount > 3 ? styles.inputsGrid : ''}`}>
            {Array.from({ length: teamCount }, (_, i) => (
              <Input
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

        <button className={styles.startBtn} onMouseEnter={playHover} onClick={handleStart}>
          Start spill
        </button>
      </div>
    </div>
  )
}
