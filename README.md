# Jeopardy App

A Jeopardy game board with a host screen and phone buzzers, built with React +
TypeScript + Vite on the front end and Express + Socket.IO + libSQL on the back end.

Boards are stored in a libSQL database: a local file in development, a hosted
[Turso](https://turso.tech) database in production. See [Database](#database).

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

## Database

Storage lives entirely in `server/db.ts`, behind `getAllBoards`, `getBoard`,
`createBoard` and `updateBoard`. A board is one row: the whole `Game` object is
serialised into a `data` JSON column, with `title` and `description` denormalised
alongside it for the board list.

The driver is `@libsql/client`, which speaks to both a local SQLite file and a
hosted Turso database with the same API, so there is a single code path.

### Why not a local file in production

The app is deployed to a host with an ephemeral filesystem (Render's free plan).
The container is recycled on every deploy and after periods of inactivity, and the
filesystem goes with it — so a `server/jeopardy.db` file would take every board
anyone created down with it. That is why production points at a database that lives
outside the container. The server enforces this: with `NODE_ENV=production` and no
`TURSO_DATABASE_URL`, it refuses to start rather than quietly losing data later.

### Setting up Turso

Install the CLI with the official script. Avoid Homebrew here: the formula lives in
`tursodatabase/tap` (the older `libsql/sqld` tap is deprecated and will fail), and
recent Homebrew versions additionally require an explicit `brew trust` step per tap.
The script sidesteps both.

```sh
curl -sSfL https://get.tur.so/install.sh | bash
exec $SHELL -l          # pick up the new PATH entry
turso --version
```

```sh
turso auth signup

turso db create jeopardy
turso db show jeopardy --url           # -> TURSO_DATABASE_URL
turso db tokens create jeopardy        # -> TURSO_AUTH_TOKEN
```

Everything above can also be done without the CLI at
[app.turso.tech](https://app.turso.tech) — create a database, then read the URL and
generate a token from its dashboard.

Schema creation, the `updated_at` migration and the initial seed all run at startup
via `initDb()`, so there is no separate provisioning step — an empty database is set
up on first boot.

### Migrating existing local boards

If you already have boards in `server/jeopardy.db` and want to keep them:

```sh
TURSO_DATABASE_URL='libsql://...' TURSO_AUTH_TOKEN='...' npm run migrate:turso
```

The local file is opened read-only and never modified. Board ids are reassigned by
the target database rather than preserved — nothing outside the database holds onto
a board id permanently. The script refuses to run against a target that already
holds real boards (pass `--force` to override), and clears the two auto-seeded
sample boards first so migrating them from the local file does not duplicate them.

## Deployment (Render)

`render.yaml` is a Render Blueprint: connect the repo as a Blueprint and Render
reads the build/start commands from it. `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` and
`EDIT_CODE` are marked `sync: false`, so Render prompts for them in the dashboard and
they are never committed.

If the service was created by hand rather than from the Blueprint, Render will not
read `render.yaml` at all — set the build command, start command and every variable
in the dashboard yourself.

### `npm ci --include=dev` is not optional

The build command is `npm ci --include=dev && npm run build`, not plain `npm ci`.
`NODE_ENV=production` makes npm skip `devDependencies`, and the entire build
toolchain — `vite`, `typescript`, `@vitejs/plugin-react` — lives there. Without the
flag nothing the build needs is installed and `tsc -b` fails with:

```
error TS2688: Cannot find type definition file for 'vite/client'.
vite.config.ts(1,30): error TS2307: Cannot find module 'vite'
```

The flag only affects installation. The running server still sees
`NODE_ENV=production`.

`tsx` is a runtime dependency, not a dev one, because `npm start` executes the
server through it — moving it to `devDependencies` would break the deploy.

### Free plan caveat

The server still sleeps after inactivity — the first request after a sleep is slow,
and any in-progress buzzer session is lost, since sessions are deliberately kept in
memory (`server/session.ts`). Boards now survive this; live game state does not, and
is not meant to.

## CI

`.github/workflows/ci.yml` runs on every pull request and every push to `main`. It
deliberately mirrors the Render build exactly — same Node version, same
`NODE_ENV=production`, same install and build commands — so a deploy-breaking change
fails in CI first. It then boots the server against a throwaway local database and
checks that `/api/boards` responds, since the server runs straight from TypeScript
and is otherwise never exercised by the build.

`npm run lint` is not in CI yet: the React sources currently have pre-existing
`react-hooks/purity` errors that would keep the pipeline permanently red. `server/`
and `scripts/` are lint-clean.

## Scripts

| Script                 | What it does                                                  |
| ---------------------- | ------------------------------------------------------------- |
| `npm run dev`          | Vite dev server + `tsx watch` on `server/index.ts`             |
| `npm run build`        | `tsc -b` then `vite build` into `dist/`                        |
| `npm run lint`         | ESLint over the repo                                           |
| `npm run preview`      | Serves the built front end with Vite                           |
| `npm start`            | Runs the server; serves `dist/` too when it exists             |
| `npm run migrate:turso`| One-off copy of local boards into a hosted Turso database      |

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

### `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`

Where boards are stored. Optional in development — the server falls back to
`server/jeopardy.db` and warns. **Required in production**: with `NODE_ENV=production`
and no URL set, the server exits rather than start on a filesystem that will be wiped.

```
# dev
TURSO_DATABASE_URL=file:./server/jeopardy.db

# prod
TURSO_DATABASE_URL=libsql://your-db-your-org.turso.io
TURSO_AUTH_TOKEN=...
```

`TURSO_AUTH_TOKEN` is only needed for a `libsql://` URL.

### `EDIT_CODE`

The shared secret that gates board creation and editing. The client sends it in the
`x-edit-code` header; the server compares it against `EDIT_CODE`.

```
EDIT_CODE=some-code
```

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
- Editable boards show a **pencil icon** on their card, linking to `/boards/:id/edit`,
  and a **copy icon** that duplicates the board as "«Tittel» (kopi)" via
  `POST /api/boards/:id/copy`. The copy is a new board — editing it leaves the
  original untouched.
- The editor covers 1–7 categories (added and removed in the editor) × 5 tiles, plus
  title, description and an optional tiebreaker.
- The board's colour theme is picked from a set of presets — no custom colour pickers.
- The background is a preset scene (stjerner, konfetti, …) plus, optionally, a photo you
  upload. The two are independent layers, so a board can have either or both.

Both routes sit behind a code gate: you enter the edit code once, it is verified via
`POST /api/verify-code` and kept in `sessionStorage` for the rest of the tab session.

### Question types

Every tile gets its own question type, chosen independently. Mixed columns and mixed
boards are the normal case.

| Type                | What it is                                                        |
| ------------------- | ----------------------------------------------------------------- |
| **Vanlig**          | One question, one answer, each with an optional image             |
| **Topp 10**         | 10 answers, points awarded by placement                            |
| **Flervalg**        | 4 options, one correct; optional question and answer images        |
| **Høyere/Lavere**   | 4–6 rows of name + number, each row with an optional image         |
| **Beat for Beat**   | A song line hidden behind one box per word, each hiding blue or red |

Vanlig tiles are edited inline in the grid; the other four open in a modal.

Every image slot is optional and independent — a Høyere/Lavere question can mix rows
with and without pictures, and rows without one render as text cards.

Beat for Beat works like the TV game: the author types one line from a song, and each
word becomes a box the teams can pick. Picking a box reveals the word together with the
colour — blue or red — the author put behind it; those two colours are hardcoded and stay
the same in every board theme and in both light and dark mode. The tile awards its normal
board points and looks like any other tile, so teams get no warning that it is coming.

An optional YouTube link gives the host a "Spill av" button. Only the 11-character video
id (and a start offset) is ever stored — the pasted URL is parsed by `parseYouTubeUrl` and
then thrown away, for the same reason board images are restricted to paths this app serves
itself. The player is mounted only on the host's click and is one invisible pixel, so the
clip is audio only.

Boards that use question types the editor can't author — `overUnder` and
`yearCountryImage` — cannot be represented in the editor, so they show no pencil icon
and the server rejects writes against them with `409`. Of the seeded boards, only the
football board is locked that way; `Jeopardy!` is editable despite its image-backed
`higherLower` tile.

### Images

Images are uploaded through the editor, not committed to the repo. The browser scales
each one down (max 1600 px on the longest edge) and re-encodes it before uploading, so a
phone photo arrives as a file of a few hundred kilobytes.

The bytes are stored in the `images` table of the same libSQL database as the boards —
the host's filesystem is wiped on restart, so a file written into `public/` would not
survive a deploy. A board stores only the short `/api/images/<sha256>` path. The id being
the hash of the bytes makes uploads content-addressed: the same photo is only ever stored
once, and responses are cached immutably.

Only paths this app serves are accepted in a board's image fields — an uploaded
`/api/images/…` path, or one of the static `/question-images/…` files the seeded boards
use. External URLs and `data:` values are rejected with a `400`.

The static files under `public/question-images/` remain for the seeded boards; new
images do not go there.

## API

| Method | Path              | Auth           | Notes                                            |
| ------ | ----------------- | -------------- | ------------------------------------------------ |
| `GET`  | `/api/boards`     | –              | Board summaries, each with `editable`            |
| `GET`  | `/api/boards/:id` | –              | Full board, with `editable`                      |
| `POST` | `/api/verify-code`| `x-edit-code`  | `{ ok: true }` on success, `401` on a wrong code  |
| `POST` | `/api/boards`     | `x-edit-code`  | `201` with the created board                      |
| `PUT`  | `/api/boards/:id` | `x-edit-code`  | `200` with the updated board; `400` on an invalid id or a draft that fails validation; `404` if the board does not exist; `409` if it is not editable |
| `POST` | `/api/images`     | `x-edit-code`  | Raw JPEG/PNG/WebP body, max 600 KB; `201` with `{ url }`; `415` if the bytes are not one of those formats |
| `GET`  | `/api/images/:id` | –              | The stored image, cached immutably; `404` for an unknown or malformed id |

There is no `DELETE`. Images a board stops referencing stay in the `images` table;
there is no garbage collection yet.

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
