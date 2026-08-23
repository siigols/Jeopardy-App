import type { BoardDraft, BoardTileDraft, SimpleQuestion } from '../src/types/game.js'
import {
  BOARD_CATEGORY_COUNT,
  BOARD_TILE_COUNT,
  HL_MAX_ITEMS,
  HL_MIN_ITEMS,
  MAX_LABEL_TEXT,
  MAX_OPTION_TEXT,
  MAX_TILE_TEXT,
  MC_OPTION_COUNT,
  TENABLE_ITEM_COUNT,
} from '../src/types/game.js'
import { getBoardTheme } from '../src/data/boardThemes.js'

const MAX_TITLE = 100
const MAX_DESCRIPTION = 300
const MAX_CATEGORY_NAME = 60

const TILE_TYPES = ['simple', 'tenable', 'multipleChoice', 'higherLower'] as const

type TileType = (typeof TILE_TYPES)[number]
type RichTileType = Exclude<TileType, 'simple'>

/**
 * Largest `items` array each rich type can legally carry. Used to short-circuit
 * the blank-tile scan so oversized arrays are never walked. `multipleChoice`
 * ignores `items`, so it keeps the largest bound any type uses.
 */
const MAX_ITEMS_BY_TYPE: Record<RichTileType, number> = {
  tenable: TENABLE_ITEM_COUNT,
  multipleChoice: Math.max(TENABLE_ITEM_COUNT, HL_MAX_ITEMS),
  higherLower: HL_MAX_ITEMS,
}

/** Same idea for `options`, which only `multipleChoice` actually uses. */
const MAX_OPTIONS_BY_TYPE: Record<RichTileType, number> = {
  tenable: TENABLE_ITEM_COUNT,
  multipleChoice: MC_OPTION_COUNT,
  higherLower: TENABLE_ITEM_COUNT,
}

export type ValidationResult =
  | { ok: true; draft: BoardDraft }
  | { ok: false; error: string }

