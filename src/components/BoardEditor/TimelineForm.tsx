import { useId } from 'react'
import { TIMELINE_EVENT_COUNT, TIMELINE_POINTS_PER_EVENT } from '../../types/game'
import { BFB_LABEL_MAX, TEXT_MAX, type TimelineEditorEvent, type TimelineEditorTile } from './types'
import styles from './TileEditorModal.module.css'
import { Input } from '../ui'

interface Props {
  tile: TimelineEditorTile
  onChange: (tile: TimelineEditorTile) => void
}

/** Plasser hendelsen: events with their years, placed on the timeline by the host. */
export default function TimelineForm({ tile, onChange }: Props) {
  const titleId = useId()

  function setEvent(index: number, patch: Partial<TimelineEditorEvent>) {
    onChange({ ...tile, events: tile.events.map((e, i) => (i === index ? { ...e, ...patch } : e)) })
  }

  return (
    <div className={styles.body}>
      <p className={styles.note}>
        Tidslinja viser de {TIMELINE_EVENT_COUNT} årstallene. Spillerne sier hvor hendelsene hører hjemme,
        og verten drar dem på plass. {TIMELINE_POINTS_PER_EVENT} poeng per riktig plassert. Årstall skrives
        som hele tall (negative for f.Kr.) og må være ulike. Temaet vises på tavla.
      </p>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={titleId}>
          Tema (valgfritt)
        </label>
        <Input
          id={titleId}
          className={styles.input}
          value={tile.title}
          maxLength={BFB_LABEL_MAX}
          placeholder="F.eks. «Oppfinnelser»"
          onChange={e => onChange({ ...tile, title: e.target.value })}
        />
      </div>
      <div className={styles.rows}>
        {tile.events.map((event, i) => (
          <div className={styles.row} key={i}>
            <span className={styles.rowLabel}>{`Hendelse ${i + 1}`}</span>
            <Input
              className={styles.input}
              value={event.label}
              maxLength={TEXT_MAX}
              placeholder={`Hendelse ${i + 1}`}
              aria-label={`Hendelse ${i + 1}`}
              onChange={e => setEvent(i, { label: e.target.value })}
            />
            <Input
              className={`${styles.input} ${styles.hlValue}`}
              value={event.year}
              inputMode="numeric"
              placeholder="År"
              aria-label={`Hendelse ${i + 1} årstall`}
              onChange={e => setEvent(i, { year: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
