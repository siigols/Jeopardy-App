import { useEffect, useMemo } from 'react'
import type { Team, Game } from '../types/game'
import BoardBackground from '../components/Backgrounds/BoardBackground'
import { useSounds } from '../hooks/useSounds'
import styles from './PodiumScreen.module.css'

const TEAM_COLORS = ['#e74c3c', '#3b82f6', '#22c55e', '#f97316']

const CONFETTI_COLORS = [
  '#f5a623', '#e74c3c', '#3b82f6', '#22c55e', '#f97316',
  '#9b59b6', '#1abc9c', '#e91e63', '#ffd700', '#00bcd4',
  '#ff6b6b', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd',
]

const CELEBRATION_EMOJIS = ['🎉', '🎊', '⭐', '✨', '🥳', '🏅', '💫', '🌟']

interface Props {
  teams: Team[]
  game: Game
  onPlayAgain: () => void
  onNewBoard: () => void
}

export default function PodiumScreen({ teams, game, onPlayAgain, onNewBoard }: Props) {
  const { playAward, playHover } = useSounds()

  // Play victory fanfare on mount — triple chord for maximum celebration
  useEffect(() => {
    playAward()
    const t1 = setTimeout(() => playAward(), 500)
    const t2 = setTimeout(() => playAward(), 1100)
    return () => { clearTimeout(t1); clearTimeout(t2) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sort teams by score descending (stable sort preserves insertion order for ties)
  const ranked = useMemo(
    () => [...teams].sort((a, b) => b.score - a.score),
    [teams]
  )

  // Build color map from original team order
  const teamColorMap = useMemo(
    () => Object.fromEntries(teams.map((t, i) => [t.id, TEAM_COLORS[i % TEAM_COLORS.length]])),
    [teams]
  )

  const first = ranked[0]
  const second = ranked[1]
  const third = ranked[2]

  const isFootball = game.theme?.decorations === 'football'

  // Generate confetti pieces — more of them with varied shapes
  const confettiPieces = useMemo(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: `${Math.random() * 4}s`,
      duration: `${3 + Math.random() * 3}s`,
      width: `${5 + Math.random() * 10}px`,
      height: `${3 + Math.random() * 12}px`,
      swayDelay: `${Math.random() * 2}s`,
      swayDuration: `${1.5 + Math.random() * 1.5}s`,
      borderRadius: Math.random() > 0.5 ? '50%' : `${Math.random() * 4}px`,
    })), []
  )

  // Generate sparkle particles
  const sparkles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${10 + Math.random() * 80}%`,
      top: `${10 + Math.random() * 80}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${1.5 + Math.random() * 2}s`,
    })), []
  )

  // Generate floating celebration emojis
  const floatingEmojis = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      emoji: CELEBRATION_EMOJIS[i % CELEBRATION_EMOJIS.length],
      left: `${5 + Math.random() * 90}%`,
      top: `${10 + Math.random() * 80}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${2.5 + Math.random() * 2}s`,
      size: `${1.5 + Math.random() * 1.5}rem`,
    })), []
  )

  return (
    <div className={`${styles.screen} ${isFootball ? styles.footballScreen : ''}`}>
      <BoardBackground id={game.theme?.decorations} />

      {/* Spotlight glows */}
      <div className={styles.spotlight} />
      <div className={styles.spotlightSecondary} />

      {/* Starburst behind podium */}
      <div className={styles.starburst} />

      {/* Sparkle particles */}
      {sparkles.map(s => (
        <div
          key={s.id}
          className={styles.sparkle}
          style={{
            left: s.left,
            top: s.top,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        />
      ))}

      {/* Floating emojis */}
      {floatingEmojis.map(e => (
        <span
          key={e.id}
          className={styles.floatingEmoji}
          style={{
            left: e.left,
            top: e.top,
            fontSize: e.size,
            animationDelay: e.delay,
            animationDuration: e.duration,
          }}
        >
          {e.emoji}
        </span>
      ))}

      {/* Confetti */}
      <div className={styles.confettiLayer}>
        {confettiPieces.map(p => (
          <div
            key={p.id}
            className={styles.confetti}
            style={{
              left: p.left,
              width: p.width,
              height: p.height,
              backgroundColor: p.color,
              borderRadius: p.borderRadius,
              animationDelay: `${p.delay}, ${p.swayDelay}`,
              animationDuration: `${p.duration}, ${p.swayDuration}`,
            }}
          />
        ))}
      </div>

      {/* Title */}
      <h1 className={styles.title}>🏆 {first.name} vinner!</h1>
      <p className={styles.subtitle}>Gratulerer med seieren!</p>

      {/* Podium: 2nd — 1st — 3rd */}
      <div className={styles.podiumArea}>
        {second && (
          <div
            className={`${styles.podiumBlock} ${styles.second}`}
            style={{ '--team-color': teamColorMap[second.id] } as React.CSSProperties}
          >
            <span className={styles.medal}>🥈</span>
            <p className={styles.podiumName}>{second.name}</p>
            <span className={styles.podiumScore}>{second.score}</span>
            <span className={styles.placement}>2. plass</span>
          </div>
        )}

        <div
          className={`${styles.podiumBlock} ${styles.first}`}
          style={{ '--team-color': teamColorMap[first.id] } as React.CSSProperties}
        >
          <span className={styles.crown}>👑</span>
          <p className={styles.podiumName}>{first.name}</p>
          <span className={styles.podiumScore}>{first.score}</span>
          <span className={styles.placement}>1. plass</span>
        </div>

        {third && (
          <div
            className={`${styles.podiumBlock} ${styles.third}`}
            style={{ '--team-color': teamColorMap[third.id] } as React.CSSProperties}
          >
            <span className={styles.medal}>🥉</span>
            <p className={styles.podiumName}>{third.name}</p>
            <span className={styles.podiumScore}>{third.score}</span>
            <span className={styles.placement}>3. plass</span>
          </div>
        )}
      </div>

      {/* Full ranking */}
      <div className={styles.rankingSection}>
        <p className={styles.rankingTitle}>Fullstendig rangering</p>
        {ranked.map((team, i) => (
          <div
            key={team.id}
            className={styles.rankItem}
            style={{ animationDelay: `${1.0 + i * 0.12}s` }}
          >
            <span className={styles.rankNumber}>{i + 1}.</span>
            <div
              className={styles.rankColorDot}
              style={{ backgroundColor: teamColorMap[team.id] }}
            />
            <span className={styles.rankName}>{team.name}</span>
            <span className={styles.rankScore}>{team.score}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.primaryBtn} onMouseEnter={playHover} onClick={onPlayAgain}>
          Spill igjen
        </button>
        <button className={styles.secondaryBtn} onMouseEnter={playHover} onClick={onNewBoard}>
          Velg nytt brett
        </button>
      </div>
    </div>
  )
}
