import { useId } from 'react'
import type { MultipleChoiceTileDraft } from '../../types/game'
import { MC_OPTION_MAX, TEXT_MAX } from './types'
import styles from './TileEditorModal.module.css'

interface Props {
  tile: MultipleChoiceTileDraft
  onChange: (tile: MultipleChoiceTileDraft) => void
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

/** Flervalg: one question, four fixed options and exactly one correct answer. */
export default function MultipleChoiceForm({ tile, onChange }: Props) {
  const questionId = useId()
  const radioName = useId()

  function setOption(index: number, value: string) {
    const options = tile.options.map((o, i) => (i === index ? value : o)) as [string, string, string, string]
    onChange({ ...tile, options })
  }

  return (
    <div className={styles.body}>
      <p className={styles.note}>
        Fire alternativer (A–D). Marker hvilket som er riktig – rekkefølgen vises som den står her.
      </p>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={questionId}>
          Spørsmål
        </label>
        <textarea
          id={questionId}
          className={styles.textarea}
          value={tile.question}
          maxLength={TEXT_MAX}
          onChange={e => onChange({ ...tile, question: e.target.value })}
        />
      </div>
      <fieldset className={styles.bareFieldset}>
        <legend className={styles.visuallyHidden}>Riktig alternativ</legend>
        <div className={styles.rows}>
          {tile.options.map((option, i) => (
            <div className={styles.row} key={i}>
              <span className={`${styles.rowLabel} ${styles.rowLabelNarrow}`}>{OPTION_LETTERS[i]}</span>
              <input
                className={styles.input}
                value={option}
                maxLength={MC_OPTION_MAX}
                placeholder={`Alternativ ${OPTION_LETTERS[i]}`}
                aria-label={`Alternativ ${OPTION_LETTERS[i]}`}
                onChange={e => setOption(i, e.target.value)}
              />
              <label className={styles.radioRow}>
                <input
                  type="radio"
                  name={radioName}
                  checked={tile.correctIndex === i}
                  aria-label={`Alternativ ${OPTION_LETTERS[i]} er riktig`}
                  onChange={() => onChange({ ...tile, correctIndex: i })}
                />
                Riktig
              </label>
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
