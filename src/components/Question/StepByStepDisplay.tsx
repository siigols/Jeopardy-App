import type { StepByStepQuestion } from '../../types/game'
import styles from './StepByStepDisplay.module.css'

interface Props {
  content: StepByStepQuestion
  /**
   * How many parts are shown, counting question and answer separately:
   * 1 = question 1, 2 = answer 1, 3 = question 2, ...
   */
  shownCount: number
}

export default function StepByStepDisplay({ content, shownCount }: Props) {
  return (
    <div className={styles.container}>
      {content.title && <p className={styles.title}>{content.title}</p>}
      <ol className={styles.steps}>
        {content.steps.map((step, i) => {
          const questionShown = shownCount > i * 2
          const answerShown = shownCount > i * 2 + 1
          return (
            <li key={i} className={`${styles.step} ${questionShown ? '' : styles.hidden}`}>
              <span className={styles.number}>{i + 1}</span>
              <span className={styles.question}>{questionShown ? step.question : '?'}</span>
              {answerShown && <span className={styles.answer}>{step.answer}</span>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
