import type { BoardBackgroundId } from '../../types/game'
import FootballDecorations from '../FootballDecorations'
import EmojiScene, { type SceneConfig } from './EmojiScene'
import styles from './EmojiScene.module.css'
import photoStyles from './BoardBackground.module.css'

/** Scene parameters per background id. 'football' and 'none' are handled separately. */
const SCENES: Record<'stjerner' | 'konfetti' | 'sno' | 'bobler', SceneConfig> = {
  stjerner: {
    symbols: ['✦', '✧', '⋆', '·', '✨'],
    count: 48,
    motion: 'twinkle',
    wash: styles.washStars,
    minSize: 0.5,
    maxSize: 1.6,
    duration: 4,
    opacity: 0.85,
  },
  konfetti: {
    symbols: ['🎉', '🎊', '▪', '●', '★'],
    count: 28,
    motion: 'fall',
    wash: styles.washConfetti,
    minSize: 0.7,
    maxSize: 1.8,
    duration: 9,
    opacity: 0.8,
  },
  sno: {
    symbols: ['❄', '❅', '❆', '•'],
    count: 44,
    motion: 'fall',
    wash: styles.washSnow,
    minSize: 0.6,
    maxSize: 1.7,
    duration: 14,
    opacity: 0.7,
  },
  bobler: {
    symbols: ['🫧', '○', '◦', '◌'],
    count: 30,
    motion: 'rise',
    wash: styles.washBubbles,
    minSize: 0.7,
    maxSize: 2.2,
    duration: 13,
    opacity: 0.6,
  },
}

interface Props {
  id?: BoardBackgroundId
  /** Optional uploaded photo, rendered underneath the scene. */
  image?: string
}

/**
 * Renders what a board author put behind the board: an optional photo, and on
 * top of it the decorative scene they picked.
 *
 * The two are independent — a board can have either, both, or neither — so the
 * photo is its own layer rather than another entry in the scene registry.
 */
export default function BoardBackground({ id, image }: Props) {
  const scene =
    id === 'football' ? <FootballDecorations />
    : id === undefined || id === 'none' ? null
    : <EmojiScene config={SCENES[id]} />

  if (!image) return scene

  return (
    <>
      <div className={photoStyles.photoLayer} aria-hidden="true">
        <img className={photoStyles.photo} src={image} alt="" />
        {/* The board's tiles and category headers sit on top of this, so the
            photo is dimmed to keep their text readable whatever was uploaded. */}
        <div className={photoStyles.scrim} />
      </div>
      {scene}
    </>
  )
}
