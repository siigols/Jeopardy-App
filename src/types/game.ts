export type QuestionType = 'simple'

export interface SimpleQuestion {
  type: 'simple'
  question: string
  answer: string
}

export type QuestionContent = SimpleQuestion

export interface Tile {
  points: number
  content: QuestionContent
  answered: boolean
}

export interface Category {
  name: string
  tiles: Tile[]
}

export interface Game {
  title: string
  categories: Category[]
}

export interface Team {
  id: string
  name: string
  score: number
}
