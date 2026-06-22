import type { YearCountryImageQuestion } from '../../types/game'
import styles from './YearCountryImageDisplay.module.css'

interface Props {
  content: YearCountryImageQuestion
  revealed: boolean
}

export default function YearCountryImageDisplay({ content, revealed }: Props) {
  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{content.prompt}</p>

      <img
        src={content.image}
        alt={content.imageAlt || 'Sporsmalsbilde'}
        className={styles.image}
        draggable={false}
      />

      {revealed && (
        <div className={styles.answerWrap}>
          <span className={styles.answerBadge}> {content.year}</span>
          <span className={styles.answerBadge}> {content.country}</span>
        </div>
      )}
    </div>
  )
}
