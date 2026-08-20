import type { Category, Team } from '../types/game'

const APP_KEY = 'jeopardy:app'
const GAME_KEY = 'jeopardy:game'

export interface AppSavedState {
  appState: string
  selectedGameId: number | null
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
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AppSavedState>
    // Older versions persisted `selectedGameTitle` instead of an id — those
    // entries are unrestorable, so normalise the id away and let the caller
    // fall back to the board-select screen.
    return {
      ...parsed,
      selectedGameId: typeof parsed.selectedGameId === 'number' ? parsed.selectedGameId : null,
    } as AppSavedState
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

export function clearAppState(): void {
  sessionStorage.removeItem(APP_KEY)
}
