import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { existsSync } from 'fs'
import type { LoadedGame } from '../src/types/game.js'
import type { ServerToClientEvents, ClientToServerEvents } from '../src/types/socket-events.js'
import {
  createSession,
  getSession,
  openQuestion,
  closeQuestion,
  recordBuzz,
  resetBuzzes,
  startTiebreak,
  submitTiebreak,
  revealTiebreak,
  endTiebreak,
  tiebreakHostState,
  tiebreakPhoneState,
} from './session.js'
import {
  getAllBoards,
  getBoard,
  createBoard,
  updateBoard,
  copyBoard,
  getImage,
  putImage,
  initDb,
} from './db.js'
import { validateBoardDraft } from './validation.js'
import { requireEditCode } from './auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
const httpServer = createServer(app)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
})

app.use(express.json({ limit: '1mb' }))

// Behind a reverse proxy every request arrives from the proxy's address, so the
// edit-code rate limiter (which keys on req.ip) would put all clients in one
// bucket and lock everyone out after 10 failed guesses. Opt in via TRUST_PROXY,
// which accepts a hop count ('1'), 'true'/'false', 'loopback', or a
// comma-separated list of trusted IPs/CIDR ranges. Express only treats a real
// number as a hop count, so the string has to be coerced before it is set.
// Left off by default: trusting X-Forwarded-For without a proxy lets clients spoof it.
const rawTrustProxy = process.env.TRUST_PROXY
if (rawTrustProxy) {
  const hops = Number(rawTrustProxy)
  app.set(
    'trust proxy',
    Number.isInteger(hops) ? hops
    : rawTrustProxy === 'true' ? true
    : rawTrustProxy === 'false' ? false
    : rawTrustProxy,
  )
}

// API routes (must come before the static/catch-all handler)
// Every handler that touches the database is async and must catch its own
// rejections: an unhandled rejection in an Express 4 handler never reaches the
// error middleware, so the request would hang until the client times out.
app.get('/api/boards', async (_req, res, next) => {
  try {
    res.json(await getAllBoards())
  } catch (err) {
    next(err)
  }
})

/** Parses a positive-integer board id from a route param, or null if invalid. */
function parseBoardId(raw: string | string[]): number | null {
  if (typeof raw !== 'string') return null
  // Number() would happily accept '1e3' and '0x2'; require plain decimal digits.
  if (!/^[1-9]\d*$/.test(raw)) return null
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

app.get('/api/boards/:id', async (req, res, next) => {
  const id = parseBoardId(req.params.id)
  if (id === null) {
    return res.status(400).json({ error: 'Invalid board id' })
  }
  let board: LoadedGame | null
  try {
    board = await getBoard(id)
  } catch (err) {
    return next(err)
  }
  if (!board) {
    return res.status(404).json({ error: 'Board not found' })
  }
  res.json(board)
})

app.post('/api/verify-code', requireEditCode, (_req, res) => {
  res.json({ ok: true })
})

/**
 * Accepted upload formats, and the leading bytes that actually prove it.
 * The Content-Type header is attacker-controlled, so it only selects the parser
 * below; what is stored (and later served back with that same type) is decided
 * by sniffing the bytes.
 */
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Largest upload accepted. The editor downscales before sending, so this is a backstop. */
const MAX_IMAGE_BYTES = 600 * 1024

function sniffImageMime(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png'
  }
  // WebP is a RIFF container: 'RIFF' <4-byte size> 'WEBP'.
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP') {
    return 'image/webp'
  }
  return null
}

app.post(
  '/api/images',
  requireEditCode,
  express.raw({ type: [...IMAGE_MIME_TYPES], limit: MAX_IMAGE_BYTES }),
  async (req, res, next) => {
    // A body that didn't match one of the declared types never reaches the raw
    // parser, so req.body is left as an empty object rather than a Buffer.
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(415).json({ error: 'Bildet må være JPEG, PNG eller WebP' })
    }
    const mime = sniffImageMime(req.body)
    if (mime === null) {
      return res.status(415).json({ error: 'Bildet må være JPEG, PNG eller WebP' })
    }
    try {
      const id = await putImage(req.body, mime)
      res.status(201).json({ url: `/api/images/${id}` })
    } catch (err) {
      next(err)
    }
  },
)

