import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSounds } from '../hooks/useSounds'
import { clearEditCode, loadEditCode, saveEditCode } from '../utils/editCode'
import {
  BOARD_CATEGORY_COUNT,
  BOARD_TILE_COUNT,
  BOARD_TILE_POINTS,
} from '../types/game'
import type { BoardDraft, LoadedGame, QuestionContent, SimpleQuestion } from '../types/game'
import styles from './BoardEditorScreen.module.css'

interface Props {
  mode: 'create' | 'edit'
}

interface TileDraft {
  question: string
  answer: string
}

interface CategoryDraft {
  name: string
  tiles: TileDraft[]
}

interface DraftState {
  title: string
  description: string
  tiebreaker: TileDraft
  categories: CategoryDraft[]
}

const TITLE_MAX = 100
const DESCRIPTION_MAX = 300
const CATEGORY_MAX = 60
const TEXT_MAX = 500

function emptyDraft(): DraftState {
  return {
    title: '',
    description: '',
    tiebreaker: { question: '', answer: '' },
    categories: Array.from({ length: BOARD_CATEGORY_COUNT }, () => ({
      name: '',
      tiles: Array.from({ length: BOARD_TILE_COUNT }, () => ({ question: '', answer: '' })),
    })),
  }
}

function isSimple(content: QuestionContent): content is SimpleQuestion {
  return content.type === 'simple'
}

/** Flattens a loaded Game into the flat editor draft, padding to the fixed 5x5 grid. */
function gameToDraft(game: LoadedGame): DraftState {
  const base = emptyDraft()
  return {
    title: game.title,
    description: game.description ?? '',
    tiebreaker: {
      question: game.tiebreaker?.question ?? '',
      answer: game.tiebreaker?.answer ?? '',
    },
    categories: base.categories.map((blank, ci) => {
      const category = game.categories[ci]
      if (!category) return blank
      return {
        name: category.name,
        tiles: blank.tiles.map((blankTile, ti) => {
          const tile = category.tiles[ti]
          if (!tile || !isSimple(tile.content)) return blankTile
          return { question: tile.content.question, answer: tile.content.answer }
        }),
      }
    }),
  }
}

function toPayload(draft: DraftState): BoardDraft {
  const payload: BoardDraft = {
    title: draft.title.trim(),
    categories: draft.categories.map(c => ({
      name: c.name.trim(),
      tiles: c.tiles.map(t => ({ question: t.question.trim(), answer: t.answer.trim() })),
    })),
  }
  const description = draft.description.trim()
  if (description) payload.description = description

  // The server rejects a tiebreaker with blank fields, so only send a complete one.
  const tbQuestion = draft.tiebreaker.question.trim()
  const tbAnswer = draft.tiebreaker.answer.trim()
  if (tbQuestion && tbAnswer) {
    payload.tiebreaker = { type: 'simple', question: tbQuestion, answer: tbAnswer }
  }
  return payload
}

/**
 * Client-side pre-flight validation. The server enforces the same rules, but its
 * errors are raw English, so we catch the common cases first and report them in
 * Norwegian with a field the user can actually find. Returns null when valid.
 */
function validateDraft(draft: DraftState): string | null {
  if (!draft.title.trim()) return 'Tavla må ha en tittel.'

  for (let ci = 0; ci < draft.categories.length; ci++) {
    if (!draft.categories[ci].name.trim()) return `Kategori ${ci + 1} mangler navn.`
  }

  const tbQuestion = draft.tiebreaker.question.trim()
  const tbAnswer = draft.tiebreaker.answer.trim()
  if (Boolean(tbQuestion) !== Boolean(tbAnswer)) {
    return 'Tiebreaker må ha både spørsmål og svar (eller ingen av delene).'
  }

  return null
}

