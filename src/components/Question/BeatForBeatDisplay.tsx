import { useState } from 'react'
import { useSounds } from '../../hooks/useSounds'
import { youTubeEmbedUrl, type BeatForBeatQuestion } from '../../types/game'
import styles from './BeatForBeatDisplay.module.css'

interface Props {
  content: BeatForBeatQuestion
  revealed: boolean
}

/** Spoken colour names, so the meaning never lives in colour alone. */
const COLOR_NAMES = { blue: 'blå', red: 'rød' } as const

/**
 * Beat for Beat: one box per word of a song line. A box flips on click and shows
 * the word on the colour the author hid behind it. The host's "Vis hele linja"
 * button opens whatever is left.
 *
 * Flipped state lives here rather than in QuestionView — like HigherLowerDisplay's
 * step counter — because nothing outside this component needs to know which words
 * are open. The question awards flat tile points, so there is nothing to report up.
 *
 * State is reset by unmounting, not by an effect: GameScreen clears the active
 * tile between questions and BoardPreview keys QuestionView on the tile, so this
 * component is never handed a different `content` while mounted. That is also what
 * guarantees the audio stops — the iframe goes with it.
 */
export default function BeatForBeatDisplay({ content, revealed }: Props) {
  const [flipped, setFlipped] = useState<Set<number>>(() => new Set())
  const [playing, setPlaying] = useState(false)
  const { playHover } = useSounds()

  const hasClip = Boolean(content.youtubeId)
  const fasit = [content.songTitle, content.artist].filter(Boolean).join(' – ')

  function flip(index: number) {
    if (flipped.has(index)) return
    setFlipped(prev => new Set(prev).add(index))
  }

  return (
    <div className={styles.container}>
      {hasClip && (
        <div className={styles.playerRow}>
          <button
            type="button"
            className={styles.playBtn}
            onMouseEnter={playHover}
            onClick={() => setPlaying(p => !p)}
            aria-pressed={playing}
          >
            {playing ? '⏹ Stopp' : '▶ Spill av'}
          </button>
          {playing && (
            // Mounted only on a real click so autoplay policy lets it through, and
            // unmounted to stop — which also kills the audio when the question is
            // closed. Offscreen rather than `display: none`, which browsers are
            // free to treat as "not rendered" and refuse to play.
            <iframe
              className={styles.player}
              title="Lydklipp"
              src={youTubeEmbedUrl({ id: content.youtubeId!, start: content.youtubeStart })}
              allow="autoplay"
              tabIndex={-1}
              aria-hidden="true"
            />
          )}
        </div>
      )}

      <div className={styles.words}>
        {content.words.map((word, index) => {
          const isOpen = revealed || flipped.has(index)
          const color = content.colors[index] ?? 'blue'

          return (
            <button
              key={index}
              type="button"
              className={`${styles.box} ${isOpen ? `${styles.open} ${styles[color]}` : ''}`}
              disabled={isOpen}
              onMouseEnter={isOpen ? undefined : playHover}
              onClick={() => flip(index)}
              aria-label={isOpen ? `${word} – ${COLOR_NAMES[color]}` : `Ord ${index + 1}, skjult`}
            >
              {isOpen ? word : index + 1}
            </button>
          )
        })}
      </div>

      {revealed && fasit && <p className={styles.fasit}>{fasit}</p>}
    </div>
  )
}
