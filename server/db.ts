import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import type { Game, BoardSummary, LoadedGame, BoardDraft, GameTheme, QuestionContent } from '../src/types/game.js'
import {
  BOARD_TILE_POINTS,
  EDITABLE_QUESTION_TYPES,
  HL_MAX_ITEMS,
  HL_MIN_ITEMS,
  MC_OPTION_COUNT,
  TENABLE_ITEM_COUNT,
} from '../src/types/game.js'
import { DEFAULT_BOARD_THEME_ID, getBoardTheme } from '../src/data/boardThemes.js'
import sampleGame from '../src/data/sampleGame.js'
import footballWorldCup from '../src/data/footballWorldCup.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const db = new Database(resolve(__dirname, 'jeopardy.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`)

// Idempotent migration: SQLite has no ADD COLUMN IF NOT EXISTS.
const boardColumns = db.prepare('PRAGMA table_info(boards)').all() as { name: string }[]
if (!boardColumns.some(column => column.name === 'updated_at')) {
  db.exec('ALTER TABLE boards ADD COLUMN updated_at TEXT')
}

const { count } = db.prepare('SELECT COUNT(*) as count FROM boards').get() as { count: number }

if (count === 0) {
  const insert = db.prepare(
    'INSERT INTO boards (title, description, data, created_at) VALUES (?, ?, ?, ?)'
  )
  const seed = db.transaction((games: Game[]) => {
    for (const game of games) {
      insert.run(game.title, game.description ?? null, JSON.stringify(game), new Date().toISOString())
    }
  })
  seed([sampleGame, footballWorldCup])
}

export type { BoardSummary }

/**
 * Boards are only editable in the board editor if every tile uses one of the
 * question types the editor can author and round-trip. Image-backed content (the
 * football board) would be silently destroyed, so those boards stay locked.
 *
 * Arity is checked here too: a board the validator would reject must not be
 * offered for editing, or saving it back would fail with a confusing 400.
 */
export function boardIsEditable(game: Game): boolean {
  // Defensive: rows can hold valid JSON that isn't a Game. `every` on a missing or
  // empty array would be vacuously true and mark junk boards as editable.
  if (!Array.isArray(game?.categories) || game.categories.length === 0) return false
  return game.categories.every(category => {
    if (!Array.isArray(category?.tiles) || category.tiles.length === 0) return false
    return category.tiles.every(tile => {
      const content = tile?.content
      if (!content) return false
      if (!(EDITABLE_QUESTION_TYPES as readonly string[]).includes(content.type)) return false
      if (content.type === 'tenable') {
        return Array.isArray(content.items) && content.items.length === TENABLE_ITEM_COUNT
      }
      if (content.type === 'multipleChoice') {
        if (!Array.isArray(content.options) || content.options.length !== MC_OPTION_COUNT) return false
        const index: unknown = content.correctIndex
        return typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < MC_OPTION_COUNT
      }
      // Image-backed higher/lower tiles can't be round-tripped: the editor has no
      // way to author or preserve images.
      if (content.type === 'higherLower') {
        if (!Array.isArray(content.items)) return false
        if (content.items.length < HL_MIN_ITEMS || content.items.length > HL_MAX_ITEMS) return false
        return content.items.every(item => !item?.image)
      }
      return true
    })
  })
}

/**
 * Rows hold arbitrary JSON, so parsed data may be valid JSON that isn't a Game.
 * Checks the structure every reader depends on: a non-empty `categories` array of
 * objects each carrying a `tiles` array.
 */
function isValidGame(game: unknown): game is Game {
  if (typeof game !== 'object' || game === null) return false
  const categories = (game as { categories?: unknown }).categories
  if (!Array.isArray(categories) || categories.length === 0) return false
  return categories.every(
    category =>
      typeof category === 'object' &&
      category !== null &&
      Array.isArray((category as { tiles?: unknown }).tiles),
  )
}

/** Display strings for higher/lower values are derived, never authored. */
const numberFormat = new Intl.NumberFormat('nb-NO')

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
      }
    case 'higherLower':
      return {
        type: 'higherLower',
        metric: tile.metric,
        items: tile.items.map(item => ({
          label: item.label,
          value: numberFormat.format(item.numericValue),
          numericValue: item.numericValue,
        })),
      }
    case 'simple':
      return { type: 'simple', question: tile.question, answer: tile.answer }
  }

  // Exhaustiveness guard: adding a draft tile type without a branch above is a
  // compile error here rather than a silent fallthrough into `simple`.
  const unreachable: never = tile
  throw new Error(`Unsupported tile type: ${JSON.stringify(unreachable)}`)
}

/**
 * Shared draft -> Game mapping used by both createBoard and updateBoard.
 * `existingTheme` is the theme already stored on the board, used when the draft
 * names no preset. `fallbackTheme` applies only when neither is present.
 */
function draftToGame(draft: BoardDraft, existingTheme?: GameTheme, fallbackTheme?: GameTheme): Game {
  const preset = draft.themeId !== undefined ? getBoardTheme(draft.themeId) : undefined
  const base = preset ?? existingTheme ?? fallbackTheme
  // Always a shallow copy: BOARD_THEMES presets are shared module-level objects
  // and must never be handed out where a consumer could mutate them.
  // Decorations aren't authorable, so carry any existing ones across a theme swap.
  const theme: GameTheme | undefined =
    base === undefined
      ? undefined
      : existingTheme?.decorations !== undefined
        ? { ...base, decorations: existingTheme.decorations }
        : { ...base }

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

interface BoardRow {
  id: number
  title: string
  description: string | null
  data: string
}

export function getAllBoards(): BoardSummary[] {
  const rows = db.prepare('SELECT id, title, description, data FROM boards').all() as BoardRow[]
  return rows.flatMap(row => {
    try {
      const game = JSON.parse(row.data) as Game
      if (!isValidGame(game)) {
        console.error(`Skipping board ${row.id} ("${row.title}"): invalid board structure`)
        return []
      }
      return [{
        id: row.id,
        title: row.title,
        description: row.description ?? undefined,
        categories: game.categories.map(c => ({ name: c.name })),
        theme: game.theme,
        editable: boardIsEditable(game),
      }]
    } catch {
      console.error(`Skipping board ${row.id} ("${row.title}"): malformed board data`)
      return []
    }
  })
}

export function getBoard(id: number): LoadedGame | null {
  const row = db.prepare('SELECT id, title, data FROM boards WHERE id = ?').get(id) as
    | { id: number; title: string; data: string }
    | undefined
  if (!row) return null
  let game: Game
  try {
    game = JSON.parse(row.data) as Game
  } catch {
    throw new Error(`Malformed board data for board ${row.id} ("${row.title}")`)
  }
  // A structurally-invalid row would otherwise be served as a 200 with
  // `categories: undefined`; treat it as missing so callers get a 404.
  if (!isValidGame(game)) return null
  return { ...game, id: row.id, editable: boardIsEditable(game) }
}

export function createBoard(draft: BoardDraft): LoadedGame {
  // New boards always carry a theme, so the board list never renders an unstyled card.
  const game = draftToGame(draft, undefined, getBoardTheme(DEFAULT_BOARD_THEME_ID))
  const now = new Date().toISOString()

  const info = db
    .prepare(
      'INSERT INTO boards (title, description, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(game.title, game.description ?? null, JSON.stringify(game), now, now)

  return { ...game, id: Number(info.lastInsertRowid), editable: boardIsEditable(game) }
}

/**
 * Replaces a board's content from an editor draft. A `draft.themeId` wins; the
 * existing stored theme is only the fallback, so board colours survive an edit
 * that names no preset. Returns null if the board no longer exists.
 */
export function updateBoard(id: number, draft: BoardDraft): LoadedGame | null {
  const row = db.prepare('SELECT id, title, data FROM boards WHERE id = ?').get(id) as
    | { id: number; title: string; data: string }
    | undefined
  if (!row) return null

  let existing: Game
  try {
    existing = JSON.parse(row.data) as Game
  } catch {
    throw new Error(`Malformed board data for board ${row.id} ("${row.title}")`)
  }

  const game = draftToGame(draft, existing.theme)

  db.prepare('UPDATE boards SET title = ?, description = ?, data = ?, updated_at = ? WHERE id = ?')
    .run(game.title, game.description ?? null, JSON.stringify(game), new Date().toISOString(), id)

  return { ...game, id, editable: boardIsEditable(game) }
}

export default db
