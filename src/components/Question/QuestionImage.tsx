import styles from './QuestionImage.module.css'

interface Props {
  src: string
  /** Marks the picture that appears with the answer, so it can animate in. */
  reveal?: boolean
}

/**
 * An optional picture attached to a question or its answer.
 *
 * Sized with `contain` rather than `cover`: unlike the Høyere/Lavere panels these
 * images are the content itself (a painting, a map, a face), so cropping them to
 * fill a box would hide the very thing being asked about.
 */
export default function QuestionImage({ src, reveal = false }: Props) {
  return <img className={`${styles.image} ${reveal ? styles.reveal : ''}`} src={src} alt="" />
}
