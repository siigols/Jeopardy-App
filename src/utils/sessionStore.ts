import type { Category, Team } from '../types/game'

const APP_KEY = 'jeopardy:app'
const GAME_KEY = 'jeopardy:game'

export interface AppSavedState {
  appState: string
  selectedGameTitle: string | null
  teams: Team[]
  finalTeams: Team[]
  tiedTeams: Team[]
  theme: 'dark' | 'light'
  gameKey: number
}

export interface GameSavedState {
  categories: Category[]
  teams: Team[]
  sessionCode: string
}

export function loadAppState(): AppSavedState | null {
  try {
    const raw = sessionStorage.getItem(APP_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveAppState(state: AppSavedState): void {
  try {
    sessionStorage.setItem(APP_KEY, JSON.stringify(state))
  } catch {
    // Storage full or unavailable
  }
}

export function loadGameState(): GameSavedState | null {
  try {
    const raw = sessionStorage.getItem(GAME_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveGameState(state: GameSavedState): void {
  try {
    sessionStorage.setItem(GAME_KEY, JSON.stringify(state))
  } catch {
    // Storage full or unavailable
  }
}

export function clearGameState(): void {
  sessionStorage.removeItem(GAME_KEY)
}
