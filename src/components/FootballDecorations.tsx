import trophyImg from '../assets/fifa_logo.png'
import styles from './FootballDecorations.module.css'

function PitchBackground() {
  const lc = 'rgba(255,255,255,0.65)'
  const lw = 0.8

  return (
    <svg
      className={styles.pitch}
      viewBox="0 0 160 90"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      {/* Vertical grass stripes — landscape pitch */}
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={i * 20} y={0} width={20} height={90}
          fill={i % 2 === 0 ? '#1a5c08' : '#155006'} />
      ))}

      {/* Outer boundary — top at y=10 so corners show below the topBar */}
      <rect x="2" y="10" width="156" height="78"
        fill="none" stroke={lc} strokeWidth={lw} />

      {/* Center line */}
      <line x1="80" y1="10" x2="80" y2="88"
        stroke={lc} strokeWidth={lw} />

      {/* Center circle — centered at pitch midpoint y=49 */}
      <circle cx="80" cy="49" r="12"
        fill="none" stroke={lc} strokeWidth={lw} />

      {/* Center spot */}
      <circle cx="80" cy="49" r="0.9" fill={lc} />

      {/* ── Left half ─────────────────────────────────── */}
      {/* Left penalty area — centered at y=49 */}
      <rect x="2" y="17" width="26" height="64"
        fill="none" stroke={lc} strokeWidth={lw} />

      {/* Left goal area (six-yard box) — centered at y=49 */}
      <rect x="2" y="34" width="9" height="30"
        fill="none" stroke={lc} strokeWidth={lw} />

      {/* Left penalty spot */}
      <circle cx="18" cy="49" r="0.9" fill={lc} />

      {/* Left penalty arc (D) — intersects x=28 at y=42 and y=56 */}
      <path d="M 28 42 A 12 12 0 0 1 28 56"
        fill="none" stroke={lc} strokeWidth={lw} />

      {/* Left corner arcs */}
      <path d="M 2 13 A 3 3 0 0 0 5 10"
        fill="none" stroke={lc} strokeWidth={lw} />
      <path d="M 2 85 A 3 3 0 0 1 5 88"
        fill="none" stroke={lc} strokeWidth={lw} />

      {/* Left goal — centered at y=49 */}
      <rect x="-3" y="42" width="5" height="14"
        fill="none" stroke={lc} strokeWidth={lw} strokeOpacity="0.7" />

      {/* ── Right half ───────────────────────────────── */}
      {/* Right penalty area — centered at y=49 */}
      <rect x="132" y="17" width="26" height="64"
        fill="none" stroke={lc} strokeWidth={lw} />

      {/* Right goal area — centered at y=49 */}
      <rect x="149" y="34" width="9" height="30"
        fill="none" stroke={lc} strokeWidth={lw} />

      {/* Right penalty spot */}
      <circle cx="142" cy="49" r="0.9" fill={lc} />

      {/* Right penalty arc (D) */}
      <path d="M 132 42 A 12 12 0 0 0 132 56"
        fill="none" stroke={lc} strokeWidth={lw} />

      {/* Right corner arcs */}
      <path d="M 155 10 A 3 3 0 0 0 158 13"
        fill="none" stroke={lc} strokeWidth={lw} />
      <path d="M 155 88 A 3 3 0 0 1 158 85"
        fill="none" stroke={lc} strokeWidth={lw} />

      {/* Right goal — centered at y=49 */}
      <rect x="158" y="42" width="5" height="14"
        fill="none" stroke={lc} strokeWidth={lw} strokeOpacity="0.7" />
    </svg>
  )
}

export default function FootballDecorations() {
  return (
    <div className={styles.root} aria-hidden>
      <PitchBackground />

      {/* Footballs */}
      <div className={`${styles.item} ${styles.ball1}`}>⚽</div>
      <div className={`${styles.item} ${styles.ball2}`}>⚽</div>
      <div className={`${styles.item} ${styles.ball3}`}>⚽</div>
      <div className={`${styles.item} ${styles.ball4}`}>⚽</div>

      {/* Norwegian flags */}
      <div className={`${styles.item} ${styles.no1}`}>🇳🇴</div>
      <div className={`${styles.item} ${styles.no2}`}>🇳🇴</div>
      <div className={`${styles.item} ${styles.no3}`}>🇳🇴</div>

      {/* French flags */}
      <div className={`${styles.item} ${styles.fr1}`}>🇫🇷</div>
      <div className={`${styles.item} ${styles.fr2}`}>🇫🇷</div>
      <div className={`${styles.item} ${styles.fr3}`}>🇫🇷</div>

      {/* FIFA World Cup trophy — static, full opacity, bottom center */}
      <img src={trophyImg} className={styles.trophy} alt="" />

      <div className={styles.flagBar} />
    </div>
  )
}
