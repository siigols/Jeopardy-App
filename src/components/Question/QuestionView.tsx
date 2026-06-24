import { useEffect, useState, type CSSProperties } from 'react'
import { useSounds } from '../../hooks/useSounds'
import type { Team, Tile } from '../../types/game'
import type { TeamInfo } from '../../types/socket-events'
import MultipleChoiceDisplay from './MultipleChoiceDisplay'
import OverUnderDisplay from './OverUnderDisplay'
import styles from './QuestionView.module.css'
import SimpleQuestionDisplay from './SimpleQuestionDisplay'
import TenableDisplay from './TenableDisplay'
import YearCountryImageDisplay from './YearCountryImageDisplay'

interface Props {
  tile: Tile
  teams: Team[]
  teamColors: Record<string, string>
  buzzerWinner: TeamInfo | null
  onAward: (teamId: string | null, awardedPoints?: number) => void
}

export default function QuestionView({ tile, teams, teamColors, buzzerWinner, onAward }: Props) {
  const [revealed, setReveal] = useState(false)
  const [tenableRevealedCount, setTenableRevealedCount] = useState(0)
  const [tenableAutoRevealActive, setTenableAutoRevealActive] = useState(false)
  const [selectedTenableData, setSelectedTenableData] = useState<{ tile: Tile | null; points: number | null }>({ tile: null, points: null })
  const { playReveal, playAward, playSkip, playBuzz, playHover } = useSounds()

  // Auto-reset selected points when tile changes
  const selectedTenablePoints = selectedTenableData.tile === tile ? selectedTenableData.points : null

  useEffect(() => {
    if (tile.content.type !== 'tenable') return
    if (!tenableAutoRevealActive || revealed) return
    const total = tile.content.items.length
    if (tenableRevealedCount >= total) return

    const timer = window.setTimeout(() => {
      const next = tenableRevealedCount + 1
      setTenableRevealedCount(next)
      if (next >= total) {
        setReveal(true)
        setTenableAutoRevealActive(false)
      }
    }, 900)

    return () => window.clearTimeout(timer)
  }, [tile.content, revealed, tenableAutoRevealActive, tenableRevealedCount])

  useEffect(() => {
    if (buzzerWinner) playBuzz()
  }, [buzzerWinner, playBuzz])

  function handleReveal() {
    if (tile.content.type === 'tenable') {
      if (tile.content.items.length === 0) {
        setReveal(true)
        return
      }

      if (tenableAutoRevealActive) return

      playReveal()
      setTenableRevealedCount(1)

      if (tile.content.items.length === 1) {
        setReveal(true)
        return
      }

      setTenableAutoRevealActive(true)

      return
    }

    playReveal()
    setReveal(true)
  }

  function handleAward(teamId: string) {
    playAward()

    if (tile.content.type === 'yearCountryImage') {
      onAward(teamId, 0)
      return
    }

    if (tile.content.type === 'tenable') {
      if (selectedTenablePoints == null) return
      onAward(teamId, selectedTenablePoints)
      return
    }

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
      case 'overUnder':
        return <OverUnderDisplay content={tile.content} revealed={revealed} onAllRevealed={handleReveal} />
      case 'yearCountryImage':
        return <YearCountryImageDisplay content={tile.content} revealed={revealed} />
      case 'tenable':
        return (
          <TenableDisplay
            content={tile.content}
            revealedCount={revealed ? tile.content.items.length : tenableRevealedCount}
            selectedIndex={selectedTenablePoints != null ? (selectedTenablePoints / 100) - 1 : null}
            selectionEnabled={revealed}
            onSelectIndex={(index) => setSelectedTenableData({ tile, points: (index + 1) * 100 })}
          />
        )
      case 'multipleChoice':
        return <MultipleChoiceDisplay content={tile.content} revealed={revealed} />
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

      <div className={styles.body}>
        {renderContent()}
      </div>

      <div className={styles.actions}>
        {!revealed ? (
          <button
            className={styles.revealBtn}
            onMouseEnter={playHover}
            onClick={handleReveal}
            disabled={tile.content.type === 'tenable' && tenableAutoRevealActive}
          >
            {tile.content.type === 'overUnder'
              ? 'Vis alle svar'
              : tile.content.type === 'tenable'
                ? tenableAutoRevealActive
                  ? 'Avslører...'
                  : 'Start avsløring'
                : 'Vis svar'}
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
                  disabled={tile.content.type === 'tenable' && selectedTenablePoints == null}
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
