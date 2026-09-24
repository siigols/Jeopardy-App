import { useId } from 'react'
import { BFB_LABEL_MAX, TEXT_MAX, type StepByStepEditorTile } from './types'
import styles from './TileEditorModal.module.css'
import { Input } from '../ui'

interface Props {
  tile: StepByStepEditorTile
  onChange: (tile: StepByStepEditorTile) => void
}

/** Steg for steg: four question/answer pairs the host reveals one at a time. */
export default function StepByStepForm({ tile, onChange }: Props) {
  const titleId = useId()

  function setStep(index: number, field: 'question' | 'answer', value: string) {
    onChange({ ...tile, steps: tile.steps.map((s, i) => (i === index ? { ...s, [field]: value } : s)) })
  }

  return (
    <div className={styles.body}>
      <p className={styles.note}>
        Verten viser ett spørsmål og ett svar av gangen. Laget velger selv hvor mange de vil svare på –
        vises et spørsmål, må de svare. Poengene settes manuelt av verten.
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
          placeholder="F.eks. «Hovedsteder»"
          onChange={e => onChange({ ...tile, title: e.target.value })}
        />
      </div>
      <div className={styles.rows}>
        {tile.steps.map((step, i) => (
          <div className={styles.row} key={i}>
            <span className={styles.rowLabel}>{`${i + 1}.`}</span>
            <Input
              className={styles.input}
              value={step.question}
              maxLength={TEXT_MAX}
              placeholder={`Spørsmål ${i + 1}`}
              aria-label={`Spørsmål ${i + 1}`}
              onChange={e => setStep(i, 'question', e.target.value)}
            />
            <Input
              className={styles.input}
              value={step.answer}
              maxLength={TEXT_MAX}
              placeholder={`Svar ${i + 1}`}
              aria-label={`Svar ${i + 1}`}
              onChange={e => setStep(i, 'answer', e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