export default function BoardEditorScreen({ mode }: Props) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { playHover, playClick } = useSounds()

  const [draft, setDraft] = useState<DraftState>(emptyDraft)
  const [initialSnapshot, setInitialSnapshot] = useState<string>(() => JSON.stringify(emptyDraft()))
  const [loading, setLoading] = useState(mode === 'edit')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // When a save 401s we drop the stale code and render an inline unlock form
  // instead of reloading — a 25-tile draft is far too much to throw away.
  const [needsCode, setNeedsCode] = useState(false)
  const [inlineCode, setInlineCode] = useState('')
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const mountedRef = useRef(true)

  const titleId = useId()
  const descriptionId = useId()
  const tiebreakerQuestionId = useId()
  const tiebreakerAnswerId = useId()
  const inlineCodeId = useId()

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (mode !== 'edit') return
    const controller = new AbortController()

    void (async () => {
      try {
        const res = await fetch(`/api/boards/${id}`, { signal: controller.signal })
        if (!res.ok) {
          if (res.status === 404) throw new Error('Fant ikke tavla.')
          if (res.status === 400) throw new Error('Ugyldig tavle-ID.')
          throw new Error(`Kunne ikke laste brett (${res.status})`)
        }
        const game = (await res.json()) as LoadedGame
        if (controller.signal.aborted || !mountedRef.current) return
        if (!game.editable) {
          setBlocked(true)
          return
        }
        const loaded = gameToDraft(game)
        setDraft(loaded)
        setInitialSnapshot(JSON.stringify(loaded))
      } catch (err) {
        if (controller.signal.aborted || !mountedRef.current) return
        setLoadError(err instanceof Error ? err.message : 'Kunne ikke laste brett')
      } finally {
        if (!controller.signal.aborted && mountedRef.current) setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [mode, id])

  const dirty = useMemo(() => JSON.stringify(draft) !== initialSnapshot, [draft, initialSnapshot])

  // Unsaved-changes guard. This only covers full page unloads (reload, tab close,
  // external navigation) and our own in-app "Tilbake" button. Browser back/forward
  // is deliberately NOT blocked: React Router v7 only exposes `useBlocker` on a
  // data router (createBrowserRouter), and this integration intentionally sticks
  // to the minimal <BrowserRouter> setup.
  useEffect(() => {
    if (!dirty) return

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  const updateCategory = useCallback((ci: number, name: string) => {
    setDraft(prev => ({
      ...prev,
      categories: prev.categories.map((c, i) => (i === ci ? { ...c, name } : c)),
    }))
  }, [])

  const updateTile = useCallback((ci: number, ti: number, patch: Partial<TileDraft>) => {
    setDraft(prev => ({
      ...prev,
      categories: prev.categories.map((c, i) =>
        i === ci ? { ...c, tiles: c.tiles.map((t, j) => (j === ti ? { ...t, ...patch } : t)) } : c,
      ),
    }))
  }, [])

  function handleBack() {
    playClick()
    if (dirty && !window.confirm('Du har ulagrede endringer. Vil du forlate siden?')) return
    navigate('/')
  }

  /**
   * Performs the actual save with an explicit code, so the inline re-unlock flow
   * can retry the very same request without unmounting the editor.
   */
  const performSave = useCallback(
    async (code: string | null) => {
      if (!mountedRef.current) return
      setSaving(true)
      setSaveError(null)
      try {
        const res = await fetch(mode === 'create' ? '/api/boards' : `/api/boards/${id}`, {
          method: mode === 'create' ? 'POST' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(code ? { 'x-edit-code': code } : {}),
          },
          body: JSON.stringify(toPayload(draft)),
        })

        if (res.ok) {
          // Clear the guard before navigating so we don't confirm on our own success.
          setInitialSnapshot(JSON.stringify(draft))
          navigate('/')
          return
        }

        if (res.status === 401) {
          // The stored code went stale (server restart / changed EDIT_CODE). Drop
          // it and prompt inline — the draft stays mounted and is retried as-is.
          clearEditCode()
          if (mountedRef.current) {
            setNeedsCode(true)
            setInlineCode('')
            setInlineError(null)
            setSaveError('Koden er ikke lenger gyldig. Lås opp på nytt for å lagre.')
          }
          return
        }

        const body = (await res.json().catch(() => null)) as { error?: string } | null
        if (mountedRef.current) setSaveError(body?.error ?? `Kunne ikke lagre (${res.status})`)
      } catch {
        if (mountedRef.current) setSaveError('Kunne ikke kontakte serveren. Prøv igjen.')
      } finally {
        if (mountedRef.current) setSaving(false)
      }
    },
    [draft, id, mode, navigate],
  )

  async function handleSave() {
    if (saving) return
    playClick()
    const problem = validateDraft(draft)
    if (problem) {
      setSaveError(problem)
      return
    }
    await performSave(loadEditCode())
  }

  async function handleInlineUnlock(e: FormEvent) {
    e.preventDefault()
    if (unlocking || saving) return
    playClick()
    setUnlocking(true)
    setInlineError(null)
    try {
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'x-edit-code': inlineCode },
      })

      if (res.ok) {
        saveEditCode(inlineCode)
        if (!mountedRef.current) return
        setNeedsCode(false)
        setSaveError(null)
        const accepted = inlineCode
        setInlineCode('')
        await performSave(accepted)
        return
      }

      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (!mountedRef.current) return
      if (res.status === 429) {
        setInlineError(body?.error ?? 'For mange forsøk. Vent litt og prøv igjen.')
      } else {
        setInlineError(body?.error ?? 'Feil kode')
      }
    } catch {
      if (mountedRef.current) setInlineError('Kunne ikke kontakte serveren. Prøv igjen.')
    } finally {
      if (mountedRef.current) setUnlocking(false)
    }
  }

  if (blocked) {
    return (
      <div className={styles.centered}>
        <p className={styles.message}>
          Denne tavla bruker avanserte spørsmålstyper og kan ikke redigeres her.
        </p>
        <Link to="/" className={styles.backLink} onMouseEnter={playHover} onClick={playClick}>
          ← Tilbake
        </Link>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={styles.centered}>
        <p className={styles.error}>{loadError}</p>
        <Link to="/" className={styles.backLink} onMouseEnter={playHover} onClick={playClick}>
          ← Tilbake
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.centered}>
        <p className={styles.message}>Laster tavle…</p>
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      <div className={styles.inner}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={handleBack} onMouseEnter={playHover}>
            ← Tilbake
          </button>
          <h1 className={styles.title}>{mode === 'create' ? 'Ny tavle' : 'Rediger tavle'}</h1>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Om tavla</h2>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={titleId}>
              Tittel
            </label>
            <input
              id={titleId}
              className={styles.input}
              value={draft.title}
              maxLength={TITLE_MAX}
              onChange={e => setDraft(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={descriptionId}>
              Beskrivelse (valgfritt)
            </label>
            <input
              id={descriptionId}
              className={styles.input}
              value={draft.description}
              maxLength={DESCRIPTION_MAX}
              onChange={e => setDraft(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </section>

        <div className={styles.grid}>
          {draft.categories.map((category, ci) => (
            <div className={styles.column} key={ci}>
              <input
                className={styles.categoryInput}
                value={category.name}
                maxLength={CATEGORY_MAX}
                placeholder={`Kategori ${ci + 1}`}
                aria-label={`Kategori ${ci + 1} navn`}
                onChange={e => updateCategory(ci, e.target.value)}
              />
              {category.tiles.map((tile, ti) => (
                <div className={styles.tileCard} key={ti}>
                  <span className={styles.points}>{BOARD_TILE_POINTS[ti]}</span>
                  <textarea
                    className={styles.textarea}
                    value={tile.question}
                    maxLength={TEXT_MAX}
                    placeholder="Spørsmål"
                    aria-label={`Kategori ${ci + 1}, ${BOARD_TILE_POINTS[ti]} poeng – spørsmål`}
                    onChange={e => updateTile(ci, ti, { question: e.target.value })}
                  />
                  <input
                    className={styles.input}
                    value={tile.answer}
                    maxLength={TEXT_MAX}
                    placeholder="Svar"
                    aria-label={`Kategori ${ci + 1}, ${BOARD_TILE_POINTS[ti]} poeng – svar`}
                    onChange={e => updateTile(ci, ti, { answer: e.target.value })}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Omspørsmål (valgfritt)</h2>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={tiebreakerQuestionId}>
              Spørsmål
            </label>
            <textarea
              id={tiebreakerQuestionId}
              className={styles.textarea}
              value={draft.tiebreaker.question}
              maxLength={TEXT_MAX}
              onChange={e =>
                setDraft(prev => ({
                  ...prev,
                  tiebreaker: { ...prev.tiebreaker, question: e.target.value },
                }))
              }
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={tiebreakerAnswerId}>
              Svar
            </label>
            <input
              id={tiebreakerAnswerId}
              className={styles.input}
              value={draft.tiebreaker.answer}
              maxLength={TEXT_MAX}
              onChange={e =>
                setDraft(prev => ({
                  ...prev,
                  tiebreaker: { ...prev.tiebreaker, answer: e.target.value },
                }))
              }
            />
          </div>
        </section>

        <div className={styles.footer}>
          {saveError && <span className={styles.error}>{saveError}</span>}
          {needsCode && (
            <form className={styles.unlockForm} onSubmit={handleInlineUnlock}>
              <label className={styles.label} htmlFor={inlineCodeId}>
                Kode
              </label>
              <input
                id={inlineCodeId}
                className={styles.input}
                type="password"
                value={inlineCode}
                autoFocus
                onChange={e => setInlineCode(e.target.value)}
              />
              <button
                className={styles.backBtn}
                type="submit"
                disabled={unlocking || saving}
                onMouseEnter={playHover}
              >
                {unlocking ? 'Sjekker…' : 'Lås opp og lagre'}
              </button>
              {inlineError && <span className={styles.error}>{inlineError}</span>}
            </form>
          )}
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
            onMouseEnter={playHover}
          >
            {saving ? 'Lagrer…' : 'Lagre'}
          </button>
        </div>
      </div>
    </div>
  )
}
