/**
 * The code that pairs players' phones to this game. Lives in App state (not in
 * GameScreen) because the tiebreaker needs it after GameScreen has unmounted
 * and its saved game state has been cleared.
 */
export function generateCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}