app.get('/api/images/:id', async (req, res, next) => {
  const id: unknown = req.params.id
  // Ids are sha256 hex and nothing else — this also rules out any path the
  // router might otherwise hand through.
  if (typeof id !== 'string' || !/^[0-9a-f]{64}$/.test(id)) {
    return res.status(404).json({ error: 'Image not found' })
  }
  let image: Awaited<ReturnType<typeof getImage>>
  try {
    image = await getImage(id)
  } catch (err) {
    return next(err)
  }
  if (!image) {
    return res.status(404).json({ error: 'Image not found' })
  }
  // The id is the hash of the bytes, so the response for a given id can never
  // change and is safe to cache forever.
  res.setHeader('Content-Type', image.mime)
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.send(image.bytes)
})

app.post('/api/boards', requireEditCode, async (req, res, next) => {
  const result = validateBoardDraft(req.body)
  if (!result.ok) {
    return res.status(400).json({ error: result.error })
  }
  try {
    res.status(201).json(await createBoard(result.draft))
  } catch (err) {
    next(err)
  }
})

app.put('/api/boards/:id', requireEditCode, async (req, res, next) => {
  const id = parseBoardId(req.params.id)
  if (id === null) {
    return res.status(400).json({ error: 'Invalid board id' })
  }

  let existing: LoadedGame | null
  try {
    existing = await getBoard(id)
  } catch (err) {
    return next(err)
  }
  if (!existing) {
    return res.status(404).json({ error: 'Board not found' })
  }
  // Rich question types can't be represented in the editor's draft shape, so
  // saving over them would silently destroy content.
  if (!existing.editable) {
    return res.status(409).json({ error: 'Denne tavla kan ikke redigeres her' })
  }

  const result = validateBoardDraft(req.body)
  if (!result.ok) {
    return res.status(400).json({ error: result.error })
  }

  let updated: LoadedGame | null
  try {
    updated = await updateBoard(id, result.draft)
  } catch (err) {
    return next(err)
  }
  if (!updated) {
    return res.status(404).json({ error: 'Board not found' })
  }
  res.json(updated)
})

app.post('/api/boards/:id/copy', requireEditCode, async (req, res, next) => {
  const id = parseBoardId(req.params.id)
  if (id === null) {
    return res.status(400).json({ error: 'Invalid board id' })
  }

  let existing: LoadedGame | null
  try {
    existing = await getBoard(id)
  } catch (err) {
    return next(err)
  }
  if (!existing) {
    return res.status(404).json({ error: 'Board not found' })
  }
  // The copy is only worth having if it can then be edited, and the board list
  // only offers the action on editable boards. Same guard as the PUT above.
  if (!existing.editable) {
    return res.status(409).json({ error: 'Denne tavla kan ikke kopieres her' })
  }

  let copy: LoadedGame | null
  try {
    copy = await copyBoard(id)
  } catch (err) {
    return next(err)
  }
  // Deleted between the read and the copy.
  if (!copy) {
    return res.status(404).json({ error: 'Board not found' })
  }
  res.status(201).json(copy)
})

// Serve built frontend in production
const distPath = resolve(__dirname, '../dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(resolve(distPath, 'index.html'))
  })
}

// JSON error handler: keep API failures (malformed bodies, bad DB rows) as JSON
// instead of Express' default HTML stack trace page.
/** The extra fields body-parser/http-errors attach to its errors. */
type HttpError = { statusCode?: unknown; expose?: unknown; message?: unknown }

const jsonErrorHandler: express.ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }
  console.error(err)
  const httpErr = (typeof err === 'object' && err !== null ? err : {}) as HttpError
  const statusCode = httpErr.statusCode
  const status =
    typeof statusCode === 'number' && statusCode >= 400 && statusCode <= 499 ? statusCode
    : err instanceof SyntaxError ? 400
    : 500
  const message =
    httpErr.expose === true && typeof httpErr.message === 'string' ? httpErr.message
    : status === 400 ? 'Malformed JSON body'
    : 'Internal server error'
  res.status(status).json({ error: message })
}
app.use(jsonErrorHandler)

