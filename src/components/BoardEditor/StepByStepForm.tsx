import { useId } from 'react'
import { BFB_LABEL_MAX, TEXT_MAX, youTubeUrlOk, type StepByStepEditorStep, type StepByStepEditorTile } from './types'
import styles from './TileEditorModal.module.css'
import chipStyles from './BeatForBeatForm.module.css'
import { Input } from '../ui'

interface Props {
  tile: StepByStepEditorTile
  onChange: (tile: StepByStepEditorTile) => void
}

/** Steg for steg: four question/answer pairs the host reveals one at a time. */
export default function StepByStepForm({ tile, onChange }: Props) {
  const titleId = useId()

  function setStep(index: number, field: keyof StepByStepEditorStep, value: string) {
    onChange({ ...tile, steps: tile.steps.map((s, i) => (i === index ? { ...s, [field]: value } : s)) })
  }

  return (
    <div className={styles.body}>
      <p className={styles.note}>
        Verten viser ett spørsmål og ett svar av gangen. Laget velger selv hvor mange de vil svare på –
        vises et spørsmål, må de svare. Poengene settes manuelt av verten. YouTube-lenkene er valgfrie:
        spørsmålsklippet styres med en spill/pause-knapp, svarsangen starter når svaret vises.
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
          <div className={styles.rows} key={i}>
            <div className={styles.row}>
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
            <div className={styles.row}>
              <span className={styles.rowLabel} />
              <Input
                className={styles.input}
                value={step.questionUrl}
                placeholder="YouTube-lenke til spørsmål (valgfritt)"
                aria-label={`YouTube-lenke til spørsmål ${i + 1}`}
                onChange={e => setStep(i, 'questionUrl', e.target.value)}
              />
              <Input
                className={styles.input}
                value={step.answerUrl}
                placeholder="YouTube-lenke til svar (valgfritt)"
                aria-label={`YouTube-lenke til svar ${i + 1}`}
                onChange={e => setStep(i, 'answerUrl', e.target.value)}
              />
            </div>
            {(!youTubeUrlOk(step.questionUrl) || !youTubeUrlOk(step.answerUrl)) && (
              <p className={chipStyles.linkBad}>Ugyldig YouTube-lenke i steg {i + 1}.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
