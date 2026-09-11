import { useSound } from 'react-sounds'

export function useSounds() {
  const { play: _playOpen } = useSound('ui/pop_open')
  const { play: _playAward } = useSound('arcade/coin_bling')
  const { play: _playSkip } = useSound('game/miss')
  const { play: _playHover } = useSound('ui/button_soft')
  const { play: _playStart } = useSound('arcade/power_up')

  return {
    playOpen: () => _playOpen(),
    playAward: () => _playAward(),
    playSkip: () => _playSkip(),
    playHover: () => _playHover({ volume: 0.4 }),
    playStart: () => _playStart(),
  }
}
