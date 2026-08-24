/**
 * One-off migration: copies boards from the local SQLite file into the hosted
 * Turso database.
 *
 * Run it once, manually, after creating the Turso database:
 *
 *   TURSO_DATABASE_URL='libsql://...' TURSO_AUTH_TOKEN='...' \
 *     npx tsx scripts/migrate-to-turso.ts
 *
 * The local file is opened read-only and is never modified or deleted.
 */
import Database from 'better-sqlite3'
import { createClient } from '@libsql/client'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { existsSync } from 'fs'
import sampleGame from '../src/data/sampleGame.js'
import footballWorldCup from '../src/data/footballWorldCup.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOCAL_DB_PATH = resolve(__dirname, '../server/jeopardy.db')

/** Titles inserted by the automatic seed, used to tell a fresh target apart from a used one. */
const SEED_TITLES = new Set([sampleGame.title, footballWorldCup.title])

interface LocalRow {
  id: number
  title: string
  description: string | null
  data: string
  created_at: string | null
  updated_at: string | null
}

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force')

  const url = process.env.TURSO_DATABASE_URL
  if (!url) {
    fail('TURSO_DATABASE_URL is not set. Point it at the Turso database you want to migrate into.')
  }
  // Without this guard, a shell that still has the dev `file:` URL exported would
  // silently "migrate" the local database into itself and duplicate every board.
  if (url.startsWith('file:')) {
    fail(
      `TURSO_DATABASE_URL points at a local file (${url}). This script migrates ` +
        'into a remote Turso database — pass the libsql:// URL instead.',
    )
  }

  if (!existsSync(LOCAL_DB_PATH)) {
    fail(`No local database found at ${LOCAL_DB_PATH} — nothing to migrate.`)
  }

  // --- Read the local boards -------------------------------------------------
  const local = new Database(LOCAL_DB_PATH, { readonly: true, fileMustExist: true })
  const columns = local.prepare('PRAGMA table_info(boards)').all() as { name: string }[]
  const hasUpdatedAt = columns.some(column => column.name === 'updated_at')

  const localRows = local
    .prepare(
      `SELECT id, title, description, data, created_at, ${hasUpdatedAt ? 'updated_at' : 'NULL as updated_at'}
       FROM boards ORDER BY id`,
    )
    .all() as LocalRow[]
  local.close()

  console.log(`Found ${localRows.length} board(s) in ${LOCAL_DB_PATH}`)
  if (localRows.length === 0) {
    console.log('Nothing to migrate.')
    return
  }

  // --- Prepare the target ----------------------------------------------------
  const remote = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })

  // Reuse the app's own schema setup so the table shape can never drift from it.
  const { initDb } = await import('../server/db.js')
  await initDb()

  const existing = await remote.execute('SELECT id, title FROM boards ORDER BY id')
  const existingTitles = existing.rows.map(row => String(row.title))

  const isPristineSeed =
    existingTitles.length > 0 && existingTitles.every(title => SEED_TITLES.has(title))

  if (existingTitles.length > 0 && !isPristineSeed && !force) {
    fail(
      `Target database already contains ${existingTitles.length} board(s) that are not just ` +
        'the automatic seed:\n  ' +
        existingTitles.map(t => `- ${t}`).join('\n  ') +
        '\n\nRefusing to run, because this would create duplicates. ' +
        'Re-run with --force if you are certain.',
    )
  }

  // initDb() seeds a fresh database with the two sample boards, but those same two
  // boards are also rows 1-2 of the local file. Drop the seeded copies so the
  // migration does not duplicate them.
  if (isPristineSeed) {
    await remote.execute('DELETE FROM boards')
    console.log(`Cleared ${existingTitles.length} auto-seeded board(s) from the target`)
  }

  // --- Copy ------------------------------------------------------------------
  // Ids are deliberately not preserved: nothing outside the database references a
  // board id permanently (the client keeps one only in sessionStorage, and already
  // handles it going missing), so letting AUTOINCREMENT reassign is simpler and
  // avoids collisions with the seeded rows.
  let migrated = 0
  for (const row of localRows) {
    const createdAt = row.created_at ?? new Date().toISOString()
    await remote.execute({
      sql: 'INSERT INTO boards (title, description, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      args: [row.title, row.description, row.data, createdAt, row.updated_at ?? createdAt],
    })
    migrated += 1
    console.log(`  ✓ ${row.title}`)
  }

  const finalCount = await remote.execute('SELECT COUNT(*) as count FROM boards')
  console.log(
    `\n✓ Migrated ${migrated} board(s). Target now holds ${Number(finalCount.rows[0]?.count ?? 0)}.\n` +
      `The local file at ${LOCAL_DB_PATH} was not modified.\n`,
  )
}

main().catch((err: unknown) => {
  console.error('\n✗ Migration failed:', err)
  process.exit(1)
})
