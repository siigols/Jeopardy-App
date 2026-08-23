import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { existsSync } from 'fs'
import type { LoadedGame } from '../src/types/game.js'
import type { ServerToClientEvents, ClientToServerEvents } from '../src/types/socket-events.js'
import { createSession, getSession, openQuestion, closeQuestion, recordBuzz } from './session.js'
import { getAllBoards, getBoard, createBoard, updateBoard } from './db.js'
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
app.get('/api/boards', (_req, res) => {
  res.json(getAllBoards())
})

/** Parses a positive-integer board id from a route param, or null if invalid. */
function parseBoardId(raw: string | string[]): number | null {
  if (typeof raw !== 'string') return null
  // Number() would happily accept '1e3' and '0x2'; require plain decimal digits.
  if (!/^[1-9]\d*$/.test(raw)) return null
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

app.get('/api/boards/:id', (req, res, next) => {
  const id = parseBoardId(req.params.id)
  if (id === null) {
    return res.status(400).json({ error: 'Invalid board id' })
  }
  let board: LoadedGame | null
  try {
    board = getBoard(id)
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

app.post('/api/boards', requireEditCode, (req, res, next) => {
  const result = validateBoardDraft(req.body)
  if (!result.ok) {
    return res.status(400).json({ error: result.error })
  }
  try {
    res.status(201).json(createBoard(result.draft))
  } catch (err) {
    next(err)
  }
})

app.put('/api/boards/:id', requireEditCode, (req, res, next) => {
  const id = parseBoardId(req.params.id)
  if (id === null) {
    return res.status(400).json({ error: 'Invalid board id' })
  }

  let existing: LoadedGame | null
  try {
    existing = getBoard(id)
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
    updated = updateBoard(id, result.draft)
  } catch (err) {
    return next(err)
  }
  if (!updated) {
    return res.status(404).json({ error: 'Board not found' })
  }
  res.json(updated)
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
    createSession(code, teams)
    socket.join(code)
    ack({ ok: true })
  })

  socket.on('join-buzzer', ({ code, teamIndex }, ack) => {
    const session = getSession(code)
    if (!session) {
      ack({ teamName: '?', teamColor: '#888', questionOpen: false, buzzer: null })
      return
    }
    socket.join(code)
    const team = session.teams[teamIndex]
    ack({
      teamName: team?.name ?? '?',
      teamColor: team?.color ?? '#888',
      questionOpen: session.questionOpen,
      buzzer: session.buzzer,
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
    const winner = recordBuzz(code, teamIndex)
    if (winner) {
      io.to(code).emit('buzzed', winner)
    }
  })
})

const PORT = process.env.PORT ?? 3001
httpServer.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`)
})
