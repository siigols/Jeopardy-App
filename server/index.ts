import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { existsSync } from 'fs'
import type { ServerToClientEvents, ClientToServerEvents } from '../src/types/socket-events.js'
import { createSession, getSession, openQuestion, closeQuestion, recordBuzz } from './session.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
const httpServer = createServer(app)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
})

// Serve built frontend in production
const distPath = resolve(__dirname, '../dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(resolve(distPath, 'index.html'))
  })
}

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