function fail(error: string): ValidationResult {
  return { ok: false, error }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A blank string for anything that isn't a non-empty string. */
function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * True when a rich tile carries no author content at all. Such tiles come from
 * the editor when a type was picked but nothing was filled in, and are stored as
 * blank `simple` tiles rather than rejected.
 */
function richTileIsBlank(tile: Record<string, unknown>, type: RichTileType): boolean {
  const texts = [tile.prompt, tile.question, tile.metric, tile.answer]
  if (texts.some(value => asText(value).length > 0)) return false
  // Bail out before scanning: an over-long array can never be a valid blank tile,
  // so treat it as non-blank. The tile then falls through to strict validation,
  // which reports whichever field fails first.
  // This keeps a hostile 100000-entry array from being walked at all.
  const items: unknown = tile.items
  if (Array.isArray(items)) {
    if (items.length > MAX_ITEMS_BY_TYPE[type]) return false
    if (items.some(item => itemHasContent(item))) return false
  }
  const options: unknown = tile.options
  if (Array.isArray(options)) {
    if (options.length > MAX_OPTIONS_BY_TYPE[type]) return false
    if (options.some(option => asText(option).length > 0)) return false
  }
  return true
}

function itemHasContent(item: unknown): boolean {
  if (typeof item === 'string') return item.trim().length > 0
  if (!isPlainObject(item)) return item !== undefined && item !== null
  return asText(item.label).length > 0 || (item.numericValue !== undefined && item.numericValue !== null)
}

/**
 * A fresh blank tile on every call: the result is handed to callers that may
 * mutate it, so a shared singleton would leak edits across requests.
 */
function blankSimpleTile(): BoardTileDraft {
  return { type: 'simple', question: '', answer: '' }
}

/**
 * Validates a fixed-length array of non-empty, length-capped strings.
 * Shared by the tenable-items and multiple-choice-options checks.
 */
function validateStringArray(
  raw: unknown,
  options: { tileLabel: string; field: string; entryLabel: string; count: number; maxLength: number },
): string[] | string {
  const { tileLabel, field, entryLabel, count, maxLength } = options
  if (!Array.isArray(raw)) {
    return `${tileLabel} ${field} must be an array`
  }
  if (raw.length !== count) {
    return `${tileLabel} must contain exactly ${count} ${field}`
  }
  const result: string[] = []
  for (let i = 0; i < raw.length; i++) {
    const value: unknown = raw[i]
    if (typeof value !== 'string') {
      return `${tileLabel} ${entryLabel} ${i + 1} must be a string`
    }
    const entry = value.trim()
    if (entry.length === 0) {
      return `${tileLabel} ${entryLabel} ${i + 1} must not be empty`
    }
    if (entry.length > maxLength) {
      return `${tileLabel} ${entryLabel} ${i + 1} must be at most ${maxLength} characters`
    }
    result.push(entry)
  }
  return result
}

/** Validates one tile. Returns the parsed tile, or an error message string. */
function validateTile(rawTile: Record<string, unknown>, tileLabel: string): BoardTileDraft | string {
  const rawType: unknown = rawTile.type
  const type = rawType === undefined || rawType === null ? 'simple' : rawType
  if (typeof type !== 'string' || !(TILE_TYPES as readonly string[]).includes(type)) {
    return `${tileLabel} type must be one of ${TILE_TYPES.join(', ')}`
  }
  const tileType = type as TileType

  if (tileType !== 'simple' && richTileIsBlank(rawTile, tileType)) {
    return blankSimpleTile()
  }

  if (tileType === 'simple') {
    // Blank strings are allowed on purpose: partial/draft boards are supported.
    if (typeof rawTile.question !== 'string') {
      return `${tileLabel} question must be a string`
    }
    if (typeof rawTile.answer !== 'string') {
      return `${tileLabel} answer must be a string`
    }
    const question = rawTile.question.trim()
    const answer = rawTile.answer.trim()
    if (question.length > MAX_TILE_TEXT) {
      return `${tileLabel} question must be at most ${MAX_TILE_TEXT} characters`
    }
    if (answer.length > MAX_TILE_TEXT) {
      return `${tileLabel} answer must be at most ${MAX_TILE_TEXT} characters`
    }
    return { type: 'simple', question, answer }
  }

  if (tileType === 'tenable') {
    const prompt = asText(rawTile.prompt)
    if (prompt.length === 0) {
      return `${tileLabel} prompt must not be empty`
    }
    if (prompt.length > MAX_TILE_TEXT) {
      return `${tileLabel} prompt must be at most ${MAX_TILE_TEXT} characters`
    }
    const items = validateStringArray(rawTile.items, {
      tileLabel,
      field: 'items',
      entryLabel: 'item',
      count: TENABLE_ITEM_COUNT,
      maxLength: MAX_TILE_TEXT,
    })
    if (typeof items === 'string') {
      return items
    }
    return { type: 'tenable', prompt, items }
  }

  if (tileType === 'multipleChoice') {
    const question = asText(rawTile.question)
    if (question.length === 0) {
      return `${tileLabel} question must not be empty`
    }
    if (question.length > MAX_TILE_TEXT) {
      return `${tileLabel} question must be at most ${MAX_TILE_TEXT} characters`
    }
    const options = validateStringArray(rawTile.options, {
      tileLabel,
      field: 'options',
      entryLabel: 'option',
      count: MC_OPTION_COUNT,
      maxLength: MAX_OPTION_TEXT,
    })
    if (typeof options === 'string') {
      return options
    }
    const correctIndex: unknown = rawTile.correctIndex
    if (
      typeof correctIndex !== 'number' ||
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex >= MC_OPTION_COUNT
    ) {
      return `${tileLabel} correctIndex must be an integer between 0 and ${MC_OPTION_COUNT - 1}`
    }
    return {
      type: 'multipleChoice',
      question,
      options: options as [string, string, string, string],
      correctIndex,
    }
  }

  if (tileType === 'higherLower') {
    const metric = asText(rawTile.metric)
    if (metric.length === 0) {
      return `${tileLabel} metric must not be empty`
    }
    if (metric.length > MAX_TILE_TEXT) {
      return `${tileLabel} metric must be at most ${MAX_TILE_TEXT} characters`
    }
    if (!Array.isArray(rawTile.items)) {
      return `${tileLabel} items must be an array`
    }
    if (rawTile.items.length < HL_MIN_ITEMS || rawTile.items.length > HL_MAX_ITEMS) {
      return `${tileLabel} must contain between ${HL_MIN_ITEMS} and ${HL_MAX_ITEMS} items`
    }
    const hlItems: { label: string; numericValue: number }[] = []
    for (let i = 0; i < rawTile.items.length; i++) {
      const raw: unknown = rawTile.items[i]
      if (!isPlainObject(raw)) {
        return `${tileLabel} item ${i + 1} must be an object`
      }
      const label = asText(raw.label)
      if (label.length === 0) {
        return `${tileLabel} item ${i + 1} label must not be empty`
      }
      if (label.length > MAX_LABEL_TEXT) {
        return `${tileLabel} item ${i + 1} label must be at most ${MAX_LABEL_TEXT} characters`
      }
      const numericValue: unknown = raw.numericValue
      if (typeof numericValue !== 'number' || !Number.isFinite(numericValue)) {
        return `${tileLabel} item ${i + 1} numericValue must be a finite number`
      }
      hlItems.push({ label, numericValue })
    }
    return { type: 'higherLower', metric, items: hlItems }
  }

  // Exhaustiveness guard: adding a tile type without a branch above is a compile
  // error here rather than a silent misroute into the wrong validator.
  const unreachable: never = tileType
  return `${tileLabel} type must be one of ${TILE_TYPES.join(', ')}: ${String(unreachable)}`
}

/**
 * Parses an untrusted request body into a BoardDraft.
 * Never throws on JSON-parsed input; returns the first problem found as a
 * human-readable message.
 */
export function validateBoardDraft(input: unknown): ValidationResult {
  if (!isPlainObject(input)) {
    return fail('body must be a JSON object')
  }

  if (typeof input.title !== 'string') {
    return fail('title is required and must be a string')
  }
  const title = input.title.trim()
  if (title.length === 0) {
    return fail('title must not be empty')
  }
  if (title.length > MAX_TITLE) {
    return fail(`title must be at most ${MAX_TITLE} characters`)
  }

  let description: string | undefined
  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== 'string') {
      return fail('description must be a string')
    }
    const trimmed = input.description.trim()
    if (trimmed.length > MAX_DESCRIPTION) {
      return fail(`description must be at most ${MAX_DESCRIPTION} characters`)
    }
    description = trimmed.length > 0 ? trimmed : undefined
  }

  let themeId: string | undefined
  if (input.themeId !== undefined && input.themeId !== null) {
    if (typeof input.themeId !== 'string') {
      return fail('themeId must be a string')
    }
    if (getBoardTheme(input.themeId) === undefined) {
      return fail('unknown themeId')
    }
    themeId = input.themeId
  }

  if (!Array.isArray(input.categories)) {
    return fail('categories must be an array')
  }
  if (input.categories.length !== BOARD_CATEGORY_COUNT) {
    return fail(`categories must contain exactly ${BOARD_CATEGORY_COUNT} categories`)
  }

  const categories: BoardDraft['categories'] = []

  for (let c = 0; c < input.categories.length; c++) {
    const raw: unknown = input.categories[c]
    const label = `category ${c + 1}`
    if (!isPlainObject(raw)) {
      return fail(`${label} must be an object`)
    }
    if (typeof raw.name !== 'string') {
      return fail(`${label} name is required and must be a string`)
    }
    const name = raw.name.trim()
    if (name.length === 0) {
      return fail(`${label} name must not be empty`)
    }
    if (name.length > MAX_CATEGORY_NAME) {
      return fail(`${label} name must be at most ${MAX_CATEGORY_NAME} characters`)
    }
    if (!Array.isArray(raw.tiles)) {
      return fail(`${label} tiles must be an array`)
    }
    if (raw.tiles.length !== BOARD_TILE_COUNT) {
      return fail(`${label} must contain exactly ${BOARD_TILE_COUNT} tiles`)
    }

    const tiles: BoardDraft['categories'][number]['tiles'] = []
    for (let t = 0; t < raw.tiles.length; t++) {
      const rawTile: unknown = raw.tiles[t]
      const tileLabel = `${label} tile ${t + 1}`
      if (!isPlainObject(rawTile)) {
        return fail(`${tileLabel} must be an object`)
      }
      const tile = validateTile(rawTile, tileLabel)
      if (typeof tile === 'string') {
        return fail(tile)
      }
      tiles.push(tile)
    }

    categories.push({ name, tiles })
  }

  let tiebreaker: SimpleQuestion | undefined
  if (input.tiebreaker !== undefined && input.tiebreaker !== null) {
    const raw: unknown = input.tiebreaker
    if (!isPlainObject(raw)) {
      return fail('tiebreaker must be an object')
    }
    if (raw.type !== 'simple') {
      return fail("tiebreaker type must be 'simple'")
    }
    if (typeof raw.question !== 'string' || raw.question.trim().length === 0) {
      return fail('tiebreaker question must not be empty')
    }
    if (typeof raw.answer !== 'string' || raw.answer.trim().length === 0) {
      return fail('tiebreaker answer must not be empty')
    }
    const question = raw.question.trim()
    const answer = raw.answer.trim()
    if (question.length > MAX_TILE_TEXT) {
      return fail(`tiebreaker question must be at most ${MAX_TILE_TEXT} characters`)
    }
    if (answer.length > MAX_TILE_TEXT) {
      return fail(`tiebreaker answer must be at most ${MAX_TILE_TEXT} characters`)
    }
    tiebreaker = { type: 'simple', question, answer }
  }

  return { ok: true, draft: { title, description, themeId, tiebreaker, categories } }
}
