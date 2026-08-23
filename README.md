# Jeopardy App

A Jeopardy game board with a host screen and phone buzzers, built with React +
TypeScript + Vite on the front end and Express + Socket.IO + SQLite on the back end.

## Getting started

```sh
npm install
cp .env.example .env   # optional in dev, see "Environment variables"
npm run dev
```

`npm run dev` starts Vite (front end) and the API/socket server together. The Vite
dev server proxies `/api` and `/socket.io` to `http://localhost:3001`, which is
hardcoded in `vite.config.ts` — it does not read `PORT`. If you change `PORT` in
development you must edit `vite.config.ts` to match, otherwise the proxy silently
keeps pointing at 3001. In production this does not apply: the server serves the
built assets itself, so `PORT` can be set freely.

## Scripts

| Script            | What it does                                                       |
| ----------------- | ------------------------------------------------------------------ |
| `npm run dev`     | Vite dev server + `tsx watch` on `server/index.ts`                  |
| `npm run build`   | `tsc -b` then `vite build` into `dist/`                             |
| `npm run lint`    | ESLint over the repo                                                |
| `npm run preview` | Serves the built front end with Vite                                |
| `npm start`       | Runs the server; serves `dist/` too when it exists                  |

## Environment variables

Copy `.env.example` to `.env` and uncomment what you need. Both `dev` and `start`
load it through Node's built-in `--env-file-if-exists=.env`, so no extra dependency
is involved — but that flag needs Node 20.18+ / 22.9+ (it landed in v22.9.0 and was
backported to v20.18.0; the earlier v20.12.0 change only added multi-line support to
plain `--env-file`). On Node 20.12–20.17 the scripts fail with an unrecognised-flag
error. On older Node, either upgrade or change the scripts to `--env-file=.env` and
make sure a `.env` file always exists (plain `--env-file` fails when the file is
missing).

When no `.env` is present, Node's `.env not found. Continuing without it.` notice is
printed twice — `tsx` re-execs node with the same flags. That is expected and harmless.

### `EDIT_CODE`

The shared secret that gates board creation and editing. The client sends it in the
`x-edit-code` header; the server compares it against `EDIT_CODE`.

```
EDIT_CODE=some-code
```

If `EDIT_CODE` is unset the server falls back to `jeopardy` and prints a warning on
startup. That default is for local development only — set a real value before
deploying.

Failed attempts are rate limited to 10 per IP per 15 minutes, after which the server
answers `429` until the window rolls over.

### `PORT`

Port for the HTTP + socket server. Defaults to `3001`. In development the Vite proxy
target is hardcoded to `localhost:3001`, so changing this also means editing
`vite.config.ts`.

### `TRUST_PROXY`

Off by default. Behind a reverse proxy every request appears to come from the proxy's
address, so the edit-code rate limiter would bucket all clients together and lock
everyone out after 10 failed guesses. Setting `TRUST_PROXY` makes Express derive
`req.ip` from `X-Forwarded-For` instead. It accepts a hop count (`1`), `true`/`false`,
`loopback`, or a comma-separated list of trusted IPs/CIDR ranges. Leave it off when
there is no proxy in front — otherwise clients can spoof the header and dodge the
limiter.

## Board editor

- **"Ny tavle"** on the board-select screen opens a blank editor at `/boards/new`.
- Editable boards show a **pencil icon** on their card, linking to `/boards/:id/edit`.
- The editor covers 5 categories × 5 tiles, plus title, description and an optional
  tiebreaker.
- The board's colour theme is picked from a set of presets — no custom colour pickers.

Both routes sit behind a code gate: you enter the edit code once, it is verified via
`POST /api/verify-code` and kept in `sessionStorage` for the rest of the tab session.

### Question types

Each of the 25 tiles gets its own question type, chosen independently. Mixed columns
and mixed boards are the normal case.

| Type                | What it is                                                        |
| ------------------- | ----------------------------------------------------------------- |
| **Vanlig**          | One question, one answer                                           |
| **Topp 10**         | 10 answers, points awarded by placement                            |
| **Flervalg**        | 4 options, one correct                                             |
| **Høyere/Lavere**   | 4–6 rows of name + number, no images                               |

Vanlig tiles are edited inline in the grid; the other three open in a modal.

Boards that use question types the editor can't author — `overUnder`,
`yearCountryImage`, or `higherLower` rows with images — still cannot be represented in
the editor, so they show no pencil icon and the server rejects writes against them with
`409`. Note that **both** seeded boards report `editable: false`: `Jeopardy!` has an
image-backed `higherLower` tile, and the football board has `yearCountryImage` tiles.
So on a fresh database no board shows a pencil icon. That is expected, not a broken
editor: the pencil only appears on boards you create yourself through **"Ny tavle"**.

## API

| Method | Path              | Auth           | Notes                                            |
| ------ | ----------------- | -------------- | ------------------------------------------------ |
| `GET`  | `/api/boards`     | –              | Board summaries, each with `editable`            |
| `GET`  | `/api/boards/:id` | –              | Full board, with `editable`                      |
| `POST` | `/api/verify-code`| `x-edit-code`  | `{ ok: true }` on success, `401` on a wrong code  |
| `POST` | `/api/boards`     | `x-edit-code`  | `201` with the created board                      |
| `PUT`  | `/api/boards/:id` | `x-edit-code`  | `200` with the updated board; `400` on an invalid id or a draft that fails validation; `404` if the board does not exist; `409` if it is not editable |

There is no `DELETE`.

### Migration note

`POST /api/boards` used to be open. **It now requires the `x-edit-code` header** —
any existing caller (scripts, bookmarks, curl snippets) must be updated or it will
get a `401`:

```sh
curl -X POST http://localhost:3001/api/boards \
  -H 'content-type: application/json' \
  -H "x-edit-code: $EDIT_CODE" \
  -d @board.json
```

## Security caveat

The edit code travels in a plaintext header, so it is only protected if the app is
deployed over HTTPS. It is a single shared secret with no user accounts, no sessions
and no rotation. Treat it as a gate that stops normal people from wandering into the
editor — not as real authentication.
