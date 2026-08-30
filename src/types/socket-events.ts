export interface TeamInfo {
  index: number
  name: string
  color: string
}

export interface ServerToClientEvents {
  'question-opened': () => void
  'question-closed': () => void
  'buzzed': (winner: TeamInfo) => void
  /** Indices of teams that have spent their one buzz in the current round. */
  'buzz-state': (data: { used: number[] }) => void
}

export interface ClientToServerEvents {
  'create-session': (
    data: { code: string; teams: TeamInfo[] },
    ack: (res: { ok: boolean; used: number[] }) => void
  ) => void
  'join-buzzer': (
    data: { code: string; teamIndex: number },
    ack: (state: {
      teamName: string
      teamColor: string
      questionOpen: boolean
      buzzer: TeamInfo | null
      used: number[]
    }) => void
  ) => void
  'question-open': (data: { code: string }) => void
  'question-close': (data: { code: string }) => void
  'buzz': (data: { code: string; teamIndex: number }) => void
  /** Host-only: gives every team its buzz back. */
  'buzz-reset': (data: { code: string }) => void
}
