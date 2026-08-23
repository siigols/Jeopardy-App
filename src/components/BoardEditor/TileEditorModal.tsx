import { useCallback, useEffect, useId, useRef } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import { useSounds } from '../../hooks/useSounds'
import { BOARD_TILE_POINTS } from '../../types/game'
import HigherLowerForm from './HigherLowerForm'
import MultipleChoiceForm from './MultipleChoiceForm'
import TenableForm from './TenableForm'
import { TYPE_LABELS } from './types'
import type { RichTileDraft } from './types'
import styles from './TileEditorModal.module.css'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'

interface Props {
  categoryIndex: number
  tileIndex: number
  tile: RichTileDraft
  onChange: (tile: RichTileDraft) => void
  onClose: () => void
}

/**
 * Focus-trapped editor for the three rich tile types. Esc and backdrop clicks
 * close it, and focus is restored to whatever opened it.
 */
export default function TileEditorModal({ categoryIndex, tileIndex, tile, onChange, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const { playHover } = useSounds()

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? dialogRef.current)?.focus()
    return () => opener?.focus()
  }, [])

  // Keep the page behind the dialog from scrolling, restoring whatever was set.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === dialogRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  function handleBackdropClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className={styles.backdrop} onMouseDown={handleBackdropClick}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.header}>
          <h2 className={styles.headerTitle} id={titleId}>
            {`Kategori ${categoryIndex + 1} · ${BOARD_TILE_POINTS[tileIndex]} poeng`}
            <span className={styles.headerType}>{TYPE_LABELS[tile.type]}</span>
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Lukk"
            onMouseEnter={playHover}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {tile.type === 'tenable' && <TenableForm tile={tile} onChange={onChange} />}
        {tile.type === 'multipleChoice' && <MultipleChoiceForm tile={tile} onChange={onChange} />}
        {tile.type === 'higherLower' && <HigherLowerForm tile={tile} onChange={onChange} />}

        <div className={styles.footer}>
          <button type="button" className={styles.doneBtn} onMouseEnter={playHover} onClick={onClose}>
            Ferdig
          </button>
        </div>
      </div>
    </div>
  )
}
