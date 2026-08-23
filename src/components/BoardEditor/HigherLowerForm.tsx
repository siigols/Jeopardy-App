import { useId } from 'react'
import { useSounds } from '../../hooks/useSounds'
import { HL_MAX_ITEMS, HL_MIN_ITEMS, HL_POINTS_PER_COMPARISON } from '../../types/game'
import { HL_LABEL_MAX, TEXT_MAX, parseHlNumber } from './types'
import type { HigherLowerEditorItem, HigherLowerEditorTile } from './types'
import styles from './TileEditorModal.module.css'

const NUMBER_FORMAT = new Intl.NumberFormat('nb-NO')

interface Props {
  tile: HigherLowerEditorTile
  onChange: (tile: HigherLowerEditorTile) => void
}

/** Formats a raw input string for preview, or null when it isn't a usable number. */
function previewValue(raw: string): string | null {
  const n = parseHlNumber(raw)
  return n === null ? null : NUMBER_FORMAT.format(n)
}

/** Høyere/Lavere: a metric plus 4–6 labelled numbers, shown in the given order. */
export default function HigherLowerForm({ tile, onChange }: Props) {
  const metricId = useId()
  const { playHover } = useSounds()

  function setItem(index: number, patch: Partial<HigherLowerEditorItem>) {
    onChange({ ...tile, items: tile.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) })
  }

  function addRow() {
    if (tile.items.length >= HL_MAX_ITEMS) return
    onChange({ ...tile, items: [...tile.items, { label: '', numericValue: '' }] })
  }

  function removeRow() {
    if (tile.items.length <= HL_MIN_ITEMS) return
    onChange({ ...tile, items: tile.items.slice(0, -1) })
  }

  return (
    <div className={styles.body}>
      <p className={styles.note}>
        {HL_MIN_ITEMS}–{HL_MAX_ITEMS} rader. Radene vises i den rekkefølgen de står her, og
        tallet formateres automatisk når spørsmålet spilles.
      </p>
      <p className={styles.note}>
        Ruta gir {HL_POINTS_PER_COMPARISON} poeng per riktig sammenligning ((rader − 1) × {HL_POINTS_PER_COMPARISON}), ikke rutas egne poeng.
        {HL_MIN_ITEMS}–{HL_MAX_ITEMS} rader gir altså maks {(HL_MIN_ITEMS - 1) * HL_POINTS_PER_COMPARISON}–{(HL_MAX_ITEMS - 1) * HL_POINTS_PER_COMPARISON} poeng.
      </p>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={metricId}>
          Måleenhet
        </label>
        <input
          id={metricId}
          className={styles.input}
          value={tile.metric}
          maxLength={TEXT_MAX}
          placeholder="F.eks. «innbyggere»"
          onChange={e => onChange({ ...tile, metric: e.target.value })}
        />
      </div>
      <div className={styles.rows}>
        {/* Index keys are safe here because rows are only ever appended or popped
            from the end — a future arbitrary-row remove would shift values. */}
        {tile.items.map((item, i) => {
          const preview = previewValue(item.numericValue)
          return (
            <div className={styles.row} key={i}>
              <span className={`${styles.rowLabel} ${styles.rowLabelNarrow}`}>{i + 1}</span>
              <input
                className={styles.input}
                value={item.label}
                maxLength={HL_LABEL_MAX}
                placeholder={`Navn ${i + 1}`}
                aria-label={`Rad ${i + 1} navn`}
                onChange={e => setItem(i, { label: e.target.value })}
              />
              <input
                className={`${styles.input} ${styles.hlValue}`}
                value={item.numericValue}
                inputMode="decimal"
                placeholder="Tall"
                aria-label={`Rad ${i + 1} tall`}
                onChange={e => setItem(i, { numericValue: e.target.value })}
              />
              <span className={styles.rowPreview}>{preview ?? ''}</span>
            </div>
          )
        })}
      </div>
      <div className={styles.rowActions}>
        <button
          type="button"
          className={styles.smallBtn}
          disabled={tile.items.length >= HL_MAX_ITEMS}
          onMouseEnter={playHover}
          onClick={addRow}
        >
          + Legg til rad
        </button>
        <button
          type="button"
          className={styles.smallBtn}
          disabled={tile.items.length <= HL_MIN_ITEMS}
          onMouseEnter={playHover}
          onClick={removeRow}
        >
          − Fjern siste rad
        </button>
      </div>
    </div>
  )
}
