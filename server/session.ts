import type {
  TeamInfo,
  TiebreakAnswer,
  TiebreakHostState,
  TiebreakPhase,
  TiebreakPhoneState,
} from '../src/types/socket-events.js'

/**
 * One tiebreak round. `correct` is parked here only so it can be echoed back in
 * the reveal broadcast; nothing reads it before then.
 */
interface TiebreakRound {
  round: number
  question: string
  correct: number
  /** Team indices allowed to answer. */
  participants: Set<number>
  answers: Map<number, number>
  phase: TiebreakPhase
}

interface Session {
  code: string
  teams: TeamInfo[]
  buzzer: TeamInfo | null
  questionOpen: boolean
  /** Indices of teams that have spent their buzz in the current round. */
  usedBuzzes: Set<number>
  /** The live tiebreak round, or null when the game isn't in one. */
  tiebreak: TiebreakRound | null
}

const sessions = new Map<string, Session>()

/**
 * Registers a session, or refreshes the team list of one that already exists.
 * The host re-emits create-session on every socket reconnect, and buzz tokens
 * now span questions, so an existing round must survive a host refresh rather
 * than handing every team a free buzz.
 *
 * Refreshing rather than replacing is also what carries a live tiebreak round
 * through a host reload — and through the GameScreen -> TiebreakerScreen
 * handover, which disconnects one socket and connects another.
 */
export function createSession(code: string, teams: TeamInfo[]): Session {
  const existing = sessions.get(code)
  if (existing && existing.teams.length === teams.length) {
    existing.teams = teams
    return existing
  }
  const session: Session = {
    code,
    teams,
    buzzer: null,
    questionOpen: false,
    usedBuzzes: new Set(),
    tiebreak: null,
  }
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

// ── Tiebreak ────────────────────────────────────────────────

/**
 * Opens a tiebreak round, replacing any previous one. Round numbers only ever
 * count up: a phone still sitting on the previous round's result screen tells
 * "the host started another round" from "I received that broadcast twice" by
 * the number alone, and a late submit from a laggy phone can be rejected
 * instead of silently landing in the new round.
 *
 * Returns null for an unknown code — which is what a `tiebreak-start` racing
 * ahead of its `create-session` would hit.
 */
export function startTiebreak(
  code: string,
  data: { participants: number[]; question: string; correct: number },
): number | null {
  const s = sessions.get(code)
  if (!s) return null
  const round = (s.tiebreak?.round ?? 0) + 1
  s.tiebreak = {
    round,
    question: data.question,
    correct: data.correct,
    participants: new Set(data.participants),
    answers: new Map(),
    phase: 'collecting',
  }
  // A tiebreak round has no buzzing in it, and leaving the buzzer armed would
  // let a stray tap burn a team's buzz on a question that doesn't take any.
  s.questionOpen = false
  s.buzzer = null
  return round
}

export type TiebreakSubmitError =
  | 'no-session'
  | 'no-round'
  | 'stale-round'
  | 'not-participant'
  | 'closed'
  | 'duplicate'

/**
 * Records one team's estimate.
 *
 * Duplicates are rejected rather than overwritten: the phone locks itself after
 * submitting, and letting a second value through would mean a team could watch
 * the "2 av 3 har svart" counter and revise afterwards.
 */
export function submitTiebreak(
  code: string,
  round: number,
  teamIndex: number,
  value: number,
): { submitted: number[] } | { error: TiebreakSubmitError } {
  const s = sessions.get(code)
  if (!s) return { error: 'no-session' }
  const tb = s.tiebreak
  if (!tb) return { error: 'no-round' }
  if (tb.round !== round) return { error: 'stale-round' }
  if (tb.phase !== 'collecting') return { error: 'closed' }
  if (!tb.participants.has(teamIndex)) return { error: 'not-participant' }
  if (tb.answers.has(teamIndex)) return { error: 'duplicate' }

  tb.answers.set(teamIndex, value)
  return { submitted: [...tb.answers.keys()] }
}

/** Closes the round for answers and hands back everything to broadcast. */
export function revealTiebreak(
  code: string,
): { round: number; correct: number; answers: TiebreakAnswer[] } | null {
  const s = sessions.get(code)
  if (!s?.tiebreak) return null
  const tb = s.tiebreak
  tb.phase = 'revealed'
  return { round: tb.round, correct: tb.correct, answers: toAnswers(tb) }
}

/** Drops the round entirely, releasing phones back to the buzzer. */
export function endTiebreak(code: string): void {
  const s = sessions.get(code)
  if (!s) return
  s.tiebreak = null
}

function toAnswers(tb: TiebreakRound): TiebreakAnswer[] {
  return [...tb.answers].map(([index, value]) => ({ index, value }))
}

/**
 * The host's view of the live round, for the create-session ack.
 *
 * This and `tiebreakPhoneState` are the only two places that decide what leaves
 * the server, so the "no values before the reveal" rule lives here and cannot
 * be forgotten at a call site.
 */
export function tiebreakHostState(s: Session): TiebreakHostState | null {
  const tb = s.tiebreak
  if (!tb) return null
  const revealed = tb.phase === 'revealed'
  return {
    round: tb.round,
    question: tb.question,
    participants: [...tb.participants],
    submitted: [...tb.answers.keys()],
    phase: tb.phase,
    correct: revealed ? tb.correct : null,
    answers: revealed ? toAnswers(tb) : null,
  }
}

/** One phone's view: its own value and a count of the others, never their values. */
export function tiebreakPhoneState(s: Session, teamIndex: number): TiebreakPhoneState | null {
  const tb = s.tiebreak
  if (!tb) return null
  const revealed = tb.phase === 'revealed'
  return {
    round: tb.round,
    question: tb.question,
    isParticipant: tb.participants.has(teamIndex),
    hasSubmitted: tb.answers.has(teamIndex),
    ownValue: tb.answers.get(teamIndex) ?? null,
    submittedCount: tb.answers.size,
    participantCount: tb.participants.size,
    phase: tb.phase,
    correct: revealed ? tb.correct : null,
    answers: revealed ? toAnswers(tb) : null,
  }
}
