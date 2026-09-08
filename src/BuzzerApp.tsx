import BuzzerScreen from './screens/BuzzerScreen'
import { Text, VStack } from './components/ui'
import styles from './screens/BuzzerScreen.module.css'

export default function BuzzerApp() {
  const params = new URLSearchParams(window.location.search)
  const sessionCode = params.get('s')
  const teamIndex = Number(params.get('t') ?? '-1')

  if (!sessionCode || isNaN(teamIndex) || teamIndex < 0) {
    return (
      <VStack className={styles.fatal} align="center" justify="center" gap={4}>
        <Text size="xl">Ugyldig buzzer-lenke.</Text>
        <Text tone="muted">Be verten om å sende deg riktig URL.</Text>
      </VStack>
    )
  }

  return <BuzzerScreen sessionCode={sessionCode} teamIndex={teamIndex} />
}
