let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(
  freq: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  freqEnd?: number,
) {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(c.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime + startTime)
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + startTime + duration)
  gain.gain.setValueAtTime(volume, c.currentTime + startTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startTime + duration)
  osc.start(c.currentTime + startTime)
  osc.stop(c.currentTime + startTime + duration + 0.01)
}

export function useSounds() {
  function playOpen() {
    // Rising whoosh when a tile is opened
    tone(260, 0, 0.22, 0.18, 'sine', 520)
    tone(390, 0.04, 0.18, 0.1, 'sine', 780)
  }

  function playReveal() {
    // Ascending arpeggio: C4 E4 G4 C5
    const notes = [262, 330, 392, 523]
    notes.forEach((f, i) => tone(f, i * 0.08, 0.28, 0.2, 'triangle'))
  }

  function playAward() {
    // Triumphant fanfare: chord + high note
    tone(523, 0,    0.55, 0.18, 'triangle')  // C5
    tone(659, 0,    0.55, 0.18, 'triangle')  // E5
    tone(784, 0,    0.55, 0.16, 'triangle')  // G5
    tone(1047, 0.1, 0.55, 0.22, 'sine')      // C6 accent
    tone(1319, 0.3, 0.45, 0.15, 'sine')      // E6 flourish
  }

  function playSkip() {
    // Short descending buzz
    tone(220, 0, 0.18, 0.14, 'sawtooth', 110)
    tone(180, 0.1, 0.12, 0.08, 'sawtooth', 90)
  }

  function playBuzz() {
    // Punchy buzz-in: low thump + rising sawtooth sweep + high shimmer
    tone(200, 0,    0.05, 0.55, 'square')
    tone(140, 0,    0.35, 0.45, 'sawtooth', 440)
    tone(880, 0.08, 0.25, 0.20, 'sine', 660)
  }

  return { playOpen, playReveal, playAward, playSkip, playBuzz }
}
