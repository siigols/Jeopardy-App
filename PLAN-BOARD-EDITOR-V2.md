# Plan: Per-tile question types + board color themes

Board editor v2. Extends `/boards/new` and `/boards/:id/edit` from simple-Q&A-only
to four question types chosen **independently per tile**, plus a preset color theme
picker for the board.

## Goal

In the board editor, let the author choose a question type for **each of the 25 tiles
individually** — **Vanlig**, **Topp 10**, **Flervalg (4 alternativer)**,
**Høyere/Lavere (uten bilder)** — and pick a color theme for the board from a set of
presets.

## Decisions locked in

- Type is chosen **per tile**. Mixed columns and mixed boards are the normal case,
  not an edge case. There is no board-level or category-level type setting.
- New tiles start **untyped**; the author picks a type before entering content.
- Changing the type of a filled tile shows a confirm and then **discards** that
  tile's content.
- **Topp 10** (`tenable`): exactly 10 items, all required if the tile is used.
- **Flervalg** (`multipleChoice`): fixed 4 options (A–D) + one correct index —
  matches the existing type, so no renderer change.
- **Høyere/Lavere** (`higherLower`): 4–6 items, each `label` + `numericValue`; the
  display string is auto-formatted from the number (`Intl.NumberFormat('nb-NO')`).
  No images.
- Themes: **presets only**, no custom color pickers.
- Image-based boards (the football board: `overUnder`, `yearCountryImage`,
  image-backed `higherLower`) stay `editable: false` and remain blocked in the editor.
- Rich tiles are edited in a **modal**; the grid cell shows the type selector, a
  summary and a "Rediger" button.

---

## 1. Shared types — `src/types/game.ts`

- `HigherLowerItem.image` becomes optional (`image?: string`) so imageless items are
  representable (`game.ts:44-49`).
- Replace `BoardDraft`'s flat tile shape (`game.ts:97-105`) with a per-tile tagged
  union:

  ```ts
  BoardTileDraft =
    | { type: 'simple';         question; answer }
    | { type: 'tenable';        prompt; items: string[] }                    // 10
    | { type: 'multipleChoice'; question; options: [s,s,s,s]; correctIndex }
    | { type: 'higherLower';    metric; items: { label; numericValue }[] }   // 4-6
  ```

  An untyped tile is sent as a blank `simple` tile, which the current validator
  already accepts.
- `BoardDraft` gains `themeId?: string`.
- `GameTheme` gains `id?: string` so the editor can re-select the chosen preset when
  loading a board (`game.ts:76-81`).
- New constants: `TENABLE_ITEM_COUNT = 10`, `MC_OPTION_COUNT = 4`,
  `HL_MIN_ITEMS = 4`, `HL_MAX_ITEMS = 6`, `EDITABLE_QUESTION_TYPES`.

## 2. Theme presets — new `src/data/boardThemes.ts` (shared client + server)

Exports `BOARD_THEMES: { id, name, theme: GameTheme }[]` — roughly 6 presets
(`classic` = today's jewel palette, plus e.g. `neon`, `skog`, `solnedgang`, `hav`,
`natt`), each with 5 `categoryColors` (`tile` / `hover` / `header`), `accent` and
`bg`. Also exports `getBoardTheme(id): GameTheme | undefined`.

`GameBoard.tsx:12-18`'s `DEFAULT_COLORS` is re-pointed at the `classic` preset so
there is a single source of truth for the default palette.

## 3. Server

### `server/validation.ts` (`validateBoardDraft`, lines 25-139)

- Per tile: read `tile.type`, defaulting to `'simple'` when absent — backwards
  compatible with any older client or payload.
- `simple` — unchanged; blank strings still allowed so partial/draft boards remain
  saveable.
- `tenable` / `multipleChoice` / `higherLower` — a **fully blank** tile is coerced to
  a blank `simple` tile. Otherwise all required fields must be present:
  - `tenable`: `prompt` + exactly 10 non-empty items.
  - `multipleChoice`: `question` + exactly 4 non-empty options + `correctIndex` in 0–3.
  - `higherLower`: `metric` + 4–6 items, each with a non-empty `label` and a finite
    `numericValue`.
- Keeps the existing `MAX_TILE_TEXT` (500) and `MAX_CATEGORY_NAME` caps; adds shorter
  caps for Høyere/Lavere labels and Flervalg options.
- `themeId`: must be a string matching a known preset id, else
  `fail('unknown themeId')`.

### `server/db.ts`

- `draftToGame` (`db.ts:77-92`) switches **per tile** on type to build the correct
  `QuestionContent`. For `higherLower` it derives each item's `value` display string
  from `numericValue` via `Intl.NumberFormat('nb-NO')` and omits `image`. `points`
  stays `BOARD_TILE_POINTS[index]` for all types.
- Theme resolution: `draft.themeId` → `getBoardTheme(id)`; otherwise preserve the
  existing theme on update. Any existing `decorations` value is carried over so the
  football board's decorations survive an edit.
- `boardIsEditable` (`db.ts:49-57`) widens from `type === 'simple'` to the four
  editable types, checked **per tile**, with the extra guard that every
  `higherLower` item has **no** `image`. Consequence: the football board remains
  `editable: false`, as intended.

`server/index.ts` needs no route changes; the 409 "not editable" guard at
`index.ts:107-109` keeps working as-is.

## 4. Gameplay rendering — `src/components/Question/HigherLowerDisplay.tsx`

Currently hard-requires `item.image` (lines 61-85). Change to:

- When `image` is absent, render a text-only panel (large label on a themed gradient
  card) instead of `<img>`.
