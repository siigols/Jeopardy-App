import type { MultipleChoiceQuestion } from '../../types/game'
import styles from './MultipleChoiceDisplay.module.css'

interface Props {
  content: MultipleChoiceQuestion
  revealed: boolean
}

export default function MultipleChoiceDisplay({ content, revealed }: Props) {
  return (
    <div className={styles.container}>
      <p className={styles.question}>{content.question}</p>
      <div className={styles.options}>
        {content.options.map((option, i) => (
          <div
            key={i}
            className={`${styles.option}${revealed ? (i === content.correctIndex ? ` ${styles.correct}` : ` ${styles.wrong}`) : ''}`}
          >
            <span className={styles.label}>{String.fromCharCode(65 + i)}</span>
            <span>{option}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
