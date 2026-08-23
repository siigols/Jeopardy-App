# Plan: Board editor with DB persistence + edit code

## Context

The DB backend already exists (`server/db.ts`, SQLite, `boards` table storing `Game`
JSON blobs; `GET /api/boards`, `GET /api/boards/:id`, `POST /api/boards`,
`server/validation.ts`). What's missing is: an update endpoint, an access gate, and
the entire editor UI.

**Decisions:** simple Q&A tiles only · one global env-var code · rich-type boards
(the football seed) are blocked from editing · no delete · react-router.

> **Superseded in part:** the "simple Q&A tiles only" decision was lifted in
> `PLAN-BOARD-EDITOR-V2.md`, which adds per-tile question types (Vanlig, Topp 10,
> Flervalg, Høyere/Lavere) and preset board themes. Only image-based boards stay
> uneditable.

Note on react-router: `App.tsx`'s state machine is deeply intertwined with
sessionStorage restore logic, so this is a **minimal router integration** — keep
`App.tsx` intact as the `/` route, add `/boards/*` routes alongside. Converting
every screen to a route is a separate, larger refactor.

---

## Phase 1 — Server

### 1.1 `server/auth.ts` (new)

```ts
const EDIT_CODE = process.env.EDIT_CODE ?? 'jeopardy'
export function requireEditCode(req, res, next) {
  const supplied = req.get('x-edit-code')
  if (typeof supplied !== 'string' || supplied !== EDIT_CODE) {
    return res.status(401).json({ error: 'Feil kode' })
  }
  next()
}
```

- Warn to stdout on boot if `EDIT_CODE` is unset (dev default in use).
- Add `POST /api/verify-code` (also behind `requireEditCode`) returning `{ ok: true }`,
  so the unlock screen can validate before showing the editor.
- Add a small in-memory rate limiter (e.g. 10 failed attempts per IP per 15 min → 429)
  purely to blunt brute force. Explicitly not hack-proof — it's a shared secret over
  whatever transport the deploy uses.

### 1.2 `server/db.ts` — add `updateBoard(id, draft)`

- Read existing row; `JSON.parse` its `data` into a `Game`.
- Rebuild `categories` from the draft using the same `BOARD_TILE_POINTS`-by-index
  mapping as `createBoard` (`db.ts:89`), all `content.type: 'simple'`, `answered: false`.
- **Preserve** the existing `theme` field (don't clobber board colors).
- Write `title`, `description`, `data`; add an `updated_at TEXT` column via an
  idempotent `ALTER TABLE` guarded by a `PRAGMA table_info` check (SQLite has no
  `ADD COLUMN IF NOT EXISTS`).
- Return `LoadedGame | null` (null → 404).

Also add `boardIsEditable(game): boolean` — true iff every tile's
`content.type === 'simple'`. Expose it as an `editable: boolean` field on both
`BoardSummary` (`getAllBoards`) and the `GET /api/boards/:id` response so the UI can
grey out the football board without a second round-trip.

> **Superseded:** `boardIsEditable` no longer keys off `'simple'` alone — see
> `PLAN-BOARD-EDITOR-V2.md` and `server/db.ts` for the current rule.

### 1.3 `server/index.ts` — routes

- `POST /api/boards` → add `requireEditCode` (it is currently open to the world).
- `PUT /api/boards/:id` → `requireEditCode`, parse+validate id, `validateBoardDraft`,
  reject with **409** if the target board is not editable (rich types would be
  silently destroyed), else `updateBoard` → 200 `LoadedGame`.
- No `DELETE`.

### 1.4 `server/validation.ts`

No changes needed — `validateBoardDraft` already covers the exact `BoardDraft` shape
the editor will POST/PUT. Reuse verbatim for both.

---

## Phase 2 — Routing

### 2.1 `npm i react-router-dom`

### 2.2 `src/main.tsx`

Wrap in `<BrowserRouter>` with routes:

| Route              | Element                              |
| ------------------ | ------------------------------------ |
| `/`                | `<App />` (unchanged state machine)  |
| `/boards/new`      | `<BoardEditorScreen mode="create" />`|
| `/boards/:id/edit` | `<BoardEditorScreen mode="edit" />`  |
| `*`                | `<Navigate to="/" replace />`        |

`App.tsx` itself stays as-is apart from wiring nav callbacks (§3.4). This keeps the
fragile restore/persist logic (`App.tsx:110-174`) untouched.

### 2.3 SPA catch-all

`server/index.ts:66-68` already serves `dist/index.html` for `app.get('*')`, so deep
links work in prod. In dev, Vite's default `appType: 'spa'` handles it — verify
`/boards/new` isn't swallowed by the `/api` proxy (it won't be; the proxy only
matches `/api` and `/socket.io`).

