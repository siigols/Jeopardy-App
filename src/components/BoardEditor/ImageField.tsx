import { useId, useRef, useState } from 'react'
import { useSounds } from '../../hooks/useSounds'
import { ImageUploadError, uploadImage } from '../../utils/imageUpload'
import styles from './ImageField.module.css'

interface Props {
  label: string
  /** The stored image path, or undefined when the author hasn't picked one. */
  value?: string
  onChange: (value: string | undefined) => void
  /** Hides the label text (it stays for screen readers) and lays the row out inline. */
  compact?: boolean
}

/**
 * One optional picture: a thumbnail, an upload button and a remove button.
 *
 * Shared by every place a board author can attach an image — the two question
 * types, the Høyere/Lavere rows and the board background — so the upload flow,
 * its error text and its keyboard behaviour are identical everywhere.
 */
export default function ImageField({ label, value, onChange, compact = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { playHover, playClick } = useSounds()
  const inputId = useId()

  async function handleFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      onChange(await uploadImage(file))
    } catch (err) {
      setError(err instanceof ImageUploadError ? err.message : 'Kunne ikke laste opp bildet.')
    } finally {
      setBusy(false)
      // Clear the picker so choosing the very same file again still fires a change.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={`${styles.root} ${compact ? styles.rootCompact : ''}`}>
      <span
        className={compact ? styles.visuallyHidden : styles.label}
        id={`${inputId}-label`}
      >
        {label}
      </span>
      <div className={styles.controls}>
        {value ? (
          <img className={styles.thumb} src={value} alt="" />
        ) : (
          <span className={styles.placeholder} aria-hidden="true">
            🖼
          </span>
        )}
        <input
          ref={inputRef}
          id={inputId}
          className={styles.fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          aria-labelledby={`${inputId}-label`}
          onChange={e => void handleFile(e.target.files?.[0])}
        />
        <label
          className={`${styles.btn} ${busy ? styles.btnBusy : ''}`}
          htmlFor={inputId}
          onMouseEnter={playHover}
        >
          {busy ? 'Laster opp…' : value ? 'Bytt bilde' : 'Last opp bilde'}
        </label>
        {value && !busy && (
          <button
            type="button"
            className={styles.btn}
            onMouseEnter={playHover}
            onClick={() => {
              playClick()
              setError(null)
              onChange(undefined)
            }}
          >
            Fjern
          </button>
        )}
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
