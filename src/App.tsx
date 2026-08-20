import { useState, useEffect, useRef, useCallback } from 'react'
import type { Team, BoardSummary, LoadedGame } from './types/game'
import { loadAppState, saveAppState, clearGameState, clearAppState } from './utils/sessionStore'
import type { AppSavedState } from './utils/sessionStore'
import BoardSelectScreen from './screens/BoardSelectScreen'
import SetupScreen from './screens/SetupScreen'
import GameScreen from './screens/GameScreen'
import TiebreakerScreen from './screens/TiebreakerScreen'
import PodiumScreen from './screens/PodiumScreen'

type AppState = 'board-select' | 'setup' | 'game' | 'tiebreaker' | 'podium'
type Theme = 'dark' | 'light'

interface InitialState {
  /** The saved state we are able to restore from, if any. */
  saved: AppSavedState | null
  /** A saved session existed but is unrestorable and must be purged on mount. */
  drop: boolean
}

/**
 * Pure decision: can the persisted session be restored? No side effects here —
 * StrictMode double-invokes state initialisers.
 */
function restoreInitial(): InitialState {
  const saved = loadAppState()
  if (!saved) return { saved: null, drop: false }
  // Any screen past board-select needs a board; without a usable id (e.g. state
  // persisted by an older version keyed on title) we cannot restore it.
  if (saved.appState !== 'board-select' && saved.selectedGameId === null) {
    return { saved: null, drop: true }
  }
  return { saved, drop: false }
}

