import type { BoardBackgroundId } from '../types/game'

/** A selectable decorative scene in the board editor. */
export interface BoardBackgroundPreset {
  id: BoardBackgroundId
  name: string
  /** Single emoji shown on the editor card. */
  preview: string
}

/**
 * Scenes offered by the board editor, rendered behind the board by
 * <BoardBackground>. Shared by client and server so the id list can't drift.
 */
export const BOARD_BACKGROUNDS: BoardBackgroundPreset[] = [
  { id: 'none', name: 'Ingen', preview: '⬛' },
  { id: 'football', name: 'Fotball', preview: '⚽' },
  { id: 'stjerner', name: 'Stjerner', preview: '✨' },
  { id: 'konfetti', name: 'Konfetti', preview: '🎉' },
  { id: 'sno', name: 'Snø', preview: '❄️' },
  { id: 'bobler', name: 'Bobler', preview: '🫧' },
]

export const DEFAULT_BOARD_BACKGROUND_ID: BoardBackgroundId = 'none'

/** Narrows unknown input to a known background id. */
export function isBoardBackgroundId(id: unknown): id is BoardBackgroundId {
  return typeof id === 'string' && BOARD_BACKGROUNDS.some(b => b.id === id)
}
