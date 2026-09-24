import {
  BFB_MAX_WORDS,
  HL_MIN_ITEMS,
  MAX_LABEL_TEXT,
  MAX_OPTION_TEXT,
  MAX_TILE_TEXT,
  MAX_WORD_TEXT,
  MC_OPTION_COUNT,
  STEP_COUNT,
  TENABLE_ITEM_COUNT,
  parseYouTubeUrl,
} from '../../types/game'
import type {
  BeatColor,
  EditableQuestionType,
  MultipleChoiceTileDraft,
  SimpleTileDraft,
  StepByStepTileDraft,
  TenableTileDraft,
} from '../../types/game'
import { parseNumericInput } from '../../utils/parseNumber'

/**
 * Høyere/Lavere rows keep their number as a *string* while editing so the user
 * can clear the field or type a partial number. Converted in `toPayload`.
 */
export interface HigherLowerEditorItem {
  label: string
  numericValue: string
  /** Optional picture shown on the panel when the question is played. */
  image?: string
}

export interface HigherLowerEditorTile {
  type: 'higherLower'
  metric: string
  items: HigherLowerEditorItem[]
}

/** Steg for steg while editing: the title is always a string, cleared on save. */
export interface StepByStepEditorTile extends StepByStepTileDraft {
  title: string
}

/** A tile the author has not picked a type for yet. */
interface UntypedTileDraft {
  type: null
}

/**
 * Beat for Beat keeps the lyric line as raw text and the clip as a pasted URL
 * while editing — the words and the video id are derived in `toPayload`, the same
 * way a Høyere/Lavere row keeps its number as a string until then.
 */
export interface BeatForBeatEditorTile {
  type: 'beatForBeat'
  line: string
  /** One entry per word of `line`, kept in sync by `syncColors`. */
  colors: BeatColor[]
  songTitle: string
  artist: string
  youtubeUrl: string
}

/** The types that are edited in the modal rather than inline. */
export type RichTileDraft =
  | TenableTileDraft
  | StepByStepEditorTile
  | MultipleChoiceTileDraft
  | HigherLowerEditorTile
  | BeatForBeatEditorTile

/** Editor-local tile union. Mirrors the wire union plus an untyped state. */
export type TileDraft = UntypedTileDraft | SimpleTileDraft | RichTileDraft

/** Field length caps, re-exported from the shared source of truth the server uses. */
export const TEXT_MAX = MAX_TILE_TEXT
export const MC_OPTION_MAX = MAX_OPTION_TEXT
export const HL_LABEL_MAX = MAX_LABEL_TEXT
export const BFB_LABEL_MAX = MAX_LABEL_TEXT
/** Cap on the raw line, sized so it can never split into more than BFB_MAX_WORDS words. */
export const BFB_LINE_MAX = BFB_MAX_WORDS * (MAX_WORD_TEXT + 1)

/** The words of a lyric line, one box per entry. Collapses any run of whitespace. */
export function splitLyricWords(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean)
}

/**
 * Keeps the colour array the same length as the words.
 *
 * Colours already chosen keep their position, so fixing a typo further along the
 * line doesn't repaint the boxes the author already set. New positions alternate
 * blue/red, which gives an author who never touches a chip a mixed line rather
 * than a solid-blue one.
 */
export function syncColors(words: string[], previous: BeatColor[]): BeatColor[] {
  return words.map((_, i) => previous[i] ?? (i % 2 === 0 ? 'blue' : 'red'))
}

/**
 * Accepts Norwegian comma decimals; returns null when not a finite number.
 * The implementation moved to src/utils/parseNumber.ts when the tiebreaker's
 * phone input started sharing it — see the note there on bundle boundaries.
 */
export const parseHlNumber = parseNumericInput

/** Norwegian labels for the per-tile type selector. */
export const TYPE_LABELS: Record<EditableQuestionType, string> = {
  simple: 'Vanlig',
  tenable: 'Topp 10',
  multipleChoice: 'Flervalg',
  higherLower: 'Høyere/Lavere',
  beatForBeat: 'Beat for Beat',
  stepByStep: 'Steg for steg',
}

