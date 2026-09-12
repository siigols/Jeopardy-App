/**
 * The maths behind the tiebreak reveal: a bar sweeps up from zero, overshoots,
 * swings back and forth with a decaying amplitude, and settles exactly on the
 * answer.
 *
 * Kept pure and separate from the component so the feel can be tuned from the
 * browser console without a re-render in the way.
 */

/** Every timing and shape constant, in one place, so tuning is one edit. */
export const REVEAL = {
  /** Guess markers slide onto the axis before anything moves. */
  armedMs: 600,
  /** 0 -> sweepPeak, ease-out. */
  sweepMs: 1400,
  /** Damped swing around the answer. */
  oscillateMs: 2600,
  /** Held exactly on the answer before the result UI appears. */
  settleMs: 500,
  /** Damping strength. Higher settles sooner and swings less. */
  zeta: 3.2,
  /** Swings across the answer during the oscillation. */
  cycles: 2.75,
  /** Stagger between marker entrances. */
  markerStaggerMs: 120,
  /** How far above the top guess the axis extends. */
  axisHeadroom: 1.15,
  /** Where the sweep peaks, as a fraction of the axis. Must land above the answer. */
  peakFraction: 0.92,
  /** A guess further than this many times |answer| away is off-scale. */
  outlierWindow: 3,
} as const

/** Total animated time, from the first marker to the settled bar. */
export const REVEAL_TOTAL_MS =
  REVEAL.armedMs + REVEAL.sweepMs + REVEAL.oscillateMs + REVEAL.settleMs

const easeOutCubic = (p: number): number => 1 - Math.pow(1 - p, 3)

/**
 * An exponentially decaying cosine, forced to exactly zero at p = 1.
 *
 * The `- e^-zeta` term is what does the forcing. Without it the envelope is
 * still a few percent wide when the phase ends, and the bar visibly jumps the
 * last stretch onto the answer instead of arriving at it.
 */
function damped(p: number, amplitude: number, zeta: number, cycles: number): number {
  const envelope = Math.exp(-zeta * p) - Math.exp(-zeta)
  return amplitude * envelope * Math.cos(2 * Math.PI * cycles * p)
}

/**
 * The displayed value at `elapsed` ms into the sweep (t = 0 is the end of the
 * `armed` phase).
 *
 * The two phases meet exactly: `damped(0)` equals `peak - correct`, so the
 * sweep hands over at its own peak with no jump. They meet with opposite
 * velocity, which is deliberate — that reversal is the "swings back".
 */
export function valueAt(elapsed: number, correct: number, peak: number): number {
  if (elapsed <= 0) return 0
  if (elapsed < REVEAL.sweepMs) {
    return peak * easeOutCubic(elapsed / REVEAL.sweepMs)
  }
  const t = elapsed - REVEAL.sweepMs
  if (t >= REVEAL.oscillateMs) return correct
  const amplitude = (peak - correct) / (1 - Math.exp(-REVEAL.zeta))
  return correct + damped(t / REVEAL.oscillateMs, amplitude, REVEAL.zeta, REVEAL.cycles)
}

export interface RevealScale {
  axisMin: number
  axisMax: number
  /** The top of the sweep. Always above `correct`, or there is no suspense. */
  sweepPeak: number
  /** Guesses too far out to plot honestly; pinned to the top of the axis. */
  offScale: number[]
}

/**
 * Picks the axis so the answer and every sane guess are readable.
 *
 * The outlier test is an absolute window around the answer rather than a ratio
 * of it: a ratio degenerates when the answer is 0 and inverts when it is
 * negative, both of which are real tiebreaker answers.
 *
 * The window is sized from the *nearest* guess as well as the answer, and that
 * second term is doing real work in two directions. With a small answer it
 * stops a window of 3 from throwing out honest guesses — answer 0, guesses -5
 * and 12 are not outliers. And when every team is wildly wrong in the same
 * direction it keeps them all on the chart: an answer-anchored window alone
 * would pin the whole field to the top edge, which is exactly when the ranking
 * needs to be visible. Using the nearest distance rather than an average means
 * one absurd guess can't drag the window out far enough to shelter itself.
 */
export function buildScale(correct: number, guesses: number[]): RevealScale {
  const distances = guesses.map(g => Math.abs(g - correct))
  const nearest = distances.length > 0 ? Math.min(...distances) : 0
  const window = Math.max(Math.abs(correct), nearest, 1) * REVEAL.outlierWindow
  const sane = guesses.filter(g => Math.abs(g - correct) <= window)
  const offScale = guesses.filter(g => Math.abs(g - correct) > window)

  // Anchor at zero in the ordinary positive case, so the bar really does rise
  // from nothing; only dip below when a plotted value needs it.
  const axisMin = Math.min(0, correct, ...sane)
  const rawMax = Math.max(correct, ...sane)
  // Headroom is added to the *span*, not the value, so it still opens up when
  // the axis starts below zero or the answer is tiny.
  const span = Math.max(rawMax - axisMin, Math.max(Math.abs(correct), 1) * 0.1)
  let axisMax = axisMin + span * REVEAL.axisHeadroom

  let sweepPeak = axisMin + (axisMax - axisMin) * REVEAL.peakFraction
  // The whole gag is overshooting the answer before falling back to it. If the
  // answer sits at the top of the axis there is nothing to overshoot into, so
  // open the axis until there is.
  if (sweepPeak <= correct) {
    axisMax = axisMin + (correct - axisMin) * 1.35 + Math.max(Math.abs(correct), 1) * 0.1
    sweepPeak = axisMin + (axisMax - axisMin) * REVEAL.peakFraction
  }

  return { axisMin, axisMax, sweepPeak, offScale }
}

