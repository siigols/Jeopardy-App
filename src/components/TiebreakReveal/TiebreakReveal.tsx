import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { nbNumber } from '../../utils/parseNumber'
import {
  REVEAL,
  buildScale,
  decideOutcome,
  chipCentre,
  niceTicks,
  spreadLabels,
  toFraction,
  valueAt,
  type Guess,
  type RevealOutcome,
} from './revealMath'
import styles from './TiebreakReveal.module.css'

/** The animated stretch, in order. `result` is held until the host acts. */
type Phase = 'armed' | 'running' | 'result'

export interface RevealTeam {
  index: number
  name: string
  color: string
}

interface Props {
  correct: number
  guesses: Guess[]
  teams: RevealTeam[]
  onDone: (outcome: RevealOutcome) => void
}

/**
 * The payoff: a needle races along a ruler from zero, past every guess, swings
 * back and forth, and settles on the answer — with each team's estimate pinned
 * to the same scale so the room can see who was closest.
 *
 * Presentational only: no socket, no scoring. The host screen decides what a
 * given outcome is worth.
 */
export default function TiebreakReveal({ correct, guesses, teams, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('armed')
  const fillRef = useRef<HTMLDivElement>(null)
  const needleRef = useRef<HTMLDivElement>(null)
  const counterRef = useRef<HTMLDivElement>(null)

  const scale = useMemo(() => buildScale(correct, guesses.map(g => g.value)), [correct, guesses])
  const outcome = useMemo(() => decideOutcome(guesses, correct), [guesses, correct])
  const ticks = useMemo(() => niceTicks(scale.axisMin, scale.axisMax), [scale])

  // The global prefers-reduced-motion rule in index.css only reaches CSS
  // animations; a rAF loop would sail straight past it, so the whole sweep has
  // to be skipped explicitly. Read once — nobody flips this mid-reveal.
  const [reduced] = useState(
    () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  // Latest callback in a ref so the animation effect never restarts because the
  // parent passed a fresh arrow.
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  })

  useEffect(() => {
    const setDisplay = (value: number) => {
      const fraction = toFraction(value, scale)
      // Both are transforms on purpose: scaleX and translateX stay on the
      // compositor, where `width`/`left` would force a layout on every one of
      // the ~250 frames the sweep runs for. The needle's wrapper spans the
      // whole ruler, so translateX(100%) is exactly one ruler width.
      fillRef.current?.style.setProperty('--fill', String(fraction))
      needleRef.current?.style.setProperty('--fill', String(fraction))
      if (counterRef.current) counterRef.current.textContent = formatValue(value, correct)
    }

    setDisplay(reduced ? correct : 0)

    if (reduced) {
      const id = setTimeout(() => {
        setPhase('result')
        doneRef.current(outcome)
      }, 400)
      return () => clearTimeout(id)
    }

    let raf = 0
    let startedAt = 0
    const runFor = REVEAL.sweepMs + REVEAL.oscillateMs

    function frame(now: number) {
      if (startedAt === 0) startedAt = now
      const elapsed = now - startedAt
      setDisplay(valueAt(Math.min(elapsed, runFor), correct, scale.sweepPeak))
      if (elapsed < runFor) {
        raf = requestAnimationFrame(frame)
        return
      }
      // Settled: hold on the answer for a beat before the buttons appear.
      setDisplay(correct)
    }

    const startId = setTimeout(() => {
      setPhase('running')
      raf = requestAnimationFrame(frame)
    }, REVEAL.armedMs)

    const doneId = setTimeout(() => {
      setPhase('result')
      doneRef.current(outcome)
    }, REVEAL.armedMs + runFor + REVEAL.settleMs)

    return () => {
      clearTimeout(startId)
      clearTimeout(doneId)
      cancelAnimationFrame(raf)
    }
  }, [correct, scale, outcome, reduced])

  const winnerIndex = outcome.kind === 'winner' ? outcome.teamIndex : null
  const contenders = outcome.kind === 'deadlock' ? outcome.contenders : []
  const settled = phase === 'result'

  // Chips are nudged apart so they stay readable; a leader line keeps each one
  // tied to where its guess really falls.
  const plotted = guesses.flatMap(guess => {
    const team = teams.find(t => t.index === guess.index)
    if (!team) return []
    return [{
      ...guess,
      team,
      truePos: toFraction(guess.value, scale),
      offScale: scale.offScale.includes(guess.value),
      distance: Math.abs(guess.value - correct),
    }]
  })
  const labelPos = spreadLabels(plotted.map(m => m.truePos))
  const answerPos = toFraction(correct, scale)

  return (
    <div className={`${styles.reveal} ${settled ? styles.settled : ''}`}>
      <div ref={counterRef} className={styles.counter}>0</div>

      <div className={styles.rulerWrap}>
        {/* Held back until the value stops moving: a flag labelled "fasit"
            while the needle is still hunting gives the answer away. */}
        <div
          className={styles.answerFlag}
          style={{ '--pos': answerPos } as CSSProperties}
          hidden={!settled}
        >
          <span className={styles.answerTag}>Fasit</span>
        </div>

        <div className={styles.ruler}>
          <div ref={fillRef} className={styles.fill} />

          <svg className={styles.ticks} viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
            {ticks.major.flatMap((value, i) => {
              const x = toFraction(value, scale) * 1000
              const marks = [
                <line key={`M${i}`} className={styles.tickMajor} x1={x} y1={0} x2={x} y2={54} vectorEffect="non-scaling-stroke" />,
              ]
              // Minor hairlines between this major and the next — what makes it
              // read as a ruler rather than a progress bar.
              for (let m = 1; m < ticks.minorPer; m++) {
                const minor = value + (ticks.step * m) / ticks.minorPer
                if (minor > scale.axisMax) break
                const mx = toFraction(minor, scale) * 1000
                marks.push(
                  <line key={`m${i}-${m}`} className={styles.tickMinor} x1={mx} y1={0} x2={mx} y2={28} vectorEffect="non-scaling-stroke" />
                )
              }
              return marks
            })}
          </svg>

          {/* Precise reading for each guess, on the ruler itself. */}
          {plotted.map(marker => (
            <div
              key={`t${marker.index}`}
              className={styles.teamTick}
              style={{ '--pos': marker.truePos, '--team-color': marker.team.color } as CSSProperties}
            />
          ))}

          {/* Full-width wrapper so translateX(100%) spans exactly one ruler. */}
          <div ref={needleRef} className={styles.needleTrack}>
            <div className={styles.needle} />
          </div>
        </div>

        <div className={styles.tickLabels} aria-hidden="true">
          {ticks.major.map(value => (
            <span
              key={value}
              className={styles.tickLabel}
              style={{ '--pos': toFraction(value, scale) } as CSSProperties}
            >
              {nbNumber.format(value)}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.markerBand}>
        <svg className={styles.leaders} viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
          {plotted.map((marker, i) => (
            <line
              key={marker.index}
              className={styles.leader}
              x1={marker.truePos * 1000}
              y1={0}
              x2={chipCentre(labelPos[i]) * 1000}
              y2={100}
              stroke={marker.team.color}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {plotted.map((marker, i) => (
          <div
            key={marker.index}
            className={[
              styles.marker,
              marker.offScale ? styles.markerOffScale : '',
              settled && marker.index === winnerIndex ? styles.markerWinner : '',
              settled && contenders.includes(marker.index) ? styles.markerContender : '',
              settled && winnerIndex !== null && marker.index !== winnerIndex ? styles.markerFaded : '',
            ].filter(Boolean).join(' ')}
            style={{
              '--pos': labelPos[i],
              '--team-color': marker.team.color,
              '--delay': `${i * REVEAL.markerStaggerMs}ms`,
            } as CSSProperties}
          >
            <span className={styles.markerName}>{marker.team.name}</span>
            <span className={styles.markerValue}>
              {marker.offScale && '→ '}
              {nbNumber.format(marker.value)}
            </span>
            {settled && (
              <span className={styles.markerDistance}>bom: {formatDistance(marker.distance)}</span>
            )}
          </div>
        ))}

        {plotted.length === 0 && settled && (
          <p className={styles.noAnswers}>Ingen lag svarte</p>
        )}
      </div>
    </div>
  )
}

/**
 * Mid-sweep the counter is a spinning odometer, so it rounds to whole numbers;
 * a decimal answer still needs its decimals when it lands. Matching the
 * answer's own precision keeps "2,5" from settling on a triumphant "3".
 */
function formatValue(value: number, correct: number): string {
  const decimals = decimalsOf(correct)
  if (decimals === 0) return nbNumber.format(Math.round(value))
  return value.toLocaleString('nb-NO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatDistance(distance: number): string {
  return nbNumber.format(Math.round(distance * 100) / 100)
}

function decimalsOf(value: number): number {
  if (Number.isInteger(value)) return 0
  const text = String(value)
  const dot = text.indexOf('.')
  if (dot === -1) return 0
  return Math.min(text.length - dot - 1, 4)
}
