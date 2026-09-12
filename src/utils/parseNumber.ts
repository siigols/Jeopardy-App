/**
 * Accepts Norwegian comma decimals; returns null when not a finite number.
 *
 * Spaces are stripped — plain, non-breaking (U+00A0) and narrow no-break
 * (U+202F) — so a value copied straight out of the `nb-NO` grouped preview
 * ("1 234") round-trips. Anything containing a character outside the numeric
 * alphabet is rejected up front, because `Number()` happily parses forms we
 * don't want here (e.g. '0x10' -> 16, 'Infinity' -> Infinity).
 *
 * Lives in utils rather than in the board editor because the phone bundle
 * (buzz.html is its own Rollup entry) parses the player's typed estimate with
 * it, and pulling an editor module in there would drag the editor along.
 */
export function parseNumericInput(raw: string): number | null {
  const stripped = raw.replace(/[\s\u00a0\u202f]/g, '')
  if (!stripped) return null
  if (!/^[0-9.,+\-eE]+$/.test(stripped)) return null
  const n = Number(stripped.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Whether a board's tiebreaker answer should be played as a numeric estimate.
 *
 * Stricter than `parseNumericInput` on purpose: exponent notation is rejected
 * because '1e5' is far more likely to be prose than a quizmaster's intended
 * 100000, and guessing wrong here silently swaps the whole game mode. A
 * rejected answer isn't an error — it just keeps the host-judged flow.
 */
export function parseTiebreakerAnswer(raw: string): number | null {
  if (/[eE]/.test(raw)) return null
  return parseNumericInput(raw)
}

/** Grouped Norwegian formatting, shared by the phone echo and the host counter. */
export const nbNumber = new Intl.NumberFormat('nb-NO')
