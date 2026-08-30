import type { BoardBackgroundId } from '../../types/game'
import FootballDecorations from '../FootballDecorations'
import EmojiScene, { type SceneConfig } from './EmojiScene'
import styles from './EmojiScene.module.css'

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

/**
 * Renders the decorative scene a board author picked. Returns null for 'none'
 * and for boards with no background at all.
 */
export default function BoardBackground({ id }: { id?: BoardBackgroundId }) {
  if (id === 'football') return <FootballDecorations />
  if (id === undefined || id === 'none') return null
  return <EmojiScene config={SCENES[id]} />
}
