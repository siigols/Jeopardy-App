import { useSound } from 'react-sounds'

export function useSounds() {
  const { play: _playOpen } = useSound('ui/pop_open')
  const { play: _playReveal } = useSound('arcade/level_up')
  const { play: _playAward } = useSound('arcade/coin_bling')
  const { play: _playSkip } = useSound('game/miss')
  const { play: _playBuzz } = useSound('ambient/heartbeat')
  const { play: _playHover } = useSound('ui/button_soft')
  const { play: _playClick } = useSound('ui/button_medium')
  const { play: _playStart } = useSound('arcade/power_up')

  return {
    playOpen: () => _playOpen(),
    playReveal: () => _playReveal(),
    playAward: () => _playAward(),
    playSkip: () => _playSkip(),
    playBuzz: () => _playBuzz(),
    playHover: () => _playHover({ volume: 0.4 }),
    playClick: () => _playClick(),
    playStart: () => _playStart(),
  }
}