- Skip the image preload effect (lines 23-29) when the next item has no image.
- `key` falls back to `label`.
- `HigherLowerDisplay.module.css` gains a `.textPanel` variant.

No other renderer changes. `TenableDisplay`, `MultipleChoiceDisplay`,
`SimpleQuestionDisplay` and the `QuestionView` dispatch/award logic
(`QuestionView.tsx:101-126`) already handle fully mixed boards.

## 5. Editor — `src/screens/BoardEditorScreen.tsx`

### Draft model

`TileDraft` (line 18) becomes `{ type: null } | <the four typed shapes>`, stored per
tile in `DraftState.categories[ci].tiles[ti]`. `makeEmptyTile(type)` builds a fresh
tile when a type is selected. `DraftState` gains `themeId`.

- `emptyDraft()` (`:40-50`) — all 25 tiles `type: null`; `themeId: 'classic'`.
- `gameToDraft()` (`:57-79`) — maps each of the four `QuestionContent` types back per
  tile. A blank `simple` tile loads as untyped so it reads as "not filled in";
  unrecognised content falls back to untyped. Reads `game.theme?.id`.
- `toPayload()` (`:81-99`) — emits the tagged union per tile; untyped → blank
  `simple`. Sends `themeId`.
- `validateDraft()` (`:106-120`) — per-type Norwegian messages naming the exact tile,
  e.g. *"Kategori 2, 600 poeng: Topp 10 mangler 3 svar."* Partially-filled tiles
  block the save; untyped/blank tiles do not (partial boards remain allowed), but the
  footer shows a non-blocking count: *"12 av 25 ruter er fylt ut."*

### Grid cell (`:395-429`)

Each `.tileCard` gets:

- an always-visible 4-way type selector for **that tile only** (compact segmented
  control), wired to the existing `updateTile(ci, ti, …)` reducer (`:212-219`);
- untyped state: a muted "Velg type" prompt;
- `simple`: question/answer fields inline, so the common case stays zero-click;
- the other three: a one-line summary with a completeness badge (e.g.
  *"Topp 10 · 7/10"*) and a **Rediger** button;
- switching type on a non-empty tile →
  `window.confirm('Dette sletter innholdet i ruta. Fortsette?')`, then reset to the
  new empty type.

### New `src/components/BoardEditor/TileEditorModal.tsx` (+ `.module.css`)

Focus-trapped dialog, Esc / backdrop close, header *"Kategori 3 · 800 poeng"*. Body
renders one of three sub-forms, each its own small component:

- `TenableForm` — prompt + 10 numbered rows, each labelled with the points that rank
  awards (100–1000).
- `MultipleChoiceForm` — question + 4 A–D inputs + a radio for the correct one.
- `HigherLowerForm` — metric + 4–6 rows of `label` / `numericValue`
  (`inputMode="numeric"`), add/remove buttons within bounds, and a live preview of
  the auto-formatted display string.

All edits write straight into `draft`, so dirty tracking (`:187`), the
`beforeunload` guard and the inline re-unlock flow keep working untouched.

### Theme section

New `<section>` between "Om tavla" and the grid: a row of preset cards, each showing
its 5 color swatches + name, with the selected state highlighted, plus a small live
board preview (category header + one tile) using the chosen palette.

### Blocked message (`:325-336`)

Reworded to name the actual reason: image-based question types.

`BoardEditorScreen.module.css` gains styles for the type selector, summary/badge,
theme cards and preview.

## 6. Board select screen

`BoardSelectScreen.tsx:63-71` hardcodes fallback swatches — re-point those at the
`classic` preset. New boards always carry a theme, so swatches are always accurate.

## 7. Docs

Update the "editor only supports simple questions" caveat in `README.md`; add a short
cross-reference note in `PLAN.md`.

---

## Files touched

| File | Change |
|---|---|
| `src/types/game.ts` | per-tile tagged draft union, optional HL image, `GameTheme.id`, constants |
| `src/data/boardThemes.ts` | **new** — preset palettes |
| `server/validation.ts` | per-tile type validation + `themeId` |
| `server/db.ts` | per-tile `draftToGame`, theme resolution, widened `boardIsEditable` |
| `src/components/Question/HigherLowerDisplay.tsx` + css | imageless panel variant |
| `src/screens/BoardEditorScreen.tsx` + css | per-tile type selector, theme picker, validation, mapping |
| `src/components/BoardEditor/TileEditorModal.tsx` + 3 sub-forms + css | **new** |
| `src/components/Board/GameBoard.tsx` | default palette from presets |
| `src/screens/BoardSelectScreen.tsx` | fallback swatches from presets |
| `README.md`, `PLAN.md` | docs |

## Risks / notes

- **Wire-format change** to `BoardDraft.tiles`. Mitigated by treating a missing
  `type` as `simple` on the server. Stored boards are unaffected — they persist a
  `Game`, not a `BoardDraft`.
- **Tenable scoring quirk:** a Topp 10 tile ignores its own tile points and awards
  `rank × 100` (`QuestionView.tsx:114-116`). This is surfaced in the modal rather
  than changed; changing the rule is out of scope.
- **Untyped tiles are saved as blank simple tiles**, so a half-finished board plays
  with empty tiles — the same as today's behaviour for blank tiles.
- **`yearCountryImage` awards 0 points** (`QuestionView.tsx:82-85`) — untouched, and
  still not authorable.
- No test suite exists in the repo. Verification is `npm run build` (tsc) plus a
  manual create → play → edit → play round-trip on a board that mixes all four types
  within a single category column.
