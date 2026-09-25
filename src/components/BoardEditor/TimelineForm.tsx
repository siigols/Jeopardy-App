import { useId } from 'react'
import { TIMELINE_EVENT_COUNT } from '../../types/game'
import { BFB_LABEL_MAX, TEXT_MAX, type TimelineEditorEvent, type TimelineEditorTile } from './types'
import styles from './TileEditorModal.module.css'
import { Input } from '../ui'

interface Props {
  tile: TimelineEditorTile
  onChange: (tile: TimelineEditorTile) => void
}

/** Plasser hendelsen: one anchor event with its year, and events to place around it. */
export default function TimelineForm({ tile, onChange }: Props) {
  const titleId = useId()

  function setEvent(index: number, patch: Partial<TimelineEditorEvent>) {
    onChange({ ...tile, events: tile.events.map((e, i) => (i === index ? { ...e, ...patch } : e)) })
  }

  return (
    <div className={styles.body}>
      <p className={styles.note}>
        Tidslinja viser én hendelse med årstall. Spillerne plasserer de {TIMELINE_EVENT_COUNT} andre
        hendelsene før eller etter den, og verten viser riktig rekkefølge. Årstall skrives som hele tall
        (negative for f.Kr.) og kan ikke være likt årstallet til hovedhendelsen.
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
        <div className={styles.row}>
          <span className={styles.rowLabel}>Kjent</span>
          <Input
            className={styles.input}
            value={tile.anchor.label}
            maxLength={TEXT_MAX}
            placeholder="Hovedhendelse, f.eks. «Månelandingen»"
            aria-label="Hovedhendelse"
            onChange={e => onChange({ ...tile, anchor: { ...tile.anchor, label: e.target.value } })}
          />
          <Input
            className={`${styles.input} ${styles.hlValue}`}
            value={tile.anchor.year}
            inputMode="numeric"
            placeholder="År"
            aria-label="Hovedhendelse årstall"
            onChange={e => onChange({ ...tile, anchor: { ...tile.anchor, year: e.target.value } })}
          />
        </div>
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
