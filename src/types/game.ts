export type QuestionType = 'simple' | 'overUnder' | 'yearCountryImage' | 'tenable' | 'multipleChoice' | 'higherLower'

export interface SimpleQuestion {
  type: 'simple'
  question: string
  answer: string
}

export interface OverUnderItem {
  image: string
  label?: string
  answer: 'over' | 'under'
  value: string
}

export interface OverUnderQuestion {
  type: 'overUnder'
  statement: string
  items: OverUnderItem[]
}

export interface YearCountryImageQuestion {
  type: 'yearCountryImage'
  prompt: string
  image: string
  imageAlt?: string
  year: string
  country: string
}

export interface TenableQuestion {
  type: 'tenable'
  prompt: string
  items: string[]
}

export interface MultipleChoiceQuestion {
  type: 'multipleChoice'
  question: string
  options: [string, string, string, string]
  correctIndex: number
}

export interface HigherLowerItem {
  /** Optional: imageless boards (e.g. those built in the editor) render text-only. */
  image?: string
  label: string
  value: string
  numericValue: number
}

export interface HigherLowerQuestion {
  type: 'higherLower'
  metric: string
  items: HigherLowerItem[]
}

export type QuestionContent = SimpleQuestion | OverUnderQuestion | YearCountryImageQuestion | TenableQuestion | MultipleChoiceQuestion | HigherLowerQuestion

export interface Tile {
  points: number
  content: QuestionContent
  answered: boolean
}

export interface Category {
  name: string
  tiles: Tile[]
}

export interface CategoryColor {
  tile: string
  hover: string
  header: string
}

export interface GameTheme {
  /** Id of the preset this theme came from, so the editor can re-select it. */
  id?: string
  categoryColors: CategoryColor[]
  accent?: string
  bg?: string
  decorations?: 'football'
}

export interface Game {
  title: string
  description?: string
  categories: Category[]
  theme?: GameTheme
  tiebreaker?: SimpleQuestion
}

/** User-created boards are a fixed 5x5 grid. Shared by client + server so they can't drift. */
export const BOARD_CATEGORY_COUNT = 5
export const BOARD_TILE_POINTS = [200, 400, 600, 800, 1000] as const
export const BOARD_TILE_COUNT = BOARD_TILE_POINTS.length

/** Question types the board editor can create and round-trip. */
export const EDITABLE_QUESTION_TYPES = [
  'simple',
  'tenable',
  'multipleChoice',
  'higherLower',
] as const satisfies readonly BoardTileDraft['type'][]
export type EditableQuestionType = BoardTileDraft['type']

/** Fixed shape constraints for the rich editable question types. */
export const TENABLE_ITEM_COUNT = 10
export const MC_OPTION_COUNT = 4
export const HL_MIN_ITEMS = 4
export const HL_MAX_ITEMS = 6

/** Field length caps for editable board text. Shared by client + server so they can't drift. */
export const MAX_TILE_TEXT = 500
export const MAX_OPTION_TEXT = 200
export const MAX_LABEL_TEXT = 120

export interface SimpleTileDraft {
  type: 'simple'
  question: string
  answer: string
}

export interface TenableTileDraft {
  type: 'tenable'
  prompt: string
  items: string[]
}

export interface MultipleChoiceTileDraft {
  type: 'multipleChoice'
  question: string
  options: [string, string, string, string]
  correctIndex: number
}

export interface HigherLowerTileDraftItem {
  label: string
  numericValue: number
}

export interface HigherLowerTileDraft {
  type: 'higherLower'
  metric: string
  items: HigherLowerTileDraftItem[]
}

/** A single editor tile on the wire. Tagged union, chosen per tile. */
export type BoardTileDraft = SimpleTileDraft | TenableTileDraft | MultipleChoiceTileDraft | HigherLowerTileDraft

/** The minimal wire shape the board editor POSTs to /api/boards. */
export interface BoardDraft {
  title: string
  description?: string
  themeId?: string
  tiebreaker?: SimpleQuestion
  categories: {
    name: string
    tiles: BoardTileDraft[]
  }[]
}

/** Lightweight board listing returned by GET /api/boards (no tiles). */
export interface BoardSummary {
  id: number
  title: string
  description?: string
  categories: { name: string }[]
  theme?: GameTheme
  /** False for boards using rich question types, which the editor can't round-trip. */
  editable: boolean
}

/** A full board as returned by GET /api/boards/:id. */
export type LoadedGame = Game & { id: number; editable: boolean }

/** Points awarded per correct comparison in a higher/lower question. */
export const HL_POINTS_PER_COMPARISON = 100

/**
 * Number of scoreable comparisons in a higher/lower question (N items -> N-1).
 *
 * Returns 0 for every other question type, and for malformed higherLower
 * content (missing or too-short `items`). Single source of truth for both the
 * board label and the host's "hvor mange riktige?" picker, so a missing `items`
 * can't make one survive while the other throws.
 */
export function higherLowerComparisons(content: QuestionContent): number {
  if (content.type !== 'higherLower') return 0
  return Math.max(0, (content.items?.length ?? 0) - 1)
}

/**
 * The points a tile actually awards, as shown on the board.
 *
 * Most types award `tile.points` flat, but two ignore it:
 * - `tenable` awards rank × 100, so the range is `0-{TENABLE_ITEM_COUNT * 100}`.
 * - `higherLower` awards {HL_POINTS_PER_COMPARISON} per correct comparison, and
 *   N items give N-1 comparisons.
 *
 * Malformed higherLower content (fewer than 2 items has no comparison at all)
 * falls back to `tile.points`, so the label can never be `0--100` or `NaN`.
 *
 * `isRange` is returned rather than inferred from a hyphen in `label`, so
 * callers styling ranges never have to sniff the string.
 *
 * Lives here rather than in QuestionTile so the board can stay a pure component
 * file; this module has no imports, so it can't create a cycle.
 */
export function tilePointsLabel(tile: Tile): { label: string; isRange: boolean } {
  if (tile.content.type === 'tenable') {
    return { label: `0-${TENABLE_ITEM_COUNT * 100}`, isRange: true }
  }

  if (tile.content.type === 'higherLower') {
    const comparisons = higherLowerComparisons(tile.content)
    if (comparisons > 0) {
      return { label: `0-${comparisons * HL_POINTS_PER_COMPARISON}`, isRange: true }
    }
  }

  return { label: String(tile.points), isRange: false }
}

export interface Team {
  id: string
  name: string
  score: number
}
