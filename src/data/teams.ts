/** Team setup limits and the palette the whole app identifies teams by. */

export const MIN_TEAMS = 2
export const MAX_TEAMS = 6

/** One colour per team slot, in order. Index past the end wraps. */
export const TEAM_COLORS = [
  '#e74c3c', // rød
  '#3b82f6', // blå
  '#22c55e', // grønn
  '#f97316', // oransje
  '#a855f7', // lilla
  '#06b6d4', // turkis
]

export const DEFAULT_TEAM_NAMES = Array.from(
  { length: MAX_TEAMS },
  (_, i) => `Lag ${i + 1}`
)

export function teamColor(index: number): string {
  return TEAM_COLORS[index % TEAM_COLORS.length]
}
