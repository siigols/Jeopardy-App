import { useId } from 'react'
import { parseYouTubeUrl } from '../../types/game'
import type { BeatColor } from '../../types/game'
import { BFB_LABEL_MAX, BFB_LINE_MAX, splitLyricWords, syncColors } from './types'
import type { BeatForBeatEditorTile } from './types'
import styles from './TileEditorModal.module.css'
import chipStyles from './BeatForBeatForm.module.css'
import { Input } from '../ui'

interface Props {
  tile: BeatForBeatEditorTile
  onChange: (tile: BeatForBeatEditorTile) => void
}

/** Seconds as `m:ss`, for the "starter på" hint under the link field. */
function formatStart(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Beat for Beat: a lyric line hidden behind one box per word, each box hiding a
 * blue or a red colour the author picks here.
 */
export default function BeatForBeatForm({ tile, onChange }: Props) {
  const lineId = useId()
  const songId = useId()
  const artistId = useId()
  const linkId = useId()

  const words = splitLyricWords(tile.line)
  const colors = syncColors(words, tile.colors)
  const link = tile.youtubeUrl.trim()
  const clip = link ? parseYouTubeUrl(link) : null

  function setLine(line: string) {
    // Colours are re-synced on every keystroke so the chips can never outnumber
    // (or fall short of) the words the author can see.
    onChange({ ...tile, line, colors: syncColors(splitLyricWords(line), tile.colors) })
  }

  function toggleColor(index: number) {
    onChange({
      ...tile,
      colors: colors.map((color, i) => (i === index ? (color === 'blue' ? 'red' : 'blue') : color)),
    })
  }

  function shuffleColors() {
    onChange({
      ...tile,
      colors: colors.map(() => (Math.random() < 0.5 ? 'blue' : 'red') as BeatColor),
    })
  }

  return (
    <div className={styles.body}>
      <p className={styles.note}>
        Skriv én linje fra en sang. Hvert ord blir en boks laget kan velge, og bak boksen ligger
        enten blått eller rødt – trykk på et ord under for å bytte farge. Ruta gir vanlige poeng,
        og tavla røper ikke at det er en Beat for Beat-rute.
      </p>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={lineId}>
          Tekstlinje
        </label>
        <textarea
          id={lineId}
          className={styles.textarea}
          value={tile.line}
          maxLength={BFB_LINE_MAX}
          placeholder="F.eks. «Take on me, take me on»"
          onChange={e => setLine(e.target.value)}
        />
      </div>

      {words.length > 0 && (
        <div className={styles.field}>
          <div className={chipStyles.chipHeader}>
            <span className={styles.label}>{`Farger (${words.length} ord)`}</span>
            <button type="button" className={styles.smallBtn} onClick={shuffleColors}>
              Fordel tilfeldig
            </button>
          </div>
          <div className={chipStyles.chips}>
            {words.map((word, i) => (
              <button
                key={i}
                type="button"
                className={`${chipStyles.chip} ${chipStyles[colors[i]]}`}
                aria-label={`${word} – ${colors[i] === 'blue' ? 'blå' : 'rød'}, trykk for å bytte`}
                onClick={() => toggleColor(i)}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor={songId}>
          Sang (valgfritt)
        </label>
        <Input
          id={songId}
          className={styles.input}
          value={tile.songTitle}
          maxLength={BFB_LABEL_MAX}
          placeholder="Take On Me"
          onChange={e => onChange({ ...tile, songTitle: e.target.value })}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={artistId}>
          Artist (valgfritt)
        </label>
        <Input
          id={artistId}
          className={styles.input}
          value={tile.artist}
          maxLength={BFB_LABEL_MAX}
          placeholder="a-ha"
          onChange={e => onChange({ ...tile, artist: e.target.value })}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={linkId}>
          YouTube-lenke (valgfritt)
        </label>
        <Input
          id={linkId}
          className={styles.input}
          value={tile.youtubeUrl}
          placeholder="https://www.youtube.com/watch?v=djV11Xbc914&t=42"
          onChange={e => onChange({ ...tile, youtubeUrl: e.target.value })}
        />
        {link && (
          <p className={clip ? chipStyles.linkOk : chipStyles.linkBad}>
            {clip
              ? `Lenke i orden${clip.start ? ` – starter på ${formatStart(clip.start)}` : ''}. Programlederen får en «Spill av»-knapp; bare lyden høres.`
              : 'Ugyldig YouTube-lenke. Lim inn hele adressen fra youtube.com eller youtu.be.'}
          </p>
        )}
      </div>
    </div>
  )
}
