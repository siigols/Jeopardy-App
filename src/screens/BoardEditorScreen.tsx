import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSounds } from '../hooks/useSounds'
import { clearEditCode, loadEditCode, saveEditCode } from '../utils/editCode'
import TileEditorModal from '../components/BoardEditor/TileEditorModal'
import {
  TEXT_MAX,
  TYPE_LABELS,
  makeEmptyTile,
  parseHlNumber,
  tileIsEmpty,
  tileIsFilled,
} from '../components/BoardEditor/types'
import type { HigherLowerEditorTile, RichTileDraft, TileDraft } from '../components/BoardEditor/types'
import { BOARD_THEMES, DEFAULT_BOARD_THEME_ID, getBoardTheme } from '../data/boardThemes'
import {
  BOARD_CATEGORY_COUNT,
  BOARD_TILE_COUNT,
  BOARD_TILE_POINTS,
  EDITABLE_QUESTION_TYPES,
  HL_MIN_ITEMS,
  MC_OPTION_COUNT,
  TENABLE_ITEM_COUNT,
} from '../types/game'
import type {
  BoardDraft,
  BoardTileDraft,
  EditableQuestionType,
  LoadedGame,
  QuestionContent,
} from '../types/game'
import styles from './BoardEditorScreen.module.css'

interface Props {
  mode: 'create' | 'edit'
}

interface SimpleTiebreakerDraft {
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
  themeId: string
  tiebreaker: SimpleTiebreakerDraft
  categories: CategoryDraft[]
}

const TITLE_MAX = 100
const DESCRIPTION_MAX = 300
const CATEGORY_MAX = 60

function emptyDraft(): DraftState {
  return {
    title: '',
    description: '',
    themeId: DEFAULT_BOARD_THEME_ID,
    tiebreaker: { question: '', answer: '' },
    categories: Array.from({ length: BOARD_CATEGORY_COUNT }, () => ({
      name: '',
      tiles: Array.from({ length: BOARD_TILE_COUNT }, () => ({ type: null }) as TileDraft),
    })),
  }
}

/** Maps a stored tile back to an editor tile. Blank/unsupported content is untyped. */
function contentToTile(content: QuestionContent): TileDraft {
  switch (content.type) {
    case 'simple':
      if (!content.question.trim() && !content.answer.trim()) return { type: null }
      return { type: 'simple', question: content.question, answer: content.answer }
    case 'tenable': {
      const items = Array.from({ length: TENABLE_ITEM_COUNT }, (_, i) => content.items[i] ?? '')
      return { type: 'tenable', prompt: content.prompt, items }
    }
    case 'multipleChoice': {
      const options = Array.from({ length: MC_OPTION_COUNT }, (_, i) => content.options[i] ?? '') as [
        string,
        string,
        string,
        string,
      ]
      return { type: 'multipleChoice', question: content.question, options, correctIndex: content.correctIndex }
    }
    case 'higherLower':
      return {
        type: 'higherLower',
        metric: content.metric,
        items: content.items.map(item => ({ label: item.label, numericValue: String(item.numericValue) })),
      }
    default:
      // Image-based types can't be authored here; the board is blocked anyway.
      return { type: null }
  }
}

/** Flattens a loaded Game into the editor draft, padding to the fixed 5x5 grid. */
function gameToDraft(game: LoadedGame): DraftState {
  const base = emptyDraft()
  // An unknown stored theme id would round-trip into a server `unknown themeId` 400.
  const storedThemeId = game.theme?.id
  const themeId = storedThemeId && getBoardTheme(storedThemeId) ? storedThemeId : DEFAULT_BOARD_THEME_ID
  return {
    title: game.title,
    description: game.description ?? '',
    themeId,
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
          if (!tile) return blankTile
          return contentToTile(tile.content)
        }),
      }
    }),
  }
}

/**
 * Converts an editor tile into its wire shape. Untyped *and* content-free tiles
 * become blank simple tiles, which the server coerces to blanks rather than
 * validating strictly — so picking a type and typing nothing is never an error.
 */
