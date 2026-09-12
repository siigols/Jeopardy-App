import React, { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import type { Team, SimpleQuestion } from '../types/game'
import type { TeamInfo, TiebreakAnswer } from '../types/socket-events'
import { useSocket } from '../hooks/useSocket'
import { useSounds } from '../hooks/useSounds'
import { nbNumber, parseNumericInput, parseTiebreakerAnswer } from '../utils/parseNumber'
import TiebreakReveal, { type RevealTeam } from '../components/TiebreakReveal/TiebreakReveal'
import type { RevealOutcome } from '../components/TiebreakReveal/revealMath'
import TiebreakerClassic from './TiebreakerClassic'
import styles from './TiebreakerScreen.module.css'

const TEAM_COLORS = ['#e74c3c', '#3b82f6', '#22c55e', '#f97316']

const DEFAULT_TIEBREAKER: SimpleQuestion = {
  type: 'simple',
  question: 'Hvilket år ble FN grunnlagt?',
  answer: '1945',
}

/** collecting -> revealing -> resolved, or off to deadlock when nobody wins. */
type Mode = 'collecting' | 'revealing' | 'resolved' | 'deadlock'

interface Props {
  tiedTeams: Team[]
  allTeams: Team[]
  sessionCode: string
  question?: SimpleQuestion
  onResolved: (updatedTeams: Team[]) => void
}

export default function TiebreakerScreen({ tiedTeams, allTeams, sessionCode, question, onResolved }: Props) {
  const q = question ?? DEFAULT_TIEBREAKER
  const numericAnswer = parseTiebreakerAnswer(q.answer)

  const teamColorMap = Object.fromEntries(
    allTeams.map((t, i) => [t.id, TEAM_COLORS[i % TEAM_COLORS.length]])
  )

  function handleAward(teamId: string) {
    const updatedTeams = allTeams.map(t =>
      t.id === teamId ? { ...t, score: t.score + 1 } : t
    )
    onResolved(updatedTeams)
  }

  return (
    <div className={styles.screen}>
      {/* Pulsing rings */}
      <div className={styles.ring} />
      <div className={styles.ring2} />

      {/* Title */}
      <h1 className={styles.title}>⚡ Tiebreaker!</h1>
      <p className={styles.subtitle}>Det er uavgjort – ett spørsmål avgjør alt!</p>

      {/* Face-off */}
      <div className={styles.faceoff}>
        {tiedTeams.map((team, i) => (
          <React.Fragment key={team.id}>
            {i > 0 && <span className={styles.vs}>VS</span>}
            <div
              className={styles.teamCard}
              style={{ '--team-color': teamColorMap[team.id] } as CSSProperties}
            >
              <span className={styles.teamCardName}>{team.name}</span>
              <span className={styles.teamCardScore}>{team.score}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {numericAnswer === null ? (
        <TiebreakerClassic
          tiedTeams={tiedTeams}
          teamColorMap={teamColorMap}
          question={q}
          onAward={handleAward}
        />
      ) : (
        <NumericTiebreaker
          tiedTeams={tiedTeams}
          allTeams={allTeams}
          teamColorMap={teamColorMap}
          sessionCode={sessionCode}
          question={q.question}
          answer={numericAnswer}
          onAward={handleAward}
        />
      )}
    </div>
  )
}

interface NumericProps {
  tiedTeams: Team[]
  allTeams: Team[]
  teamColorMap: Record<string, string>
  sessionCode: string
  question: string
  answer: number
  onAward: (teamId: string) => void
}

/**
 * The phone-answered flow: the tied teams type an estimate, then the reveal
 * plots every guess against the answer.
 */
function NumericTiebreaker({
  tiedTeams,
  allTeams,
  teamColorMap,
  sessionCode,
  question,
  answer,
  onAward,
}: NumericProps) {
  const socket = useSocket()
  const { playStart, playAward, playSkip, playHover } = useSounds()

  const [mode, setMode] = useState<Mode>('collecting')
  const [round, setRound] = useState(0)
  const [submitted, setSubmitted] = useState<number[]>([])
  const [answers, setAnswers] = useState<TiebreakAnswer[]>([])
  /** The answer for the round on screen — a "Ny runde" replaces it. */
  const [liveAnswer, setLiveAnswer] = useState(answer)
  const [liveQuestion, setLiveQuestion] = useState(question)
  const [outcome, setOutcome] = useState<RevealOutcome | null>(null)
  /**
   * Team indices allowed to answer, narrowed to the deadlocked teams on a rerun
   * so a 3-way tie converges.
   *
   * The protocol is index-based against `allTeams` — the same order the phone
   * links and TEAM_COLORS use. `tiedTeams` is a *sorted* copy, so taking an
   * index from its own order would arm the wrong phones, with nothing to show
   * for it in any log.
   */
  const [participants, setParticipants] = useState<number[]>(() =>
    tiedTeams.map(t => allTeams.findIndex(x => x.id === t.id))
  )

  const teamAtIndex = useCallback((index: number) => allTeams[index], [allTeams])

  // Latest values for the registration effect, which must run once per socket
  // and not restart whenever a round advances.
  const startRef = useRef({ participants, question: liveQuestion, answer: liveAnswer })
  useEffect(() => {
    startRef.current = { participants, question: liveQuestion, answer: liveAnswer }
  })

  useEffect(() => {
    function register() {
      // GameScreen's socket is gone by now, so this screen re-registers the
      // session. `tiebreak-start` MUST stay nested in this ack: emitted in
      // parallel it can beat create-session to the server, which then has no
      // session to attach the round to and drops it without a word.
      socket.emit('create-session', { code: sessionCode, teams: teamInfos(allTeams) }, res => {
        if (res.tiebreak) {
          // A host reload mid-round: adopt what teams already sent rather than
          // starting a second round over the top of it.
          const tb = res.tiebreak
          setRound(tb.round)
          setParticipants(tb.participants)
          setSubmitted(tb.submitted)
          setLiveQuestion(tb.question)
          if (tb.phase === 'revealed' && tb.correct !== null) {
            setLiveAnswer(tb.correct)
            setAnswers(tb.answers ?? [])
            setMode('revealing')
          }
          return
        }
        const start = startRef.current
        socket.emit(
          'tiebreak-start',
          {
            code: sessionCode,
            participants: start.participants,
            question: start.question,
            correct: start.answer,
          },
          ack => {
            if (ack.ok) setRound(ack.round)
          }
        )
      })
    }

    if (socket.connected) register()
    socket.on('connect', register)

    socket.on('tiebreak-progress', ({ submitted: next }) => setSubmitted(next))

    socket.on('tiebreak-revealed', ({ correct, answers: next }) => {
      setLiveAnswer(correct)
      setAnswers(next)
      setOutcome(null)
      setMode('revealing')
    })

    return () => {
      socket.off('connect', register)
      socket.off('tiebreak-progress')
      socket.off('tiebreak-revealed')
    }
    // Registration is per-socket, like GameScreen's. Round state is read
    // through startRef so a new round never tears the listeners down.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, sessionCode])

  function handleReveal() {
    playStart()
    // The broadcast is what flips this screen, so host and phones reveal in the
    // same tick rather than the host running ahead of the room.
    socket.emit('tiebreak-reveal', { code: sessionCode })
  }

  function handleRevealDone(result: RevealOutcome) {
    setOutcome(result)
    if (result.kind === 'winner') {
      playAward()
      setMode('resolved')
    } else {
      playSkip()
      setMode('deadlock')
    }
  }

  function resolveTo(teamId: string) {
    socket.emit('tiebreak-end', { code: sessionCode })
    onAward(teamId)
  }

  function startRound(nextQuestion: string, nextAnswer: number, nextParticipants: number[]) {
    setLiveQuestion(nextQuestion)
    setLiveAnswer(nextAnswer)
    setParticipants(nextParticipants)
    setSubmitted([])
    setAnswers([])
    setOutcome(null)
    setMode('collecting')
    socket.emit(
      'tiebreak-start',
      { code: sessionCode, participants: nextParticipants, question: nextQuestion, correct: nextAnswer },
      ack => {
        if (ack.ok) setRound(ack.round)
      }
    )
  }

  const revealTeams: RevealTeam[] = allTeams.map((team, index) => ({
    index,
    name: team.name,
    color: TEAM_COLORS[index % TEAM_COLORS.length],
  }))

  const allIn = participants.length > 0 && submitted.length >= participants.length

  if (mode === 'collecting') {
    return (
      <>
        <div className={styles.questionCard}>
          <p className={styles.questionLabel}>Avgjørende spørsmål</p>
          <p className={styles.questionText}>{liveQuestion}</p>
          <p className={styles.phoneHint}>Svar på mobilen 📱</p>
        </div>

        <div className={styles.progressStrip}>
          {participants.map(index => {
            const team = teamAtIndex(index)
            if (!team) return null
            return (
              <div
                key={index}
                className={`${styles.progressTeam} ${submitted.includes(index) ? styles.progressDone : ''}`}
                style={{ '--team-color': teamColorMap[team.id] } as CSSProperties}
              >
                <span className={styles.progressTick}>{submitted.includes(index) ? '✓' : '…'}</span>
                <span>{team.name}</span>
              </div>
            )
          })}
        </div>
        <p className={styles.progressCount}>
          {submitted.length} av {participants.length} lag har svart
        </p>

        <div className={styles.actions}>
          {/* Never auto-reveals when the last answer lands — the host wants to
              hold the beat. It just starts asking to be pressed. */}
          <button
            className={`${styles.revealBtn} ${allIn ? styles.revealBtnReady : ''}`}
            onMouseEnter={playHover}
            onClick={handleReveal}
          >
            Avslør svaret
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <p className={styles.revealQuestion}>{liveQuestion}</p>

      <TiebreakReveal
        // Remounting per round replays the whole animation from zero.
        key={round}
        correct={liveAnswer}
        guesses={answers}
        teams={revealTeams}
        onDone={handleRevealDone}
      />

      {mode === 'resolved' && outcome?.kind === 'winner' && (
        <div className={styles.actions}>
          <p className={styles.winnerLine}>
            🏆 {teamAtIndex(outcome.teamIndex)?.name ?? '?'} vant tiebreakeren
          </p>
          <button
            className={styles.revealBtn}
            onMouseEnter={playHover}
            onClick={() => {
              const team = teamAtIndex(outcome.teamIndex)
              if (team) resolveTo(team.id)
            }}
          >
            Til seierspallen
          </button>
        </div>
      )}

      {mode === 'deadlock' && outcome?.kind === 'deadlock' && (
        <DeadlockActions
          reason={outcome.reason}
          contenders={outcome.contenders.length > 0 ? outcome.contenders : participants}
          teamAtIndex={teamAtIndex}
          teamColorMap={teamColorMap}
          onRerun={(nextQuestion, nextAnswer, nextParticipants) =>
            startRound(nextQuestion, nextAnswer, nextParticipants)
          }
          onPick={teamId => resolveTo(teamId)}
          onHover={playHover}
        />
      )}
    </>
  )
}

interface DeadlockProps {
  reason: 'tie' | 'no-answers'
  contenders: number[]
  teamAtIndex: (index: number) => Team | undefined
  teamColorMap: Record<string, string>
  onRerun: (question: string, answer: number, participants: number[]) => void
  onPick: (teamId: string) => void
  onHover: () => void
}

/**
 * Where an exact tie (or a round nobody answered) lands: run it again with a
 * fresh question, or just call it.
 */
function DeadlockActions({
  reason,
  contenders,
  teamAtIndex,
  teamColorMap,
  onRerun,
  onPick,
  onHover,
}: DeadlockProps) {
  const [showForm, setShowForm] = useState(false)
  const [draftQuestion, setDraftQuestion] = useState('')
  const [draftAnswer, setDraftAnswer] = useState('')

  const parsedAnswer = parseNumericInput(draftAnswer)
  const canSubmit = draftQuestion.trim().length > 0 && parsedAnswer !== null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || parsedAnswer === null) return
    // Narrowing to the contenders is what makes a rerun converge: a three-way
    // tie collapses to the two that were actually level.
    onRerun(draftQuestion.trim(), parsedAnswer, contenders)
  }

  return (
    <div className={styles.actions}>
      <p className={styles.deadlockLine}>
        {reason === 'no-answers' ? 'Ingen svarte!' : 'Fortsatt uavgjort!'}
      </p>

      {showForm ? (
        <form className={styles.rerunForm} onSubmit={handleSubmit}>
          <input
            className={styles.rerunInput}
            type="text"
            placeholder="Nytt spørsmål"
            value={draftQuestion}
            onChange={e => setDraftQuestion(e.target.value)}
            autoFocus
          />
          <input
            className={styles.rerunInput}
            type="text"
            inputMode="decimal"
            placeholder="Fasit (tall)"
            value={draftAnswer}
            onChange={e => setDraftAnswer(e.target.value)}
          />
          <p className={styles.rerunEcho}>
            {parsedAnswer === null ? ' ' : nbNumber.format(parsedAnswer)}
          </p>
          <div className={styles.awardButtons}>
            <button className={styles.revealBtn} type="submit" disabled={!canSubmit}>
              Start runden
            </button>
            <button
              className={styles.secondaryBtn}
              type="button"
              onClick={() => setShowForm(false)}
            >
              Avbryt
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className={styles.awardButtons}>
            <button className={styles.revealBtn} onMouseEnter={onHover} onClick={() => setShowForm(true)}>
              Ny runde
            </button>
          </div>
          <p className={styles.awardLabel}>… eller kår en vinner</p>
          <div className={styles.awardButtons}>
            {contenders.map(index => {
              const team = teamAtIndex(index)
              if (!team) return null
              return (
                <button
                  key={index}
                  className={styles.teamBtn}
                  style={{ '--team-color': teamColorMap[team.id] } as CSSProperties}
                  onMouseEnter={onHover}
                  onClick={() => onPick(team.id)}
                >
                  {team.name}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function teamInfos(teams: Team[]): TeamInfo[] {
  return teams.map((team, index) => ({
    index,
    name: team.name,
    color: TEAM_COLORS[index % TEAM_COLORS.length],
  }))
}