/** Builds a fresh, empty tile of the given type. */
export function makeEmptyTile(type: EditableQuestionType): TileDraft {
  switch (type) {
    case 'simple':
      return { type: 'simple', question: '', answer: '' }
    case 'tenable':
      return { type: 'tenable', prompt: '', items: Array.from({ length: TENABLE_ITEM_COUNT }, () => '') }
    case 'multipleChoice':
      return {
        type: 'multipleChoice',
        question: '',
        options: Array.from({ length: MC_OPTION_COUNT }, () => '') as [string, string, string, string],
        correctIndex: 0,
      }
    case 'higherLower':
      return {
        type: 'higherLower',
        metric: '',
        items: Array.from({ length: HL_MIN_ITEMS }, () => ({ label: '', numericValue: '' })),
      }
    case 'beatForBeat':
      return { type: 'beatForBeat', line: '', colors: [], songTitle: '', artist: '', youtubeUrl: '' }
    case 'stepByStep':
      return {
        type: 'stepByStep',
        title: '',
        steps: Array.from({ length: STEP_COUNT }, () => ({ question: '', answer: '' })),
      }
  }
}

/**
 * Returns a copy of `source` with an optional field set, or with the key removed
 * entirely when `value` is undefined.
 *
 * Deleting rather than storing an explicit `undefined` matters because the
 * editor's unsaved-changes guard compares `JSON.stringify(draft)` snapshots: a
 * key holding `undefined` disappears from the JSON anyway, but leaving it in the
 * object makes every other shape comparison subtly inconsistent.
 */
export function withOptionalField<T extends object, K extends keyof T>(
  source: T,
  field: K,
  value: T[K] | undefined,
): T {
  const next: T = { ...source }
  if (value === undefined) delete (next as Record<K, unknown>)[field]
  else next[field] = value
  return next
}

/**
 * True when either optional picture is set. An uploaded image counts as author
 * content: without this a tile holding only a photo would read as empty and be
 * saved as a blank tile, throwing the upload away.
 */
function hasTileImage(tile: { questionImage?: string; answerImage?: string }): boolean {
  return Boolean(tile.questionImage) || Boolean(tile.answerImage)
}

/** True when the tile carries no author-entered content at all. */
export function tileIsEmpty(tile: TileDraft): boolean {
  switch (tile.type) {
    case null:
      return true
    case 'simple':
      return !tile.question.trim() && !tile.answer.trim() && !hasTileImage(tile)
    case 'tenable':
      return !tile.prompt.trim() && tile.items.every(i => !i.trim())
    case 'multipleChoice':
      return !tile.question.trim() && tile.options.every(o => !o.trim()) && !hasTileImage(tile)
    case 'higherLower':
      return (
        !tile.metric.trim() &&
        tile.items.every(i => !i.label.trim() && !i.numericValue.trim() && !i.image)
      )
    case 'beatForBeat':
      return (
        !tile.line.trim() && !tile.songTitle.trim() && !tile.artist.trim() && !tile.youtubeUrl.trim()
      )
    case 'stepByStep':
      return !tile.title.trim() && tile.steps.every(s => !s.question.trim() && !s.answer.trim())
  }
}

/** True when the tile is complete enough to count towards "x av 25 ruter". */
export function tileIsFilled(tile: TileDraft): boolean {
  switch (tile.type) {
    case null:
      return false
    case 'simple':
      return Boolean(tile.question.trim()) && Boolean(tile.answer.trim())
    case 'tenable':
      return Boolean(tile.prompt.trim()) && tile.items.every(i => Boolean(i.trim()))
    case 'multipleChoice':
      return Boolean(tile.question.trim()) && tile.options.every(o => Boolean(o.trim()))
    case 'higherLower':
      return (
        Boolean(tile.metric.trim()) &&
        tile.items.length >= HL_MIN_ITEMS &&
        tile.items.every(i => Boolean(i.label.trim()) && parseHlNumber(i.numericValue) !== null)
      )
    case 'beatForBeat': {
      const words = splitLyricWords(tile.line)
      if (words.length === 0 || words.length > BFB_MAX_WORDS) return false
      // A blank link is fine — the clip is optional. A typo'd one is not.
      return !tile.youtubeUrl.trim() || parseYouTubeUrl(tile.youtubeUrl) !== null
    }
    case 'stepByStep':
      return tile.steps.every(s => Boolean(s.question.trim()) && Boolean(s.answer.trim()))
  }
}
