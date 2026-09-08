import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BoardSummary, LoadedGame } from '../types/game'
import { DEFAULT_CATEGORY_COLORS } from '../data/boardThemes'
import { useSounds } from '../hooks/useSounds'
import { clearEditCode, loadEditCode, saveEditCode } from '../utils/editCode'
import { Input } from '../components/ui'
import styles from './BoardSelectScreen.module.css'

function PencilIcon() {
  return (
    <svg
      className={styles.editIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg
      className={styles.editIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

interface Props {
  boards: BoardSummary[]
  onSelect: (id: number) => void
  /** Called with the freshly created copy so the list can show it right away. */
  onCopied: (board: LoadedGame) => void
}

export default function BoardSelectScreen({ boards, onSelect, onCopied }: Props) {
  const { playHover } = useSounds()
  const navigate = useNavigate()

  const [copyingId, setCopyingId] = useState<number | null>(null)
  const [copyError, setCopyError] = useState<{ id: number; message: string } | null>(null)
  // Copying creates a board, so it needs the edit code. A stale or missing code
  // turns into an inline prompt on the card rather than a trip through CodeGate,
  // which would lose the user's place in the list.
  const [codePrompt, setCodePrompt] = useState<number | null>(null)
  const [code, setCode] = useState('')

  const copyBoard = useCallback(
    async (boardId: number, editCode: string | null) => {
      setCopyingId(boardId)
      setCopyError(null)
      try {
        const res = await fetch(`/api/boards/${boardId}/copy`, {
          method: 'POST',
          headers: editCode ? { 'x-edit-code': editCode } : {},
        })
        if (res.status === 401) {
          clearEditCode()
          setCodePrompt(boardId)
          setCopyError(editCode ? { id: boardId, message: 'Feil kode' } : null)
          return
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          setCopyError({ id: boardId, message: body?.error ?? `Kunne ikke kopiere (${res.status})` })
          return
        }
        if (editCode) saveEditCode(editCode)
        setCodePrompt(null)
        setCode('')
        onCopied((await res.json()) as LoadedGame)
      } catch {
        setCopyError({ id: boardId, message: 'Kunne ikke kontakte serveren. Prøv igjen.' })
      } finally {
        setCopyingId(null)
      }
    },
    [onCopied],
  )

  function handleCopyClick(boardId: number) {
    setCode('')
    void copyBoard(boardId, loadEditCode())
  }

  function handleCodeSubmit(e: FormEvent, boardId: number) {
    e.preventDefault()
    if (!code.trim()) return
    void copyBoard(boardId, code)
  }

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>Jeopardy!</h1>
      <p className={styles.subtitle}>Velg brett</p>

      <div className={styles.actions}>
        <button
          className={styles.newBtn}
          onMouseEnter={playHover}
          onClick={() => navigate('/boards/new')}
        >
          Ny tavle
        </button>
      </div>

      <div className={styles.grid}>
        {boards.map(board => {
          const colors = board.theme?.categoryColors ?? []
          const busy = copyingId === board.id
          const error = copyError?.id === board.id ? copyError.message : null
          return (
            <div key={board.id} className={styles.card}>
              <button
                className={styles.cardMain}
                onMouseEnter={playHover}
                onClick={() => onSelect(board.id)}
              >
                <div className={styles.swatches}>
                  {colors.slice(0, 5).map((c, j) => (
                    <div key={j} className={styles.swatch} style={{ background: c.tile }} />
                  ))}
                  {colors.length === 0 && DEFAULT_CATEGORY_COLORS.slice(0, 5).map((c, j) => (
                    <div key={j} className={styles.swatch} style={{ background: c.tile }} />
                  ))}
                </div>

                <h2 className={styles.cardTitle}>{board.title}</h2>

                {board.description && (
                  <p className={styles.cardDesc}>{board.description}</p>
                )}

                <div className={styles.categories}>
                  {board.categories.map((cat, j) => (
                    <span key={j} className={styles.catChip}>{cat.name}</span>
                  ))}
                </div>

                <p className={styles.meta}>
                  {board.categories.length} kategorier
                </p>
              </button>

              {board.editable && (
                <div className={styles.cardActions}>
                  <button
                    className={styles.iconBtn}
                    aria-label={`Kopier ${board.title}`}
                    title="Kopier"
                    disabled={busy}
                    onMouseEnter={playHover}
                    onClick={e => {
                      e.stopPropagation()
                      handleCopyClick(board.id)
                    }}
                  >
                    <CopyIcon />
                  </button>
                  <button
                    className={styles.iconBtn}
                    aria-label={`Rediger ${board.title}`}
                    title="Rediger"
                    onMouseEnter={playHover}
                    onClick={e => {
                      e.stopPropagation()
                      navigate(`/boards/${board.id}/edit`)
                    }}
                  >
                    <PencilIcon />
                  </button>
                </div>
              )}

              {(codePrompt === board.id || error) && (
                <div className={styles.cardNotice}>
                  {codePrompt === board.id && (
                    <form className={styles.codeRow} onSubmit={e => handleCodeSubmit(e, board.id)}>
                      <Input
                        className={styles.codeInput}
                        type="password"
                        placeholder="Kode"
                        aria-label="Kode for å kopiere"
                        value={code}
                        autoFocus
                        onChange={e => setCode(e.target.value)}
                      />
                      <button className={styles.codeSubmit} type="submit" disabled={busy}>
                        {busy ? '…' : 'Kopier'}
                      </button>
                    </form>
                  )}
                  {error && <span className={styles.noticeError}>{error}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
