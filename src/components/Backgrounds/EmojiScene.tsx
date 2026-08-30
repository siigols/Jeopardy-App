import { useMemo, type CSSProperties } from 'react'
import styles from './EmojiScene.module.css'

export type SceneMotion = 'twinkle' | 'fall' | 'rise'

export interface SceneConfig {
  /** Cycled through in order, so every symbol appears roughly equally often. */
  symbols: string[]
  count: number
  motion: SceneMotion
  /** Class from EmojiScene.module.css painting the full-screen color wash. */
  wash: string
  /** Font-size range in rem. */
  minSize: number
  maxSize: number
  /** Base animation length in seconds; each piece varies +/-30% around it. */
  duration: number
  opacity: number
}

/**
 * Deterministic 0..1 generator. Pure, unlike Math.random, so the layout is
 * identical on every render and the scene never reshuffles mid-game.
 */
function rand(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/**
 * A full-screen decorative layer of drifting symbols. Sits at z-index 1, below
 * the top bar and board (both z-index 2 in GameScreen.module.css), and never
 * takes pointer events. Shared by every non-football board background.
 */
export default function EmojiScene({ config }: { config: SceneConfig }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: config.count }, (_, i) => ({
        id: i,
        symbol: config.symbols[i % config.symbols.length],
        left: `${rand(i * 7) * 100}%`,
        top: `${rand(i * 7 + 1) * 100}%`,
        size: `${config.minSize + rand(i * 7 + 2) * (config.maxSize - config.minSize)}rem`,
        // Negative delay starts each piece mid-flight, so the scene is already
        // populated on the first frame instead of falling in from empty.
        delay: `-${(rand(i * 7 + 3) * config.duration).toFixed(2)}s`,
        duration: `${(config.duration * (0.7 + rand(i * 7 + 4) * 0.6)).toFixed(2)}s`,
        drift: `${Math.round((rand(i * 7 + 5) * 2 - 1) * 80)}px`,
        spin: `${Math.round((rand(i * 7 + 6) * 2 - 1) * 360)}deg`,
      })),
    [config]
  )

  return (
    <div className={styles.root} aria-hidden>
      <div className={`${styles.wash} ${config.wash}`} />
      {pieces.map(piece => (
        <span
          key={piece.id}
          className={`${styles.piece} ${styles[config.motion]}`}
          style={
            {
              left: piece.left,
              ...(config.motion === 'twinkle' ? { top: piece.top } : {}),
              fontSize: piece.size,
              opacity: config.opacity,
              '--dur': piece.duration,
              '--delay': piece.delay,
              '--drift': piece.drift,
              '--spin': piece.spin,
            } as CSSProperties
          }
        >
          {piece.symbol}
        </span>
      ))}
    </div>
  )
}
