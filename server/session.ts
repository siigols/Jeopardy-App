import type { TeamInfo } from '../src/types/socket-events.js'

interface Session {
  code: string
  teams: TeamInfo[]
  buzzer: TeamInfo | null
  questionOpen: boolean
}

const sessions = new Map<string, Session>()

export function createSession(code: string, teams: TeamInfo[]): Session {
  const session: Session = { code, teams, buzzer: null, questionOpen: false }
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

export function recordBuzz(code: string, teamIndex: number): TeamInfo | null {
  const s = sessions.get(code)
  if (!s || !s.questionOpen || s.buzzer !== null) return null
  const team = s.teams[teamIndex]
  if (!team) return null
  s.buzzer = team
  return team
}
