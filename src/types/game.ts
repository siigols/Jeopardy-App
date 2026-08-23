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

export interface Team {
  id: string
  name: string
  score: number
}