io.on('connection', socket => {
  socket.on('create-session', ({ code, teams }, ack) => {
    const session = createSession(code, teams)
    socket.join(code)
    // The round survives a host reload, so hand the spent buzzes back too — and
    // any live tiebreak round, so a reloaded host adopts it instead of starting
    // a second one over the answers teams have already sent.
    ack({ ok: true, used: [...session.usedBuzzes], tiebreak: tiebreakHostState(session) })
  })

  socket.on('join-buzzer', ({ code, teamIndex }, ack) => {
    const session = getSession(code)
    if (!session) {
      ack({ teamName: '?', teamColor: '#888', questionOpen: false, buzzer: null, used: [], tiebreak: null })
      return
    }
    socket.join(code)
    const team = session.teams[teamIndex]
    // This ack is the phone's whole state resync, so it has to carry the
    // tiebreak round too: a phone that reloads mid-round must come back to the
    // screen it left, not to the buzzer.
    ack({
      teamName: team?.name ?? '?',
      teamColor: team?.color ?? '#888',
      questionOpen: session.questionOpen,
      buzzer: session.buzzer,
      used: [...session.usedBuzzes],
      tiebreak: tiebreakPhoneState(session, teamIndex),
    })
  })

  socket.on('question-open', ({ code }) => {
    openQuestion(code)
    io.to(code).emit('question-opened')
  })

  socket.on('question-close', ({ code }) => {
    closeQuestion(code)
    io.to(code).emit('question-closed')
  })

  socket.on('buzz', ({ code, teamIndex }) => {
    const result = recordBuzz(code, teamIndex)
    if (result) {
      // 'buzzed' first: it must land the winner on `won` before 'buzz-state'
      // tells that phone its buzz is now spent.
      io.to(code).emit('buzzed', result.winner)
      io.to(code).emit('buzz-state', { used: result.used })
    }
  })

  socket.on('buzz-reset', ({ code }) => {
    io.to(code).emit('buzz-state', { used: resetBuzzes(code) })
  })

  socket.on('tiebreak-start', ({ code, participants, question, correct }, ack) => {
    const round = startTiebreak(code, { participants, question, correct })
    if (round === null) {
      // Unknown code: the host emitted this before its create-session landed.
      ack({ ok: false, round: 0 })
      return
    }
    ack({ ok: true, round })
    io.to(code).emit('tiebreak-started', { round, participants, question })
  })

  socket.on('tiebreak-submit', ({ code, round, teamIndex, value }, ack) => {
    // Guard the shape here rather than trusting the client's types: this is the
    // one tiebreak payload a player's device sends, and a NaN would poison the
    // reveal's axis maths for everyone.
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      ack({ ok: false, reason: 'no-round' })
      return
    }
    const result = submitTiebreak(code, round, teamIndex, value)
    if ('error' in result) {
      ack({ ok: false, reason: result.error })
      return
    }
    // The phone locks on this ack, not on the broadcast below, so unlike the
    // buzzed/buzz-state pair these two have no ordering constraint.
    ack({ ok: true })
    io.to(code).emit('tiebreak-progress', { round, submitted: result.submitted })
  })

  socket.on('tiebreak-reveal', ({ code }) => {
    const result = revealTiebreak(code)
    if (!result) return
    // Broadcast to the room including the host, which does not flip its own
    // state optimistically — so host and phones reveal in the same tick.
    io.to(code).emit('tiebreak-revealed', result)
  })

  socket.on('tiebreak-end', ({ code }) => {
    endTiebreak(code)
    io.to(code).emit('tiebreak-ended')
  })
})

const PORT = process.env.PORT ?? 3001

// The database is remote now, so schema setup and seeding are network calls that
// have to finish before the first request arrives. Failing hard on a bad URL or
// token beats booting a server that answers 500 to every board request.
initDb()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Socket server running on port ${PORT}`)
    })
  })
  .catch((err: unknown) => {
    console.error('Database initialisation failed — not starting server.', err)
    process.exit(1)
  })