export default function App() {
  const [initial] = useState(restoreInitial)
  const [restoreId] = useState<number | null>(() => initial.saved?.selectedGameId ?? null)

  const [appState, setAppState] = useState<AppState>((initial.saved?.appState as AppState) ?? 'board-select')
  const [selectedGame, setSelectedGame] = useState<LoadedGame | null>(null)
  const [teams, setTeams] = useState<Team[]>(initial.saved?.teams ?? [])
  const [finalTeams, setFinalTeams] = useState<Team[]>(initial.saved?.finalTeams ?? [])
  const [tiedTeams, setTiedTeams] = useState<Team[]>(initial.saved?.tiedTeams ?? [])
  const [theme, setTheme] = useState<Theme>((initial.saved?.theme as Theme) ?? 'dark')
  const [gameKey, setGameKey] = useState(initial.saved?.gameKey ?? 0)

  const [boards, setBoards] = useState<BoardSummary[]>([])
  const [boardsLoading, setBoardsLoading] = useState(true)
  const [boardsError, setBoardsError] = useState<string | null>(null)
  const [boardsAttempt, setBoardsAttempt] = useState(0)
  // True while the initial persisted board is still being re-fetched.
  const [restoring, setRestoring] = useState(restoreId != null)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreAttempt, setRestoreAttempt] = useState(0)
  const [boardLoading, setBoardLoading] = useState(false)

  const mountedRef = useRef(true)
  const selectAbortRef = useRef<AbortController | null>(null)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      selectAbortRef.current?.abort()
    }
  }, [])

  /**
   * Purge an unrestorable session once, on mount. The React state already
   * defaults to a clean slate (`initial.saved` is null when dropping), so only
   * the persisted storage needs clearing.
   */
  useEffect(() => {
    if (!initial.drop) return
    clearAppState()
    clearGameState()
  }, [initial])

  // Load the board list.
  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const res = await fetch('/api/boards', { signal: controller.signal })
        if (!res.ok) throw new Error(`Kunne ikke laste brett (${res.status})`)
        const data = (await res.json()) as BoardSummary[]
        if (controller.signal.aborted) return
        setBoards(data)
        setBoardsError(null)
      } catch (err) {
        if (controller.signal.aborted) return
        setBoardsError(err instanceof Error ? err.message : 'Kunne ikke laste brett')
      } finally {
        if (!controller.signal.aborted) setBoardsLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [boardsAttempt])

  const retryBoards = useCallback(() => {
    setBoardsError(null)
    setBoardsLoading(true)
    setBoardsAttempt(n => n + 1)
  }, [])

  // Re-hydrate the persisted board selection by id.
  useEffect(() => {
    if (restoreId == null) return
    const controller = new AbortController()

    async function load() {
      try {
        const res = await fetch(`/api/boards/${restoreId}`, { signal: controller.signal })
        if (res.status >= 400 && res.status < 500) {
          // The board is gone (404) or the persisted id is invalid (400) —
          // either way it can never be fetched, so drop the stale session.
          if (controller.signal.aborted) return
          clearAppState()
          clearGameState()
          setAppState('board-select')
          setTeams([])
          setFinalTeams([])
          setTiedTeams([])
          setRestoreError(null)
          return
        }
        if (!res.ok) throw new Error(`Kunne ikke laste brett (${res.status})`)
        const game = (await res.json()) as LoadedGame
        if (controller.signal.aborted) return
        setSelectedGame(game)
        setRestoreError(null)
      } catch (err) {
        if (controller.signal.aborted) return
        // Transient failure (server restart, network hiccup, 5xx): keep the
        // saved session intact and let the user retry.
        setRestoreError(err instanceof Error ? err.message : 'Kunne ikke laste brett')
      } finally {
        if (!controller.signal.aborted) setRestoring(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [restoreId, restoreAttempt])

  const retryRestore = useCallback(() => {
    setRestoreError(null)
    setRestoring(true)
    setRestoreAttempt(n => n + 1)
  }, [])

  // Persist app state on every change. Two situations must not be written:
  //  - while the persisted board is still in flight (`restoring`), and
  //  - after a *failed* restore, where `selectedGame` is still null even though
  //    the saved session points at a real board — writing would clobber
  //    `selectedGameId` with null and destroy the session being restored.
  // Both are covered without a separate kill-switch flag, so an error state can
  // never permanently disable persistence.
  const restorePending = restoring || (restoreId != null && selectedGame == null && appState !== 'board-select')
  useEffect(() => {
    if (restorePending) return
    saveAppState({
      appState,
      selectedGameId: selectedGame?.id ?? null,
      teams,
      finalTeams,
      tiedTeams,
      theme,
      gameKey,
    })
  }, [restorePending, appState, selectedGame, teams, finalTeams, tiedTeams, theme, gameKey])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  async function handleBoardSelect(id: number) {
    // Last click wins: abort any in-flight selection before starting a new one.
    selectAbortRef.current?.abort()
    const controller = new AbortController()
    selectAbortRef.current = controller

    setBoardLoading(true)
    setBoardsError(null)
    // Picking a board leaves the restore flow for good — a stale restore error
    // must not linger and re-trigger the fatal screen later.
    setRestoreError(null)
    try {
      const res = await fetch(`/api/boards/${id}`, { signal: controller.signal })
      if (!res.ok) throw new Error(`Kunne ikke laste brett (${res.status})`)
      const game = (await res.json()) as LoadedGame
      if (controller.signal.aborted || !mountedRef.current) return
      setSelectedGame(game)
      setAppState('setup')
    } catch (err) {
      if (controller.signal.aborted || !mountedRef.current) return
      setBoardsError(err instanceof Error ? err.message : 'Kunne ikke laste brett')
    } finally {
      if (!controller.signal.aborted && mountedRef.current) setBoardLoading(false)
      if (selectAbortRef.current === controller) selectAbortRef.current = null
    }
  }

  function handleStart(selectedTeams: Team[]) {
    setTeams(selectedTeams)
    setAppState('game')
  }

  function handleReset() {
    clearGameState()
    setGameKey(k => k + 1)
    // Back to the board list: drop the current board and any stale restore
    // error so the session is persisted as a clean board-select state.
    setSelectedGame(null)
    setRestoreError(null)
    setAppState('board-select')
  }

  function handleGameComplete(endTeams: Team[]) {
    clearGameState()

    // Check for tie at the top
    const sorted = [...endTeams].sort((a, b) => b.score - a.score)
    const topScore = sorted[0].score
    const tied = sorted.filter(t => t.score === topScore)

    if (tied.length > 1) {
      // Tie for first — go to tiebreaker
      setFinalTeams(endTeams)
      setTiedTeams(tied)
      setAppState('tiebreaker')
    } else {
      setFinalTeams(endTeams)
      setAppState('podium')
    }
  }

  function handleTiebreakerResolved(updatedTeams: Team[]) {
    setFinalTeams(updatedTeams)
    setAppState('podium')
  }

  function handlePlayAgain() {
    clearGameState()
    setGameKey(k => k + 1)
    setAppState('game')
  }

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  if (appState === 'board-select') {
    if (boardsLoading || restoring) {
      return <StatusScreen message="Laster brett …" />
    }
    if (boardsError && boards.length === 0) {
      return (
        <StatusScreen
          message="Kunne ikke laste brett."
          detail={boardsError}
          actionLabel="Prøv igjen"
          onAction={retryBoards}
        />
      )
    }
    return (
      <>
        <BoardSelectScreen boards={boards} onSelect={handleBoardSelect} />
        {boardLoading && <StatusOverlay message="Laster brett …" />}
        {boardsError && (
          <StatusOverlay message={boardsError} onDismiss={() => setBoardsError(null)} autoHideMs={6000} />
        )}
      </>
    )
  }

  // The restored session could not be re-fetched (server restart, network
  // hiccup). The session is kept — let the user retry.
  if (restoreError) {
    return (
      <StatusScreen
        message="Kunne ikke gjenopprette spillet."
        detail={restoreError}
        actionLabel="Prøv igjen"
        onAction={retryRestore}
      />
    )
  }

  // A restored session is waiting for its board to come back from the API.
  if (restoring) {
    return <StatusScreen message="Gjenoppretter spill …" />
  }

  if (appState === 'setup' && selectedGame) {
    return (
      <SetupScreen
        gameTitle={selectedGame.title}
        onStart={handleStart}
        onBack={() => setAppState('board-select')}
      />
    )
  }

  if (appState === 'game' && selectedGame) {
    return (
      <GameScreen
        key={gameKey}
        game={selectedGame}
        teams={teams}
        theme={theme}
        onThemeToggle={toggleTheme}
        onReset={handleReset}
        onGameComplete={handleGameComplete}
      />
    )
  }

  if (appState === 'tiebreaker' && selectedGame) {
    return (
      <TiebreakerScreen
        tiedTeams={tiedTeams}
        allTeams={finalTeams}
        question={selectedGame.tiebreaker}
        onResolved={handleTiebreakerResolved}
      />
    )
  }

  if (appState === 'podium' && selectedGame) {
    return (
      <PodiumScreen
        teams={finalTeams}
        game={selectedGame}
        onPlayAgain={handlePlayAgain}
        onNewBoard={handleReset}
      />
    )
  }

  return null
}

function StatusScreen({ message, detail, actionLabel, onAction }: { message: string; detail?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <p style={{ fontSize: '1.5rem' }}>{message}</p>
      {detail && <p style={{ color: 'var(--color-text-muted, #888)' }}>{detail}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            padding: '0.6rem 1.4rem',
            borderRadius: '0.5rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            background: 'var(--color-btn-primary, #f5a623)',
            color: 'var(--color-btn-primary-text, #09090f)',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

function StatusOverlay({ message, onDismiss, autoHideMs }: { message: string; onDismiss?: () => void; autoHideMs?: number }) {
  // Keep the latest callback in a ref so an inline arrow from the caller does
  // not restart the auto-hide countdown on every parent re-render.
  const dismissRef = useRef(onDismiss)
  useEffect(() => {
    dismissRef.current = onDismiss
  })

  const hasDismiss = onDismiss != null
  useEffect(() => {
    if (!hasDismiss || !autoHideMs) return
    const id = setTimeout(() => dismissRef.current?.(), autoHideMs)
    return () => clearTimeout(id)
  }, [hasDismiss, autoHideMs, message])

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: '2rem',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1.5rem',
        borderRadius: '0.5rem',
        background: 'var(--color-overlay-bg, #09090f)',
        color: 'var(--color-text, #f0f0f8)',
        border: '1px solid var(--color-chip-border, rgba(255, 255, 255, 0.1))',
        boxShadow: 'var(--shadow-tile, 0 3px 12px rgba(0, 0, 0, 0.5))',
        zIndex: 100,
      }}
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Lukk"
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '1.1rem',
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
