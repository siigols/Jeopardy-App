import { useEffect, useMemo, useState } from 'react'
import type { Game } from '../../types/game'
import { collectBoardImages, type BoardImageRef } from '../../utils/boardImages'
import styles from './ImageCheckPanel.module.css'

type LoadStatus = 'pending' | 'ok' | 'error'

interface Props {
  game: Game
  /** Opens the tile an image belongs to. Not called for board-level images. */
  onGoToTile: (categoryIndex: number, tileIndex: number) => void
}

/**
 * Loads every picture the board refers to and reports which ones actually
 * resolve, so a typo'd path or a photo that never finished uploading is caught
 * without opening all 25 ruter one by one.
 */
export default function ImageCheckPanel({ game, onGoToTile }: Props) {
  const refs = useMemo(() => collectBoardImages(game), [game])
  // Uploads are content-addressed, so the same photo can appear on several tiles.
  // Fetch each distinct URL once and key the results by URL.
  const urls = useMemo(() => Array.from(new Set(refs.map(r => r.url))), [refs])
  const [status, setStatus] = useState<Record<string, LoadStatus>>({})

  useEffect(() => {
    let cancelled = false
    // No initial setState here: a URL with no entry yet renders as pending, so
    // there is nothing to seed. The panel remounts every time it is opened, so
    // results are never carried over from an earlier check either.
    const images = urls.map(url => {
      const img = new Image()
      const settle = (result: LoadStatus) => () => {
        if (cancelled) return
        setStatus(prev => ({ ...prev, [url]: result }))
      }
      img.onload = settle('ok')
      img.onerror = settle('error')
      img.src = url
      return img
    })

    return () => {
      cancelled = true
      // Dropping the handlers stops a late response from touching unmounted state.
      for (const img of images) {
        img.onload = null
        img.onerror = null
      }
    }
  }, [urls])

  const failed = refs.filter(r => status[r.url] === 'error').length
  const pending = refs.filter(r => status[r.url] === undefined || status[r.url] === 'pending').length

  return (
    <aside className={styles.panel} aria-label="Bildesjekk">
      <p className={styles.summary}>
        {refs.length === 0
          ? 'Ingen bilder i denne tavla.'
          : `${refs.length} ${refs.length === 1 ? 'bilde' : 'bilder'}${
              pending > 0 ? ` · ${pending} sjekkes…` : ''
            }${failed > 0 ? ` · ${failed} feilet` : pending === 0 ? ' · alle OK' : ''}`}
      </p>

      <ul className={styles.list}>
        {refs.map((ref, i) => (
          <ImageRow
            key={`${ref.url}-${ref.location}-${i}`}
            imageRef={ref}
            status={status[ref.url] ?? 'pending'}
            onGoToTile={onGoToTile}
          />
        ))}
      </ul>
    </aside>
  )
}

function ImageRow({
  imageRef,
  status,
  onGoToTile,
}: {
  imageRef: BoardImageRef
  status: LoadStatus
  onGoToTile: (categoryIndex: number, tileIndex: number) => void
}) {
  const { url, location, ci, ti } = imageRef
  const isTile = ci >= 0 && ti >= 0
  const mark = status === 'ok' ? '✓' : status === 'error' ? '✗' : '…'

  const body = (
    <>
      <span className={`${styles.mark} ${styles[status]}`} aria-hidden="true">{mark}</span>
      {status === 'ok' ? (
        <img className={styles.thumb} src={url} alt="" />
      ) : (
        <span className={`${styles.thumb} ${styles.thumbEmpty}`} aria-hidden="true" />
      )}
      <span className={styles.text}>
        <span className={styles.location}>{location}</span>
        <span className={styles.url}>{url}</span>
      </span>
    </>
  )

  return (
    <li className={`${styles.row} ${status === 'error' ? styles.rowError : ''}`}>
      {isTile ? (
        <button type="button" className={styles.rowBtn} onClick={() => onGoToTile(ci, ti)}>
          {body}
        </button>
      ) : (
        <span className={styles.rowBtn}>{body}</span>
      )}
    </li>
  )
}
