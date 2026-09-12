export interface TeamInfo {
  index: number
  name: string
  color: string
}

/**
 * A tiebreak round is either taking answers or has been revealed. There is no
 * separate 'finished' phase: resolving the tiebreaker ends the round outright
 * (`tiebreak-end`), which drops it from the session.
 */
export type TiebreakPhase = 'collecting' | 'revealed'

/** One team's submitted estimate. Only ever sent after the reveal. */
export interface TiebreakAnswer {
  index: number
  value: number
}

/** Everything the host needs to resume a round it started before reloading. */
export interface TiebreakHostState {
  round: number
  question: string
  /** Team indices allowed to answer — the teams tied for first. */
  participants: number[]
  /** Indices that have answered. Never the values, while collecting. */
  submitted: number[]
  phase: TiebreakPhase
  /** Null until the round is revealed. */
  correct: number | null
  /** Null until the round is revealed. */
  answers: TiebreakAnswer[] | null
}

/**
 * Everything one phone needs. Deliberately narrower than the host's view: it
 * carries that phone's own value and a count of the others, never another
 * team's number. Everyone is in the same room, and one player holding two
 * phones would otherwise see what the opposition guessed.
 */
export interface TiebreakPhoneState {
  round: number
  question: string
  isParticipant: boolean
  hasSubmitted: boolean
  ownValue: number | null
  submittedCount: number
  participantCount: number
  phase: TiebreakPhase
  correct: number | null
  answers: TiebreakAnswer[] | null
}

export interface ServerToClientEvents {
  'question-opened': () => void
  'question-closed': () => void
  'buzzed': (winner: TeamInfo) => void
  /** Indices of teams that have spent their one buzz in the current round. */
  'buzz-state': (data: { used: number[] }) => void
  'tiebreak-started': (data: { round: number; participants: number[]; question: string }) => void
  /** Who has answered — indices only. See TiebreakPhoneState on why not values. */
  'tiebreak-progress': (data: { round: number; submitted: number[] }) => void
  'tiebreak-revealed': (data: { round: number; correct: number; answers: TiebreakAnswer[] }) => void
  'tiebreak-ended': () => void
}

export interface ClientToServerEvents {
  'create-session': (
    data: { code: string; teams: TeamInfo[] },
    ack: (res: { ok: boolean; used: number[]; tiebreak: TiebreakHostState | null }) => void
  ) => void
  'join-buzzer': (
    data: { code: string; teamIndex: number },
    ack: (state: {
      teamName: string
      teamColor: string
      questionOpen: boolean
      buzzer: TeamInfo | null
      used: number[]
      tiebreak: TiebreakPhoneState | null
    }) => void
  ) => void
  'question-open': (data: { code: string }) => void
  'question-close': (data: { code: string }) => void
  'buzz': (data: { code: string; teamIndex: number }) => void
  /** Host-only: gives every team its buzz back. */
  'buzz-reset': (data: { code: string }) => void
  /**
   * Host-only: opens a tiebreak round. `correct` is parked on the server so it
   * can be echoed in 'tiebreak-revealed' — a phone that reloads after the
   * reveal has no other way to learn the answer. It is never sent out before.
   */
  'tiebreak-start': (
    data: { code: string; participants: number[]; question: string; correct: number },
    ack: (res: { ok: boolean; round: number }) => void
  ) => void
  'tiebreak-submit': (
    data: { code: string; round: number; teamIndex: number; value: number },
    ack: (res: {
      ok: boolean
      reason?: 'no-session' | 'no-round' | 'stale-round' | 'not-participant' | 'closed' | 'duplicate'
    }) => void
  ) => void
  /** Host-only: closes the round and broadcasts every answer. */
  'tiebreak-reveal': (data: { code: string }) => void
  /** Host-only: drops the round, releasing phones back to the buzzer. */
  'tiebreak-end': (data: { code: string }) => void
}
