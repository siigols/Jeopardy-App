import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSounds } from '../../hooks/useSounds'
import { clearEditCode, loadEditCode, saveEditCode } from '../../utils/editCode'
import styles from './CodeGate.module.css'

interface Props {
  children: ReactNode
}

type GateStatus = 'checking' | 'locked' | 'unlocked' | 'retry'

/**
 * Gates its children behind the shared edit code. A code already in
 * sessionStorage is verified silently on mount so the prompt only appears when
 * there is genuinely nothing valid stored.
 */
export default function CodeGate({ children }: Props) {
  const [status, setStatus] = useState<GateStatus>(() => (loadEditCode() ? 'checking' : 'locked'))
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [recheck, setRecheck] = useState(0)
  const mountedRef = useRef(true)
  const { playHover, playClick } = useSounds()

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const stored = loadEditCode()
    if (!stored) return

    const controller = new AbortController()
    void (async () => {
      try {
        const res = await fetch('/api/verify-code', {
          method: 'POST',
          headers: { 'x-edit-code': stored },
          signal: controller.signal,
        })
        if (controller.signal.aborted || !mountedRef.current) return
        if (res.ok) {
          setStatus('unlocked')
          return
        }
        if (res.status === 401) {
          // Genuinely rejected — the stored code is stale, drop it and prompt.
          clearEditCode()
          setStatus('locked')
          return
        }
        // Rate limited or a server hiccup says nothing about the code itself, so
        // we keep it and let the user retry instead of forcing a re-entry.
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        if (!mountedRef.current) return
        setError(
          res.status === 429
            ? (body?.error ?? 'For mange forsøk. Vent litt og prøv igjen.')
            : (body?.error ?? `Kunne ikke sjekke koden (${res.status}). Prøv igjen.`),
        )
        setStatus('retry')
      } catch {
        if (controller.signal.aborted || !mountedRef.current) return
        setError('Kunne ikke kontakte serveren. Prøv igjen.')
        setStatus('retry')
      }
    })()

    return () => controller.abort()
  }, [recheck])

  function handleRetry() {
    playClick()
    setError(null)
    setStatus('checking')
    setRecheck(n => n + 1)
  }

  function handleUseAnotherCode() {
    playClick()
    clearEditCode()
    setError(null)
    setCode('')
    setStatus('locked')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    playClick()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'x-edit-code': code },
      })
      if (res.ok) {
        saveEditCode(code)
        if (mountedRef.current) setStatus('unlocked')
        return
      }
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (!mountedRef.current) return
      setError(body?.error ?? 'Feil kode')
    } catch {
      if (mountedRef.current) setError('Kunne ikke kontakte serveren. Prøv igjen.')
    } finally {
      if (mountedRef.current) setSubmitting(false)
    }
  }

  if (status === 'unlocked') return <>{children}</>

  return (
    <div className={styles.screen}>
      <Link to="/" className={styles.backLink} onMouseEnter={playHover} onClick={playClick}>
        ← Tilbake
      </Link>
      {status === 'checking' ? (
        <p className={styles.loading}>Sjekker kode…</p>
      ) : status === 'retry' ? (
        <div className={styles.card}>
          <h1 className={styles.heading}>Kunne ikke sjekke koden</h1>
          {error && <p className={styles.error}>{error}</p>}
          <button
            className={styles.submitBtn}
            type="button"
            onClick={handleRetry}
            onMouseEnter={playHover}
          >
            Prøv igjen
          </button>
          <button
            className={styles.secondaryBtn}
            type="button"
            onClick={handleUseAnotherCode}
            onMouseEnter={playHover}
          >
            Bruk en annen kode
          </button>
        </div>
      ) : (
        <form className={styles.card} onSubmit={handleSubmit}>
          <h1 className={styles.heading}>Lås opp redigering</h1>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-code">
              Kode
            </label>
            <input
              id="edit-code"
              className={styles.input}
              type="password"
              value={code}
              autoFocus
              onChange={e => setCode(e.target.value)}
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.submitBtn} type="submit" disabled={submitting} onMouseEnter={playHover}>
            {submitting ? 'Sjekker…' : 'Lås opp'}
          </button>
        </form>
      )}
    </div>
  )
}
