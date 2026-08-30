import { createClient } from '@libsql/client'
import type { Client, Row } from '@libsql/client'
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

/**
 * Boards live in a libSQL database. In production that is a hosted Turso database
 * reached over `libsql://`, which is the whole point: the app is deployed on a host
 * with an ephemeral filesystem, so a local file would be wiped on every restart and
 * every board anyone created would vanish with it.
 *
 * In development the same driver reads a plain local file, so there is one code path
 * and no network dependency while working offline.
 */
function databaseUrl(): string {
  const configured = process.env.TURSO_DATABASE_URL
  if (configured) return configured

  // Falling back to a local file in production would "work" — right up until the
  // host recycles the container and silently deletes every board. Fail loudly instead.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'TURSO_DATABASE_URL is not set. Refusing to start in production with a local ' +
        'file database, because it would be deleted on the next restart.',
    )
  }

  const localFile = `file:${resolve(__dirname, 'jeopardy.db')}`
  console.warn(`TURSO_DATABASE_URL is not set — using local file database at ${localFile}`)
  return localFile
}

let client: Client | undefined

/**
 * The client is created lazily rather than at import time so that a misconfigured
 * environment surfaces as a normal rejected promise through the caller's error
 * handling, instead of a bare stack trace thrown during module evaluation.
 */
function db(): Client {
  if (!client) {
    client = createClient({
      url: databaseUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  }
  return client
}

/**
 * Creates the schema, applies pending migrations and seeds an empty database.
 * Must be awaited before the server starts accepting requests — the previous
 * better-sqlite3 version could do this synchronously at import time, but every
 * hosted database is async, so it now has to be an explicit startup step.
 */
export async function initDb(): Promise<void> {
  await db().execute(`
    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)

  // Idempotent migration: SQLite has no ADD COLUMN IF NOT EXISTS.
  const boardColumns = await db().execute('PRAGMA table_info(boards)')
  if (!boardColumns.rows.some(column => column.name === 'updated_at')) {
    await db().execute('ALTER TABLE boards ADD COLUMN updated_at TEXT')
  }

  const countResult = await db().execute('SELECT COUNT(*) as count FROM boards')
  const count = Number(countResult.rows[0]?.count ?? 0)

  if (count === 0) {
    const now = new Date().toISOString()
    await db().batch(
      [sampleGame, footballWorldCup].map(game => ({
        sql: 'INSERT INTO boards (title, description, data, created_at) VALUES (?, ?, ?, ?)',
        args: [game.title, game.description ?? null, JSON.stringify(game), now],
      })),
      'write',
    )
  }
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

interface BoardRow {
  id: number
  title: string
  description: string | null
  data: string
}

/**
 * libSQL hands back loosely-typed rows, so a column can be null or a number where
 * a string is expected. Narrowing here means a junk row is reported as a skippable
 * bad board rather than exploding inside JSON.parse with an opaque message.
 */
function toBoardRow(row: Row): BoardRow | null {
  const id = row.id
  const title = row.title
  const description = row.description
  const data = row.data
  if (typeof id !== 'number' && typeof id !== 'bigint') return null
  if (typeof title !== 'string') return null
  if (typeof data !== 'string') return null
  return {
    id: Number(id),
    title,
    description: typeof description === 'string' ? description : null,
    data,
  }
}

export async function getAllBoards(): Promise<BoardSummary[]> {
  const result = await db().execute('SELECT id, title, description, data FROM boards')
  return result.rows.flatMap(rawRow => {
    const row = toBoardRow(rawRow)
    if (!row) {
      console.error('Skipping board: row is missing required columns')
      return []
    }
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

export async function getBoard(id: number): Promise<LoadedGame | null> {
  const result = await db().execute({
    sql: 'SELECT id, title, description, data FROM boards WHERE id = ?',
    args: [id],
  })
  const rawRow = result.rows[0]
  if (!rawRow) return null
  const row = toBoardRow(rawRow)
  // A row missing required columns can't be repaired here; treat it as missing so
  // callers get a 404 rather than a 500 on every read.
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

export async function createBoard(draft: BoardDraft): Promise<LoadedGame> {
  // New boards always carry a theme, so the board list never renders an unstyled card.
  const game = draftToGame(draft, undefined, getBoardTheme(DEFAULT_BOARD_THEME_ID))
  const now = new Date().toISOString()

  const result = await db().execute({
    sql: 'INSERT INTO boards (title, description, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    args: [game.title, game.description ?? null, JSON.stringify(game), now, now],
  })

  // Unlike better-sqlite3, libSQL types lastInsertRowid as possibly undefined.
  // Number(undefined) is NaN, which would hand back a board with an unusable id.
  if (result.lastInsertRowid === undefined) {
    throw new Error('Board insert returned no id')
  }

  return { ...game, id: Number(result.lastInsertRowid), editable: boardIsEditable(game) }
}

/**
 * Replaces a board's content from an editor draft. A `draft.themeId` wins; the
 * existing stored theme is only the fallback, so board colours survive an edit
 * that names no preset. Returns null if the board no longer exists.
 */
export async function updateBoard(id: number, draft: BoardDraft): Promise<LoadedGame | null> {
  const result = await db().execute({
    sql: 'SELECT id, title, description, data FROM boards WHERE id = ?',
    args: [id],
  })
  const rawRow = result.rows[0]
  if (!rawRow) return null
  const row = toBoardRow(rawRow)
  if (!row) return null

  let existing: Game
  try {
    existing = JSON.parse(row.data) as Game
  } catch {
    throw new Error(`Malformed board data for board ${row.id} ("${row.title}")`)
  }

  const game = draftToGame(draft, existing.theme)

  await db().execute({
    sql: 'UPDATE boards SET title = ?, description = ?, data = ?, updated_at = ? WHERE id = ?',
    args: [game.title, game.description ?? null, JSON.stringify(game), new Date().toISOString(), id],
  })

  return { ...game, id, editable: boardIsEditable(game) }
}
