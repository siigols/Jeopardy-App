export type QuestionType = 'simple' | 'overUnder' | 'yearCountryImage' | 'tenable'

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

export type QuestionContent = SimpleQuestion | OverUnderQuestion | YearCountryImageQuestion | TenableQuestion

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

export interface Team {
  id: string
  name: string
  score: number
}
