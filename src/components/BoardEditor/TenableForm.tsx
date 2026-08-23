import { useId } from 'react'
import type { TenableTileDraft } from '../../types/game'
import { TEXT_MAX } from './types'
import styles from './TileEditorModal.module.css'

interface Props {
  tile: TenableTileDraft
  onChange: (tile: TenableTileDraft) => void
}

/** Topp 10: one prompt plus ten ranked answers, rank N awarding N × 100 poeng. */
export default function TenableForm({ tile, onChange }: Props) {
  const promptId = useId()

  function setItem(index: number, value: string) {
    onChange({ ...tile, items: tile.items.map((item, i) => (i === index ? value : item)) })
  }

  return (
    <div className={styles.body}>
      <p className={styles.note}>
        En Topp 10-rute gir poeng etter plassering (plassering × 100), ikke rutas egne poeng.
        Alle ti svarene må fylles ut.
      </p>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={promptId}>
          Spørsmål
        </label>
        <textarea
          id={promptId}
          className={styles.textarea}
          value={tile.prompt}
          maxLength={TEXT_MAX}
          placeholder="F.eks. «Nevn de ti mest folkerike landene»"
          onChange={e => onChange({ ...tile, prompt: e.target.value })}
        />
      </div>
      <div className={styles.rows}>
        {tile.items.map((item, i) => (
          <div className={styles.row} key={i}>
            <span className={styles.rowLabel}>{`${i + 1}. ${(i + 1) * 100} p`}</span>
            <input
              className={styles.input}
              value={item}
              maxLength={TEXT_MAX}
              placeholder={`Svar ${i + 1}`}
              aria-label={`Svar ${i + 1} (${(i + 1) * 100} poeng)`}
              onChange={e => setItem(i, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
