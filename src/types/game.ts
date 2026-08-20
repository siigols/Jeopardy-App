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
  image: string
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

/** Lightweight board listing returned by GET /api/boards (no tiles). */
export interface BoardSummary {
  id: number
  title: string
  description?: string
  categories: { name: string }[]
  theme?: GameTheme
}

/** A full board as returned by GET /api/boards/:id. */
export type LoadedGame = Game & { id: number }

export interface Team {
  id: string
  name: string
  score: number
}
