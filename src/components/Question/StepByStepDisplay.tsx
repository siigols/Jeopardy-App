import { useRef, useState } from 'react'
import { useSounds } from '../../hooks/useSounds'
import { youTubeEmbedUrl, type StepByStepQuestion, type YouTubeRef } from '../../types/game'
import styles from './StepByStepDisplay.module.css'

interface Props {
  content: StepByStepQuestion
  /**
   * How many parts are shown, counting question and answer separately:
   * 1 = question 1, 2 = answer 1, 3 = question 2, ...
   */
  shownCount: number
}

/** Autoplaying, offscreen embed; `enablejsapi` lets the question clip be paused via postMessage. */
function embedSrc(ref: YouTubeRef) {
  return `${youTubeEmbedUrl(ref)}&enablejsapi=1`
}

/**
 * Audio is tied to `shownCount` and to mounting: the question clip resets
 * whenever another part is shown, and the answer song is only mounted while its
 * answer is the latest part shown — so it stops on the next question, and when
 * the tile closes and this component unmounts.
 */
export default function StepByStepDisplay({ content, shownCount }: Props) {
  const { playHover } = useSounds()
  const questionFrame = useRef<HTMLIFrameElement>(null)
  // Stamped with the shownCount it was started at, so showing a new part drops it.
  const [clip, setClip] = useState<{ shown: number; step: number; playing: boolean } | null>(null)
  const activeClip = clip && clip.shown === shownCount ? clip : null

  const answerStep = shownCount > 0 && shownCount % 2 === 0 ? shownCount / 2 - 1 : -1
  const answerSong = answerStep >= 0 ? content.steps[answerStep]?.answerYoutube : undefined

  function toggleClip(step: number) {
    if (!activeClip || activeClip.step !== step) {
      // First press mounts the iframe inside the click, so autoplay is allowed.
      setClip({ shown: shownCount, step, playing: true })
      return
    }
    const playing = !activeClip.playing
    questionFrame.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: playing ? 'playVideo' : 'pauseVideo', args: [] }),
      '*'
    )
    setClip({ ...activeClip, playing })
  }

  return (
    <div className={styles.container}>
      {content.title && <p className={styles.title}>{content.title}</p>}
      <ol className={styles.steps}>
        {content.steps.map((step, i) => {
          const questionShown = shownCount > i * 2
          const answerShown = shownCount > i * 2 + 1
          const hasClip = questionShown && Boolean(step.questionYoutube)
          const playing = activeClip?.step === i && activeClip.playing
          return (
            <li
              key={i}
              className={`${styles.step} ${questionShown ? '' : styles.hidden} ${hasClip ? styles.withPlay : ''}`}
            >
              <span className={styles.number}>{i + 1}</span>
              <span className={styles.question}>{questionShown ? step.question : '?'}</span>
              {answerShown && <span className={styles.answer}>{step.answer}</span>}
              {hasClip && (
                <button
                  type="button"
                  className={styles.playBtn}
                  onMouseEnter={playHover}
                  onClick={() => toggleClip(i)}
                  aria-label={playing ? 'Pause' : 'Spill av'}
                >
                  {playing ? '❚❚' : '▶'}
                </button>
              )}
            </li>
          )
        })}
      </ol>

      {activeClip && content.steps[activeClip.step]?.questionYoutube && (
        <iframe
          ref={questionFrame}
          key={`q${activeClip.step}`}
          className={styles.player}
          title="Spørsmålsklipp"
          src={embedSrc(content.steps[activeClip.step].questionYoutube!)}
          allow="autoplay"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
      {answerSong && (
        <iframe
          key={`a${answerStep}`}
          className={styles.player}
          title="Svarsang"
          src={embedSrc(answerSong)}
          allow="autoplay"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
