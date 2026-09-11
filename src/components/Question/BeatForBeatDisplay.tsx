import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
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
 * How far a box may be squeezed below the width it wants before the line is
 * better off breaking, the width no box ever goes under, and the number of boxes
 * a row keeps even when they no longer fit comfortably. A little over half is
 * deliberate: it is what lets a full line of long words stay on one row on a
 * wide screen, while a row of postage stamps never happens.
 */
const BOX_SQUEEZE = 0.55
const BOX_MIN_PX = 96
const ROW_MIN_BOXES = 3

/** How many boxes fit side by side in `available` px, given the width one box wants. */
function boxesPerRow(available: number, ideal: number, gap: number) {
  const fits = (box: number) => Math.floor((available + gap) / (box + gap))
  const comfortable = fits(Math.max(BOX_MIN_PX, ideal * BOX_SQUEEZE))
  // Without a lower bound, a line of long words on a phone — where no box can be
  // comfortable — would come out one word per row, a column rather than a line.
  const crowded = Math.min(ROW_MIN_BOXES, fits(BOX_MIN_PX))
  return Math.max(1, comfortable, crowded)
}

/**
 * Columns for `count` boxes when at most `maxPerRow` fit side by side: as few
 * rows as that allows, with the boxes spread evenly over them — ten words that
 * cannot share a row become 5 + 5, never 9 + 1.
 */
function columnsFor(count: number, maxPerRow: number) {
  const rows = Math.max(1, Math.ceil(count / maxPerRow))
  return Math.max(1, Math.ceil(count / rows))
}

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

  // Every box is the same size, whatever word is behind it: a box that grew with
  // its word would tell the players how long the answer is before they open it.
  // One width, taken from the longest word in the line, fits them all.
  const boxChars = Math.min(16, Math.max(4, ...content.words.map(word => word.length)))

  // How many boxes stand side by side. The line is a sentence, so it stays on one
  // row whenever the screen can hold it — the boxes give up a few pixels each
  // rather than dropping the last words onto a row of their own — and breaks into
  // even rows only once the boxes would be squeezed past BOX_SQUEEZE. That is a
  // question about pixels, so it is measured rather than guessed at breakpoints:
  // the width a box wants depends on the longest word in this particular line.
  const count = content.words.length
  const wordsRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(count)

  useLayoutEffect(() => {
    const words = wordsRef.current
    const row = words?.parentElement
    if (!words || !row) return

    // The row around the grid is what gets measured, never the grid: the grid's
    // own width follows from the column count, so measuring it would feed each
    // result into the next measurement.
    const update = () => {
      const style = getComputedStyle(words)
      const gap = parseFloat(style.columnGap) || 0
      // Registered as a <length> in the stylesheet, so it arrives here in px.
      const ideal = parseFloat(style.getPropertyValue('--bfb-box-max'))
      if (!ideal) return
      setColumns(columnsFor(count, boxesPerRow(row.clientWidth, ideal, gap)))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(row)
    return () => observer.disconnect()
  }, [count, boxChars])

  function flip(index: number) {
    if (flipped.has(index)) return
    setFlipped(prev => new Set(prev).add(index))
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Beat for beat</h2>

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

      <div
        ref={wordsRef}
        className={styles.words}
        style={{ '--bfb-chars': boxChars, '--bfb-cols': columns } as CSSProperties}
      >
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
