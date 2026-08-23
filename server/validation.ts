import type { BoardDraft, SimpleQuestion } from '../src/types/game.js'
import { BOARD_CATEGORY_COUNT, BOARD_TILE_COUNT } from '../src/types/game.js'

const MAX_TITLE = 100
const MAX_DESCRIPTION = 300
const MAX_CATEGORY_NAME = 60
const MAX_TILE_TEXT = 500

export type ValidationResult =
  | { ok: true; draft: BoardDraft }
  | { ok: false; error: string }

function fail(error: string): ValidationResult {
  return { ok: false, error }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Parses an untrusted request body into a BoardDraft.
 * Never throws; returns the first problem found as a human-readable message.
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
      // Blank strings are allowed on purpose: partial/draft boards are supported.
      if (typeof rawTile.question !== 'string') {
        return fail(`${tileLabel} question must be a string`)
      }
      if (typeof rawTile.answer !== 'string') {
        return fail(`${tileLabel} answer must be a string`)
      }
      const question = rawTile.question.trim()
      const answer = rawTile.answer.trim()
      if (question.length > MAX_TILE_TEXT) {
        return fail(`${tileLabel} question must be at most ${MAX_TILE_TEXT} characters`)
      }
      if (answer.length > MAX_TILE_TEXT) {
        return fail(`${tileLabel} answer must be at most ${MAX_TILE_TEXT} characters`)
      }
      tiles.push({ question, answer })
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

  return { ok: true, draft: { title, description, tiebreaker, categories } }
}
