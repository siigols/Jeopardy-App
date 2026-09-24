import {
  BOARD_TILE_POINTS,
} from '../types/game'
import type { BoardDraft, Game, GameTheme, QuestionContent } from '../types/game'
import { DEFAULT_BOARD_THEME_ID, getBoardTheme } from '../data/boardThemes'

/** Display strings for higher/lower values are derived, never authored. */
const numberFormat = new Intl.NumberFormat('nb-NO')

/**
 * The optional question/answer images, omitted entirely when absent so a tile
 * without pictures serialises to exactly the JSON it did before this feature.
 */
function imageFields(tile: { questionImage?: string; answerImage?: string }) {
  return {
    ...(tile.questionImage !== undefined ? { questionImage: tile.questionImage } : {}),
    ...(tile.answerImage !== undefined ? { answerImage: tile.answerImage } : {}),
  }
}

/**
 * A half-typed Høyere/Lavere row reaches the preview as NaN (the editor keeps the
 * number as text until it parses). Rendering "NaN" would look like a bug in the
 * board rather than an unfinished row, so show nothing instead. Saved boards never
 * hit this: the server rejects a non-numeric row before it is stored.
 */
function formatNumber(value: number): string {
  return Number.isFinite(value) ? numberFormat.format(value) : ''
}

function tileContent(tile: BoardDraft['categories'][number]['tiles'][number]): QuestionContent {
  switch (tile.type) {
    case 'tenable':
      return { type: 'tenable', prompt: tile.prompt, items: tile.items }
    case 'multipleChoice':
      return {
        type: 'multipleChoice',
        question: tile.question,
        options: tile.options,
        correctIndex: tile.correctIndex,
        ...imageFields(tile),
      }
    case 'higherLower':
      return {
        type: 'higherLower',
        metric: tile.metric,
        items: tile.items.map(item => ({
          ...(item.image !== undefined ? { image: item.image } : {}),
          label: item.label,
          value: formatNumber(item.numericValue),
          numericValue: item.numericValue,
        })),
      }
    case 'beatForBeat':
      return {
        type: 'beatForBeat',
        words: tile.words,
        colors: tile.colors,
        ...(tile.songTitle !== undefined ? { songTitle: tile.songTitle } : {}),
        ...(tile.artist !== undefined ? { artist: tile.artist } : {}),
        ...(tile.youtubeId !== undefined ? { youtubeId: tile.youtubeId } : {}),
        ...(tile.youtubeStart !== undefined ? { youtubeStart: tile.youtubeStart } : {}),
      }
    case 'stepByStep':
      return {
        type: 'stepByStep',
        ...(tile.title !== undefined ? { title: tile.title } : {}),
        steps: tile.steps,
      }
    case 'simple':
      return { type: 'simple', question: tile.question, answer: tile.answer, ...imageFields(tile) }
  }

  // Exhaustiveness guard: adding a draft tile type without a branch above is a
  // compile error here rather than a silent fallthrough into `simple`.
  const unreachable: never = tile
  throw new Error(`Unsupported tile type: ${JSON.stringify(unreachable)}`)
}

/**
 * Shared draft -> Game mapping. Used by the server on createBoard/updateBoard and
 * by the editor's preview, so what an author sees before saving is built by exactly
 * the same code that decides what gets stored.
 *
 * `existingTheme` is the theme already stored on the board, used when the draft
 * names no preset. `fallbackTheme` applies only when neither is present.
 */
export function draftToGame(draft: BoardDraft, existingTheme?: GameTheme, fallbackTheme?: GameTheme): Game {
  const preset = draft.themeId !== undefined ? getBoardTheme(draft.themeId) : undefined
  // A background photo is stored on the theme, so a board that has one but no
  // colour preset still needs a theme object to hang it on.
  const needsTheme = draft.backgroundImage !== undefined && draft.backgroundImage !== null
  const base = preset ?? existingTheme ?? fallbackTheme ?? (needsTheme ? getBoardTheme(DEFAULT_BOARD_THEME_ID) : undefined)
  // Fall back to the stored scene when the draft names none, so an older client
  // that doesn't send backgroundId can't wipe a board's background.
  const decorations = draft.backgroundId ?? existingTheme?.decorations
  // Always a shallow copy: BOARD_THEMES presets are shared module-level objects
  // and must never be handed out where a consumer could mutate them.
  const theme: GameTheme | undefined = base === undefined ? undefined : { ...base }
  if (theme !== undefined) {
    // 'none' is stored as an absent key rather than a value, so it also has to
    // clear a scene the base theme carried over.
    if (decorations !== undefined && decorations !== 'none') theme.decorations = decorations
    else delete theme.decorations

    // Explicit null clears the photo; an absent key leaves whatever is stored,
    // so an older client that doesn't send the field can't wipe a background.
    if (draft.backgroundImage === null) delete theme.backgroundImage
    else if (draft.backgroundImage !== undefined) theme.backgroundImage = draft.backgroundImage
  }

  return {
    title: draft.title,
    ...(draft.description !== undefined ? { description: draft.description } : {}),
    ...(draft.tiebreaker !== undefined ? { tiebreaker: draft.tiebreaker } : {}),
    ...(theme !== undefined ? { theme } : {}),
    categories: draft.categories.map(category => ({
      name: category.name,
      tiles: category.tiles.map((tile, index) => ({
        points: BOARD_TILE_POINTS[index],
        content: tileContent(tile),
        answered: false,
      })),
    })),
  }
}
