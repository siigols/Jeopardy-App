import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useSounds } from '../../hooks/useSounds'
import { youTubeEmbedUrl, type BeatForBeatQuestion } from '../../types/game'
import styles from './BeatForBeatDisplay.module.css'

interface Layout {
  /** Boxes side by side. */
  columns: number
  /** The width one box wants: the longest word at FONT_MAX_PX, plus padding. */
  boxPx: number
  /** The type size that keeps that word on one line in the width it got. */
  fontPx: number
}

interface Props {
  content: BeatForBeatQuestion
  revealed: boolean
}

/** Spoken colour names, so the meaning never lives in colour alone. */
const COLOR_NAMES = { blue: 'blå', red: 'rød' } as const

/**
 * The type sizes a word is set at, in px: what a box aims for, and the smallest
 * that still reads on a phone. A box is never narrower than the widest word in
 * the line needs at the smaller of the two, so a word never wraps — the line
 * breaks into another row of wider boxes instead.
 */
const FONT_MAX_PX = 32
const FONT_MIN_PX = 16

/**
 * How far a box may be squeezed below the width it wants before the line is
 * better off breaking, the width no box ever goes under whatever the words are,
 * and the number of boxes a row keeps even when they no longer fit comfortably.
 * A little over half is deliberate: it is what lets a full line of long words
 * stay on one row on a wide screen, while a row of postage stamps never happens.
 */
const BOX_SQUEEZE = 0.55
const BOX_MIN_PX = 96
const ROW_MIN_BOXES = 3

/**
 * A hair of slack on top of a measured width, for the sub-pixel difference
 * between measuring a word and laying it out. A fraction of a pixel is all it
 * takes to push the last letter onto a line of its own.
 */
const WORD_SLACK = 1.02

/**
 * The width of the widest word at `fontPx`, measured with a ruler inside a real
 * box so it inherits the family, weight and letter spacing rather than guessing
 * at them. Measured at the size it will be set at, never scaled from one sample:
 * glyph widths are rounded to the pixel grid, so a word is a couple of percent
 * wider at 32px than twice its width at 16px — enough to break it in half.
 *
 * offsetWidth rather than a client rect: a box mid-flip carries a scale, and a
 * measurement is meant to be of the layout, not of the animation.
 */
function widestWordPx(words: string[], box: HTMLElement, fontPx: number) {
  const ruler = document.createElement('span')
  ruler.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-size:${fontPx}px`
  box.appendChild(ruler)

  let widest = 0
  for (const word of words) {
    ruler.textContent = word
    widest = Math.max(widest, ruler.offsetWidth)
  }

  ruler.remove()
  return widest * WORD_SLACK
}

/** How many boxes fit side by side in `available` px, given the width one box
 *  wants and the width below which its word would no longer fit on one line. */
function boxesPerRow(available: number, ideal: number, min: number, gap: number) {
  const fits = (box: number) => Math.floor((available + gap) / (box + gap))
  const comfortable = fits(Math.max(min, ideal * BOX_SQUEEZE))
  // Without a lower bound, a line of long words on a phone — where no box can be
  // comfortable — would come out one word per row, a column rather than a line.
  const crowded = Math.min(ROW_MIN_BOXES, fits(min))
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
  // One width, taken from the longest word in the line, fits them all — and it is
  // wide enough that the word stands on a single line.
  //
  // How many boxes stand side by side follows from that width. The line is a
  // sentence, so it stays on one row whenever the screen can hold it — the boxes
  // give up a few pixels each rather than dropping the last words onto a row of
  // their own — and breaks into even rows only once the boxes would be squeezed
  // past BOX_SQUEEZE. That is a question about pixels, so it is measured rather
  // than guessed at breakpoints.
  const count = content.words.length
  const wordsRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<Layout>({ columns: count, boxPx: 0, fontPx: FONT_MAX_PX })

  const wordsKey = content.words.join('\n')

  useLayoutEffect(() => {
    const words = wordsRef.current
    const row = words?.parentElement
    const box = words?.firstElementChild
    if (!words || !row || !(box instanceof HTMLElement)) return

    // The row around the grid is what gets measured, never the grid: the grid's
    // own width follows from the column count, so measuring it would feed each
    // result into the next measurement.
    const update = () => {
      const gap = parseFloat(getComputedStyle(words).columnGap) || 0
      // Everything of a box that is not room for the word — padding and borders
      // both, since a border left out here is a word broken in half.
      const chrome =
        box.offsetWidth - box.clientWidth + 2 * (parseFloat(getComputedStyle(box).paddingLeft) || 0)

      // What a box has to be to hold the longest word at the two sizes that
      // matter: the one it aims for, and the smallest it may fall back to.
      const line = wordsKey.split('\n')
      const wordMax = widestWordPx(line, box, FONT_MAX_PX)
      if (!wordMax) return
      const boxPx = wordMax + chrome
      const minPx = Math.max(BOX_MIN_PX, widestWordPx(line, box, FONT_MIN_PX) + chrome)

      const columns = columnsFor(count, boxesPerRow(row.clientWidth, boxPx, minPx, gap))
      // The type is sized from the width the boxes ended up with, not from the
      // width they wanted: a squeezed column keeps its word on one line by setting
      // it smaller, down to FONT_MIN_PX — which is the width `minPx` guarantees.
      const actual = Math.min(boxPx, (row.clientWidth - (columns - 1) * gap) / columns)
      const fontPx = Math.min(
        FONT_MAX_PX,
        Math.max(FONT_MIN_PX, ((actual - chrome) / wordMax) * FONT_MAX_PX)
      )

      setLayout(prev =>
        prev.columns === columns && prev.boxPx === boxPx && prev.fontPx === fontPx
          ? prev
          : { columns, boxPx, fontPx }
      )
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(row)
    return () => observer.disconnect()
  }, [count, wordsKey])

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
        style={{
          '--bfb-cols': layout.columns,
          '--bfb-box-max': `${layout.boxPx}px`,
          '--bfb-font': `${layout.fontPx}px`,
        } as CSSProperties}
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