function tileToPayload(tile: TileDraft): BoardTileDraft {
  if (tileIsEmpty(tile)) return { type: 'simple', question: '', answer: '' }

  switch (tile.type) {
    case null:
      return { type: 'simple', question: '', answer: '' }
    case 'simple':
      return { type: 'simple', question: tile.question.trim(), answer: tile.answer.trim() }
    case 'tenable':
      return { type: 'tenable', prompt: tile.prompt.trim(), items: tile.items.map(i => i.trim()) }
    case 'multipleChoice':
      return {
        type: 'multipleChoice',
        question: tile.question.trim(),
        options: tile.options.map(o => o.trim()) as [string, string, string, string],
        correctIndex: tile.correctIndex,
      }
    case 'higherLower':
      return {
        type: 'higherLower',
        metric: tile.metric.trim(),
        items: tile.items.map(i => ({
          label: i.label.trim(),
          // Non-numeric text is blocked by validateDraft before we ever get here.
          numericValue: parseHlNumber(i.numericValue) ?? Number.NaN,
        })),
      }
  }
}

function toPayload(draft: DraftState): BoardDraft {
  const payload: BoardDraft = {
    title: draft.title.trim(),
    themeId: draft.themeId,
    categories: draft.categories.map(c => ({
      name: c.name.trim(),
      tiles: c.tiles.map(tileToPayload),
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

/** Returns a problem description for the Høyere/Lavere rows, or null. */
function validateHlRows(tile: HigherLowerEditorTile): string | null {
  if (tile.items.length < HL_MIN_ITEMS) {
    return `Høyere/Lavere må ha minst ${HL_MIN_ITEMS} rader.`
  }
  for (let i = 0; i < tile.items.length; i++) {
    const item = tile.items[i]
    const missingLabel = !item.label.trim()
    const rawNumber = item.numericValue.trim()
    const badNumber = parseHlNumber(item.numericValue) === null
    if (missingLabel && badNumber && !rawNumber) return `Høyere/Lavere rad ${i + 1} mangler navn og tall.`
    if (missingLabel) return `Høyere/Lavere rad ${i + 1} mangler navn.`
    if (!badNumber) continue
    // Distinguish "nothing typed" from "typed something that isn't a number",
    // so a stray letter doesn't read as an empty field.
    return rawNumber
      ? `Høyere/Lavere rad ${i + 1} har et ugyldig tall: «${rawNumber}».`
      : `Høyere/Lavere rad ${i + 1} mangler tall.`
  }
  return null
}

/** Returns a Norwegian problem description for a partially-filled tile, or null. */
function validateTile(tile: TileDraft): string | null {
  if (tile.type === null) return null
  if (tileIsEmpty(tile)) return null

  switch (tile.type) {
    case 'simple':
      if (!tile.answer.trim()) return 'Ruta mangler svar.'
      if (!tile.question.trim()) return 'Ruta mangler spørsmål.'
      return null
    case 'tenable': {
      if (!tile.prompt.trim()) return 'Topp 10 mangler spørsmål.'
      const missing = tile.items.filter(i => !i.trim()).length
      if (missing > 0) return `Topp 10 mangler ${missing} svar.`
      return null
    }
    case 'multipleChoice': {
      if (!tile.question.trim()) return 'Flervalg mangler spørsmål.'
      const missing = tile.options.filter(o => !o.trim()).length
      if (missing > 0) return `Flervalg mangler ${missing} alternativ.`
      return null
    }
    case 'higherLower': {
      // With a blank metric the rows are reported first: the author's only input
      // may well have been a row, and "mangler måleenhet" would then point at a
      // field they never touched.
      if (!tile.metric.trim()) {
        const rowsHaveContent = tile.items.some(i => i.label.trim() || i.numericValue.trim())
        if (rowsHaveContent) {
          const rowProblem = validateHlRows(tile)
          if (rowProblem) return rowProblem
        }
        return 'Høyere/Lavere mangler måleenhet.'
      }
      return validateHlRows(tile)
    }
  }
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

  for (let ci = 0; ci < draft.categories.length; ci++) {
    const tiles = draft.categories[ci].tiles
    for (let ti = 0; ti < tiles.length; ti++) {
      const problem = validateTile(tiles[ti])
      if (problem) return `Kategori ${ci + 1}, ${BOARD_TILE_POINTS[ti]} poeng: ${problem}`
    }
  }

  return null
}

/** Short one-line status shown on the grid cell for the modal-edited types. */
function tileSummary(tile: RichTileDraft): string {
  switch (tile.type) {
    case 'tenable':
      return `Topp 10 · ${tile.items.filter(i => i.trim()).length}/${TENABLE_ITEM_COUNT}`
    case 'multipleChoice':
      return `Flervalg · ${tile.options.filter(o => o.trim()).length}/${MC_OPTION_COUNT}`
    case 'higherLower':
      return `Høyere/Lavere · ${tile.items.length} rader`
  }
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
  const [editing, setEditing] = useState<{ ci: number; ti: number } | null>(null)
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

  const filledCount = useMemo(
    () => draft.categories.reduce((sum, c) => sum + c.tiles.filter(tileIsFilled).length, 0),
    [draft],
  )

  const previewTheme = useMemo(
    () => getBoardTheme(draft.themeId) ?? getBoardTheme(DEFAULT_BOARD_THEME_ID),
    [draft.themeId],
  )

  const closeEditor = useCallback(() => setEditing(null), [])

  /** The tile the modal is editing, or null when it isn't a modal-edited type. */
  const modalTile = useMemo<RichTileDraft | null>(() => {
    if (!editing) return null
    const tile = draft.categories[editing.ci].tiles[editing.ti]
    return tile.type !== null && tile.type !== 'simple' ? tile : null
  }, [draft, editing])

  // `editing` is only ever cleared through `closeEditor` (the modal's `onClose`)
  // or by `chooseType` retyping the very tile on screen, so the modal can never
  // vanish while `editing` stays set.

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

  const updateTile = useCallback((ci: number, ti: number, tile: TileDraft) => {
    setDraft(prev => ({
      ...prev,
      categories: prev.categories.map((c, i) =>
        i === ci ? { ...c, tiles: c.tiles.map((t, j) => (j === ti ? tile : t)) } : c,
      ),
    }))
  }, [])

  /**
   * Switching type discards the tile's content, so confirm when there is any.
   * `current` is passed in from the render that owns the button rather than read
   * from state, which keeps this callback free of a `draft` dependency (it would
   * otherwise rebuild all 100 type-button handlers on every keystroke). The
   * confirm has to happen here, before `updateTile` — a setState updater must be
   * pure and cannot prompt.
   */
  const chooseType = useCallback(
    (ci: number, ti: number, type: EditableQuestionType, current: TileDraft) => {
      if (current.type === type) return
      if (!tileIsEmpty(current) && !window.confirm('Dette sletter innholdet i ruta. Fortsette?')) return
      playClick()
      // Changing the type can make an open modal's tile no longer modal-editable,
      // so close it here rather than letting it disappear behind a stale `editing`.
      // Only when the modal is showing *this* tile: another tile's type button
      // must not dismiss an unrelated open editor.
      setEditing(prev => (prev && prev.ci === ci && prev.ti === ti ? null : prev))
      updateTile(ci, ti, makeEmptyTile(type))
    },
    [playClick, updateTile],
  )

  function handleBack() {
    playClick()
    if (dirty && !window.confirm('Du har ulagrede endringer. Vil du forlate siden?')) return
    navigate('/')
  }

  /**
   * Performs the actual save with an explicit code, so the inline re-unlock flow
   * can retry the very same request without unmounting the editor. Validation
   * lives here rather than in the callers because the draft can be edited
   * between the 401 and the unlock submit — this is the single gate every save
   * path goes through.
   */
  const performSave = useCallback(
    async (code: string | null) => {
      if (!mountedRef.current) return
      const problem = validateDraft(draft)
      if (problem) {
        setSaveError(problem)
        return
      }
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
          Denne tavla bruker bildebaserte spørsmålstyper, og de kan ikke lages eller endres i
          redigeringsverktøyet.
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

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Fargetema</h2>
          <div className={styles.themeRow} role="group" aria-label="Fargetema">
            {BOARD_THEMES.map(preset => {
              const selected = preset.id === draft.themeId
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={selected}
                  className={`${styles.themeCard} ${selected ? styles.themeCardActive : ''}`}
                  onMouseEnter={playHover}
                  onClick={() => {
                    playClick()
                    setDraft(prev => ({ ...prev, themeId: preset.id }))
                  }}
                >
                  <span className={styles.themeSwatches}>
                    {preset.theme.categoryColors.map((color, i) => (
                      <span key={i} className={styles.themeSwatch} style={{ background: color.tile }} />
                    ))}
                  </span>
                  <span className={styles.themeName}>{preset.name}</span>
                </button>
              )
            })}
          </div>
          {previewTheme && (
            <div
              className={styles.themePreview}
              style={{ background: previewTheme.bg }}
              aria-hidden="true"
            >
              <span
                className={styles.previewHeader}
                style={{ background: previewTheme.categoryColors[0].header }}
              >
                Kategori
              </span>
              <span
                className={styles.previewTile}
                style={{
                  background: previewTheme.categoryColors[0].tile,
                  color: previewTheme.accent,
                }}
              >
                600
              </span>
            </div>
          )}
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
              {category.tiles.map((tile, ti) => {
                const tileName = `Kategori ${ci + 1}, ${BOARD_TILE_POINTS[ti]} poeng`
                return (
                  <div className={styles.tileCard} key={ti}>
                    <span className={styles.points}>{BOARD_TILE_POINTS[ti]}</span>

                    <div
                      className={styles.typeSelector}
                      role="group"
                      aria-label={`${tileName} – spørsmålstype`}
                    >
                      {EDITABLE_QUESTION_TYPES.map(type => (
                        <button
                          key={type}
                          type="button"
                          aria-pressed={tile.type === type}
                          className={`${styles.typeBtn} ${tile.type === type ? styles.typeBtnActive : ''}`}
                          onMouseEnter={playHover}
                          onClick={() => chooseType(ci, ti, type, tile)}
                        >
                          {TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>

                    {tile.type === null && <span className={styles.typePrompt}>Velg type</span>}

                    {tile.type === 'simple' && (
                      <>
                        <textarea
                          className={styles.textarea}
                          value={tile.question}
                          maxLength={TEXT_MAX}
                          placeholder="Spørsmål"
                          aria-label={`${tileName} – spørsmål`}
                          onChange={e => updateTile(ci, ti, { ...tile, question: e.target.value })}
                        />
                        <input
                          className={styles.input}
                          value={tile.answer}
                          maxLength={TEXT_MAX}
                          placeholder="Svar"
                          aria-label={`${tileName} – svar`}
                          onChange={e => updateTile(ci, ti, { ...tile, answer: e.target.value })}
                        />
                      </>
                    )}

                    {tile.type !== null && tile.type !== 'simple' && (
                      <div className={styles.tileSummary}>
                        <span className={styles.tileBadge}>{tileSummary(tile)}</span>
                        <button
                          type="button"
                          className={styles.editBtn}
                          aria-label={`${tileName} – rediger`}
                          onMouseEnter={playHover}
                          onClick={() => {
                            playClick()
                            setEditing({ ci, ti })
                          }}
                        >
                          Rediger
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
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
          <span className={styles.fillCount}>
            {filledCount} av {BOARD_CATEGORY_COUNT * BOARD_TILE_COUNT} ruter er fylt ut.
          </span>
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

      {editing && modalTile && (
        <TileEditorModal
          categoryIndex={editing.ci}
          tileIndex={editing.ti}
          tile={modalTile}
          onChange={next => updateTile(editing.ci, editing.ti, next)}
          onClose={closeEditor}
        />
      )}
    </div>
  )
}
