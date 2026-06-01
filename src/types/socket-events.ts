export interface TeamInfo {
  index: number
  name: string
  color: string
}

export interface ServerToClientEvents {
  'question-opened': () => void
  'question-closed': () => void
  'buzzed': (winner: TeamInfo) => void
}

export interface ClientToServerEvents {
  'create-session': (
    data: { code: string; teams: TeamInfo[] },
    ack: (res: { ok: boolean }) => void
  ) => void
  'join-buzzer': (
    data: { code: string; teamIndex: number },
    ack: (state: { teamName: string; teamColor: string; questionOpen: boolean; buzzer: TeamInfo | null }) => void
  ) => void
  'question-open': (data: { code: string }) => void
  'question-close': (data: { code: string }) => void
  'buzz': (data: { code: string; teamIndex: number }) => void
}