/** Position on the axis as 0–1, clamped so an off-scale guess pins to the top. */
export function toFraction(value: number, scale: RevealScale): number {
  const span = scale.axisMax - scale.axisMin
  if (span <= 0) return 0
  return Math.min(1, Math.max(0, (value - scale.axisMin) / span))
}

/**
 * Ruler ticks at round numbers spanning the axis.
 *
 * Picks a step from the 1/2/5 x 10^n family — the same rule an axis library
 * would use, and the reason the labels read 1900, 1950, 2000 rather than
 * 1887,4. `minorPer` subdivides each step into the unlabelled hairlines that
 * make the scale look like a ruler instead of a progress bar.
 */
export function niceTicks(
  axisMin: number,
  axisMax: number,
  target = 7,
): { major: number[]; step: number; minorPer: number } {
  const span = axisMax - axisMin
  if (!(span > 0) || !Number.isFinite(span)) return { major: [], step: 0, minorPer: 0 }

  const rawStep = span / target
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const normalised = rawStep / magnitude
  const niceStep = (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) * magnitude

  const major: number[] = []
  const first = Math.ceil(axisMin / niceStep) * niceStep
  // Guard the loop on a count as well as the bound: accumulating a float step
  // can leave the loop one ulp short of the end and spin.
  for (let i = 0; i < 64; i++) {
    const value = first + i * niceStep
    if (value > axisMax + niceStep * 1e-9) break
    // -0 formats as "−0"; normalise it away.
    major.push(value === 0 ? 0 : value)
  }

  // 5 subdivisions read as a ruler for a step of 1 or 10; a step of 2 halves
  // more naturally into 4.
  const mantissa = niceStep / Math.pow(10, Math.floor(Math.log10(niceStep)))
  const minorPer = Math.abs(mantissa - 2) < 1e-9 ? 4 : 5

  return { major, step: niceStep, minorPer }
}

export interface Guess {
  index: number
  value: number
}

/**
 * Roughly how wide a guess chip is, as a fraction of the ruler.
 *
 * Approximate by necessity — the real width depends on the team name and the
 * digits — but it only has to be close: it sets the spacing labels are pushed
 * apart by, and where a leader line should aim to hit a chip's middle. Both
 * degrade gracefully when it is a little off, which is worth more here than a
 * measuring pass and the resize observer that would come with it.
 */
export const CHIP_WIDTH = 0.13

/**
 * Where a chip's centre ends up, given the anchor it is positioned at.
 *
 * Chips at the ends are pulled inward so they cannot hang off the ruler (the
 * CSS shifts them by `--pos * -100%` rather than a flat -50%), which moves the
 * centre away from the anchor. Leader lines have to aim at the centre, not the
 * anchor, or they visibly miss at the edges.
 */
export function chipCentre(anchor: number): number {
  return anchor + CHIP_WIDTH * (0.5 - anchor)
}

/**
 * Spreads overlapping labels along the axis.
 *
 * A zero-anchored ruler is what makes the sweep read as "up from nothing", but
 * it also squeezes the interesting part: two year guesses 13 apart sit a few
 * pixels apart on a 0-2288 scale, and their chips would land on top of each
 * other. So the chip moves to a readable position while a leader line keeps
 * pointing at where the guess actually falls — the standard fix, and it keeps
 * the ruler honest rather than distorting the scale to suit the labels.
 *
 * `gap` is a fraction of the ruler width — see CHIP_WIDTH.
 */
export function spreadLabels(positions: number[], gap = CHIP_WIDTH): number[] {
  const order = positions.map((pos, i) => ({ pos, i })).sort((a, b) => a.pos - b.pos)

  // Left to right, push anything too close to its neighbour further right.
  let previous = -Infinity
  for (const item of order) {
    item.pos = Math.max(item.pos, previous + gap)
    previous = item.pos
  }

  // That can run off the right edge; shove the whole run back if so, then clamp
  // (which can only reintroduce overlap when the labels cannot all fit anyway).
  const overflow = order.length > 0 ? order[order.length - 1].pos - 1 : 0
  if (overflow > 0) {
    for (const item of order) item.pos -= overflow
  }

  const result = new Array<number>(positions.length)
  for (const item of order) result[item.i] = Math.min(1, Math.max(0, item.pos))
  return result
}

export type RevealOutcome =
  | { kind: 'winner'; teamIndex: number; distance: number }
  | { kind: 'deadlock'; reason: 'tie' | 'no-answers'; contenders: number[] }

/**
 * Who was closest.
 *
 * The epsilon is scaled to the answer's magnitude: at these sizes a plain
 * `===` would let float noise decide a party game, and two teams that are
 * genuinely equally close must reach the deadlock branch rather than having a
 * winner picked by rounding.
 */
export function decideOutcome(guesses: Guess[], correct: number): RevealOutcome {
  if (guesses.length === 0) {
    return { kind: 'deadlock', reason: 'no-answers', contenders: [] }
  }
  const eps = 1e-9 * Math.max(1, Math.abs(correct))
  const withDistance = guesses.map(g => ({ ...g, distance: Math.abs(g.value - correct) }))
  const best = Math.min(...withDistance.map(g => g.distance))
  const winners = withDistance.filter(g => g.distance <= best + eps)

  if (winners.length > 1) {
    return { kind: 'deadlock', reason: 'tie', contenders: winners.map(w => w.index) }
  }
  return { kind: 'winner', teamIndex: winners[0].index, distance: winners[0].distance }
}
