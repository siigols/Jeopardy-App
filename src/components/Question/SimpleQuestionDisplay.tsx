import type { SimpleQuestion } from '../../types/game'
import styles from './SimpleQuestionDisplay.module.css'

interface Props {
  content: SimpleQuestion
  revealed: boolean
}

export default function SimpleQuestionDisplay({ content, revealed }: Props) {
  return (
    <div className={styles.container}>
      <p className={styles.question}>{content.question}</p>
      {revealed && (
        <p className={styles.answer}>{content.answer}</p>
      )}
    </div>
  )
}
