import type { RequestHandler } from 'express'

const EDIT_CODE = process.env.EDIT_CODE ?? 'jeopardy'

if (process.env.EDIT_CODE === undefined) {
  console.warn(
    '[auth] EDIT_CODE is not set — using the development default. Set EDIT_CODE before deploying.'
  )
}

/** Failed-attempt budget per IP, and the window it resets over. */
const MAX_FAILED_ATTEMPTS = 10
const WINDOW_MS = 15 * 60 * 1000

interface AttemptRecord {
  count: number
  resetAt: number
}

const attempts = new Map<string, AttemptRecord>()

/** Drops expired records so the map doesn't grow without bound. */
function pruneExpired(now: number): void {
  for (const [ip, record] of attempts) {
    if (record.resetAt <= now) {
      attempts.delete(ip)
    }
  }
}

function registerFailure(ip: string, now: number): void {
  const record = attempts.get(ip)
  if (!record || record.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return
  }
  record.count += 1
}

function isRateLimited(ip: string, now: number): boolean {
  const record = attempts.get(ip)
  if (!record || record.resetAt <= now) return false
  return record.count >= MAX_FAILED_ATTEMPTS
}

/**
 * Gates a route behind the shared edit code supplied in the `x-edit-code` header.
 * Not hack-proof — the rate limiter only blunts casual brute force.
 */
export const requireEditCode: RequestHandler = (req, res, next) => {
  const now = Date.now()
  pruneExpired(now)

  // req.ip only reflects the real client behind a reverse proxy when the app has
  // `trust proxy` configured — see the TRUST_PROXY env var in server/index.ts.
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'

  if (isRateLimited(ip, now)) {
    res.status(429).json({ error: 'For mange forsøk. Prøv igjen senere.' })
    return
  }

  const supplied = req.get('x-edit-code')
  if (typeof supplied !== 'string' || supplied !== EDIT_CODE) {
    registerFailure(ip, now)
    res.status(401).json({ error: 'Feil kode' })
    return
  }

  attempts.delete(ip)
  next()
}
