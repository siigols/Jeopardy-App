import {
  HL_MIN_ITEMS,
  MAX_LABEL_TEXT,
  MAX_OPTION_TEXT,
  MAX_TILE_TEXT,
  MC_OPTION_COUNT,
  TENABLE_ITEM_COUNT,
} from '../../types/game'
import type {
  EditableQuestionType,
  MultipleChoiceTileDraft,
  SimpleTileDraft,
  TenableTileDraft,
} from '../../types/game'

/**
 * Høyere/Lavere rows keep their number as a *string* while editing so the user
 * can clear the field or type a partial number. Converted in `toPayload`.
 */
export interface HigherLowerEditorItem {
  label: string
  numericValue: string
}

export interface HigherLowerEditorTile {
  type: 'higherLower'
  metric: string
  items: HigherLowerEditorItem[]
}

/** A tile the author has not picked a type for yet. */
interface UntypedTileDraft {
  type: null
}

/** The three types that are edited in the modal rather than inline. */
export type RichTileDraft = TenableTileDraft | MultipleChoiceTileDraft | HigherLowerEditorTile

/** Editor-local tile union. Mirrors the wire union plus an untyped state. */
export type TileDraft = UntypedTileDraft | SimpleTileDraft | RichTileDraft

/** Field length caps, re-exported from the shared source of truth the server uses. */
export const TEXT_MAX = MAX_TILE_TEXT
export const MC_OPTION_MAX = MAX_OPTION_TEXT
export const HL_LABEL_MAX = MAX_LABEL_TEXT

/**
 * Accepts Norwegian comma decimals; returns null when not a finite number.
 *
 * Spaces are stripped — plain, non-breaking (U+00A0) and narrow no-break
 * (U+202F) — so a value copied straight out of the `nb-NO` grouped preview
 * ("1 234") round-trips. Anything containing a character outside the numeric
 * alphabet is rejected up front, because `Number()` happily parses forms we
 * don't want here (e.g. '0x10' -> 16, 'Infinity' -> Infinity).
 */
export function parseHlNumber(raw: string): number | null {
  const stripped = raw.replace(/[\s\u00a0\u202f]/g, '')
  if (!stripped) return null
  if (!/^[0-9.,+\-eE]+$/.test(stripped)) return null
  const n = Number(stripped.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Norwegian labels for the per-tile type selector. */
export const TYPE_LABELS: Record<EditableQuestionType, string> = {
  simple: 'Vanlig',
  tenable: 'Topp 10',
  multipleChoice: 'Flervalg',
  higherLower: 'Høyere/Lavere',
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
  }
}

/** True when the tile carries no author-entered content at all. */
export function tileIsEmpty(tile: TileDraft): boolean {
  switch (tile.type) {
    case null:
      return true
    case 'simple':
      return !tile.question.trim() && !tile.answer.trim()
    case 'tenable':
      return !tile.prompt.trim() && tile.items.every(i => !i.trim())
    case 'multipleChoice':
      return !tile.question.trim() && tile.options.every(o => !o.trim())
    case 'higherLower':
      return !tile.metric.trim() && tile.items.every(i => !i.label.trim() && !i.numericValue.trim())
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
  }
}