---

## Phase 3 — Client

### 3.1 `src/utils/editCode.ts` (new)

`sessionStorage` under `jeopardy:editCode` — get / set / clear. Session-scoped,
matching the existing `sessionStore.ts` convention. Not localStorage: the code
shouldn't survive closing the tab on a shared laptop.

### 3.2 `src/components/CodeGate/` (new)

Renders a password input + "Lås opp". On submit → `POST /api/verify-code` with the
`x-edit-code` header → on 200 store the code and render `children`; on 401 show
"Feil kode". If a code is already in sessionStorage, verify it silently on mount and
skip the prompt. Wraps `BoardEditorScreen`.

### 3.3 `src/screens/BoardEditorScreen.tsx` + `.module.css` (new — bulk of the work)

State: `{ title, description, tiebreaker: {question, answer}, categories: [{name,
tiles:[{question,answer}] × 5}] × 5 }` — i.e. exactly `BoardDraft`.

- **create mode:** initialise empty from `BOARD_CATEGORY_COUNT` / `BOARD_TILE_COUNT`.
- **edit mode:** `GET /api/boards/:id` on mount (with `AbortController`, mirroring
  `App.tsx:180-205`), then flatten `Game` → `BoardDraft`. If `editable === false`,
  show a blocking message ("Denne tavla bruker avanserte spørsmålstyper og kan ikke
  redigeres her") with a back link.
- **Layout:** 5 columns, each a category-name input above 5 point-labelled tile cards;
  each card has a question `<textarea>` and an answer `<input>`. Plus title/description
  at the top and an optional tiebreaker section at the bottom. Controlled inputs with
  `maxLength` matching the server limits (100/300/60/500) — copy the pattern from
  `SetupScreen.tsx:67`, styled with CSS Modules and the existing `--color-input-bg` /
  `--color-input-border` vars. Wire `playHover`/`playClick` from `useSounds` for
  consistency.
- **Save:** `POST` or `PUT` with `x-edit-code`; disabled while in flight; on 401 clear
  the stored code and bounce back to the gate; on 400 surface the server's message
  inline; on success `navigate('/')`.
- **Unsaved-changes guard:** `beforeunload` + a confirm on the back button. A 25-tile
  form is a lot to lose to a stray click.

### 3.4 `src/screens/BoardSelectScreen.tsx`

- "Ny tavle" button → `navigate('/boards/new')`.
- Per-card edit affordance (pencil icon), rendered only when `board.editable`, →
  `navigate('/boards/${id}/edit')`. Must `stopPropagation` so it doesn't also trigger
  `onSelect`.

### 3.5 `src/types/game.ts`

Add `editable: boolean` to `BoardSummary` and a `LoadedGame` variant carrying it.
Types are shared with the server (it imports `../src/types/game.js`), so this is one
edit for both sides.

---

## Phase 4 — Config & docs

- `.env.example` with `EDIT_CODE=`; confirm `.env` is gitignored; load via
  `node --env-file` or add `dotenv` (`tsx` doesn't auto-load `.env`).
- `.gitignore` already covers `jeopardy.db`. Note: **`dist/` is currently committed
  despite being gitignored** — worth removing from the index in a separate commit,
  out of scope here.
- README: how to set the code, and the migration note that `POST /api/boards` is now
  authenticated.

---

## Phase 5 — Verification (manual; repo has no test runner)

1. `npm run build` + `npm run lint` clean.
2. Create a board → appears in list → playable end-to-end (tiles, buzzer, podium).
3. Edit that board → changes persist → still playable.
4. Football board shows no edit button; `PUT` against it returns 409.
5. Wrong code → 401, no write. `POST` with no header → 401.
6. Deep-link `/boards/new` in prod build → serves the app, not a 404.
7. Restart server → boards persist, no re-seed (seed only runs on empty table).

---

## Risks

- **`createBoard`/`updateBoard` only emit `simple` tiles.** Locking rich boards out of
  the editor is the safety valve; enforce `boardIsEditable` server-side in `PUT`, not
  just hidden in the UI.
- **react-router adds a dep and a `main.tsx` change** — `buzz-main.tsx` is a separate
  entry and must *not* get the router.
- **The code travels in a header in plaintext** unless deployed over HTTPS. Acceptable
  per the "stop normal people" bar, but worth stating in the README.
