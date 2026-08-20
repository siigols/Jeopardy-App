import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import type { Game, GameTheme } from '../src/types/game.js'
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

export type BoardSummary = {
  id: number
  title: string
  description?: string
  categories: { name: string }[]
  theme?: GameTheme
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
    let game: Game
    try {
      game = JSON.parse(row.data) as Game
    } catch {
      console.error(`Skipping board ${row.id} ("${row.title}"): malformed board data`)
      return []
    }
    return [{
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      categories: game.categories.map(c => ({ name: c.name })),
      theme: game.theme,
    }]
  })
}

export function getBoard(id: number): (Game & { id: number }) | null {
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
  return { ...game, id: row.id }
}

export default db
