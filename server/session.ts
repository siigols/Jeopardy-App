import type { TeamInfo } from '../src/types/socket-events.js'

interface Session {
  code: string
  teams: TeamInfo[]
  buzzer: TeamInfo | null
  questionOpen: boolean
  /** Indices of teams that have spent their buzz in the current round. */
  usedBuzzes: Set<number>
}

const sessions = new Map<string, Session>()

/**
 * Registers a session, or refreshes the team list of one that already exists.
 * The host re-emits create-session on every socket reconnect, and buzz tokens
 * now span questions, so an existing round must survive a host refresh rather
 * than handing every team a free buzz.
 */
export function createSession(code: string, teams: TeamInfo[]): Session {
  const existing = sessions.get(code)
  if (existing && existing.teams.length === teams.length) {
    existing.teams = teams
    return existing
  }
  const session: Session = { code, teams, buzzer: null, questionOpen: false, usedBuzzes: new Set() }
  sessions.set(code, session)
  return session
}

export function getSession(code: string): Session | undefined {
  return sessions.get(code)
}

export function openQuestion(code: string): boolean {
  const s = sessions.get(code)
  if (!s) return false
  s.questionOpen = true
  s.buzzer = null
  return true
}

export function closeQuestion(code: string): void {
  const s = sessions.get(code)
  if (!s) return
  s.questionOpen = false
  s.buzzer = null
}

/**
 * First buzz wins the question, and spends that team's one buzz. Spent buzzes
 * carry across questions; once every team has spent one, they all refresh.
 * Returns null when the buzz is rejected.
 */
export function recordBuzz(code: string, teamIndex: number): { winner: TeamInfo; used: number[] } | null {
  const s = sessions.get(code)
  if (!s || !s.questionOpen || s.buzzer !== null) return null
  const team = s.teams[teamIndex]
  if (!team) return null
  if (s.usedBuzzes.has(teamIndex)) return null

  s.buzzer = team
  s.usedBuzzes.add(teamIndex)
  // Refreshing right away is safe: the current question is already locked by
  // `buzzer`, so the team that just buzzed can't buzz again on it.
  if (s.usedBuzzes.size >= s.teams.length) s.usedBuzzes.clear()

  return { winner: team, used: [...s.usedBuzzes] }
}

/**
 * Host escape hatch: gives everyone their buzz back. Needed because a team that
 * never buzzes would otherwise keep the round from ever refreshing.
 */
export function resetBuzzes(code: string): number[] {
  const s = sessions.get(code)
  if (!s) return []
  s.usedBuzzes.clear()
  return []
}
