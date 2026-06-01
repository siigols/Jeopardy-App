import BuzzerScreen from './screens/BuzzerScreen'

export default function BuzzerApp() {
  const params = new URLSearchParams(window.location.search)
  const sessionCode = params.get('s')
  const teamIndex = Number(params.get('t') ?? '-1')

  if (!sessionCode || isNaN(teamIndex) || teamIndex < 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '1.5rem' }}>Ugyldig buzzer-lenke.</p>
        <p style={{ color: 'var(--color-text-muted, #888)' }}>Be verten om å sende deg riktig URL.</p>
      </div>
    )
  }

  return <BuzzerScreen sessionCode={sessionCode} teamIndex={teamIndex} />
}
