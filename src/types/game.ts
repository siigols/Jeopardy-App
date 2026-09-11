export type QuestionType = 'simple' | 'overUnder' | 'yearCountryImage' | 'tenable' | 'multipleChoice' | 'higherLower' | 'beatForBeat'

export interface SimpleQuestion {
  type: 'simple'
  question: string
  answer: string
  /** Optional uploaded image shown alongside the question text. */
  questionImage?: string
  /** Optional uploaded image revealed together with the answer. */
  answerImage?: string
}

export interface OverUnderItem {
  image: string
  label?: string
  answer: 'over' | 'under'
  value: string
}

export interface OverUnderQuestion {
  type: 'overUnder'
  statement: string
  items: OverUnderItem[]
}

export interface YearCountryImageQuestion {
  type: 'yearCountryImage'
  prompt: string
  image: string
  imageAlt?: string
  year: string
  country: string
}

export interface TenableQuestion {
  type: 'tenable'
  prompt: string
  items: string[]
}

export interface MultipleChoiceQuestion {
  type: 'multipleChoice'
  question: string
  options: [string, string, string, string]
  correctIndex: number
  /** Optional uploaded image shown alongside the question text. */
  questionImage?: string
  /** Optional uploaded image revealed together with the correct option. */
  answerImage?: string
}

export interface HigherLowerItem {
  /** Optional: imageless boards (e.g. those built in the editor) render text-only. */
  image?: string
  label: string
  value: string
  numericValue: number
}

export interface HigherLowerQuestion {
  type: 'higherLower'
  metric: string
  items: HigherLowerItem[]
}

/**
 * The two colours a Beat for Beat word can hide. Stored as names rather than as
 * hex so the rendered colour stays a game rule the CSS owns, not board data an
 * author could set to anything.
 */
export type BeatColor = 'blue' | 'red'

/**
 * Beat for Beat: a line from a song, hidden behind one box per word. Picking a
 * box reveals the word together with the colour the author hid behind it.
 *
 * Deliberately carries no points of its own — the tile awards its normal board
 * points, and `tilePointsLabel` leaves it alone, so the board gives no hint that
 * a Beat for Beat question is behind the tile.
 */
export interface BeatForBeatQuestion {
  type: 'beatForBeat'
  /** One box per entry. The line is `words.join(' ')`. */
  words: string[]
  /** Same length as `words`; the colour hidden behind box i. */
  colors: BeatColor[]
  songTitle?: string
  artist?: string
  /**
   * A bare 11-character video id, never a URL. See `parseYouTubeUrl` for why the
   * URL is thrown away at the editor boundary.
   */
  youtubeId?: string
  /** Seconds into the clip to start at. */
  youtubeStart?: number
}

export type QuestionContent = SimpleQuestion | OverUnderQuestion | YearCountryImageQuestion | TenableQuestion | MultipleChoiceQuestion | HigherLowerQuestion | BeatForBeatQuestion

export interface Tile {
  points: number
  content: QuestionContent
  answered: boolean
}

export interface Category {
  name: string
  tiles: Tile[]
}

export interface CategoryColor {
  tile: string
  hover: string
  header: string
}

/**
 * Decorative scene rendered behind the board. The registry (names, order) lives
 * in src/data/boardBackgrounds.ts; the union is here so that module can import
 * it without a cycle.
 */
export type BoardBackgroundId = 'none' | 'football' | 'stjerner' | 'konfetti' | 'sno' | 'bobler'

export interface GameTheme {
  /** Id of the preset this theme came from, so the editor can re-select it. */
  id?: string
  categoryColors: CategoryColor[]
  accent?: string
  bg?: string
  /** Absent means no scene. 'none' is never stored. */
  decorations?: BoardBackgroundId
  /**
   * Optional uploaded photo rendered behind the board, underneath any scene.
   * Absent means no photo; the two are independent and can be combined.
   */
  backgroundImage?: string
}

export interface Game {
  title: string
  description?: string
  categories: Category[]
  theme?: GameTheme
  tiebreaker?: SimpleQuestion
}

/**
 * Board shape limits. Shared by client + server so they can't drift.
 *
 * The number of categories is up to the author; the rows are not, because each
 * row is one fixed point value.
 */
export const BOARD_CATEGORY_MIN = 1
export const BOARD_CATEGORY_MAX = 7
/** Columns a brand-new board starts with. */
export const BOARD_CATEGORY_DEFAULT = 5
export const BOARD_TILE_POINTS = [200, 400, 600, 800, 1000] as const
export const BOARD_TILE_COUNT = BOARD_TILE_POINTS.length
/** Longest board title, enforced by the editor and the server validator alike. */
export const BOARD_TITLE_MAX = 100

/** Question types the board editor can create and round-trip. */
export const EDITABLE_QUESTION_TYPES = [
  'simple',
  'tenable',
  'multipleChoice',
  'higherLower',
  'beatForBeat',
] as const satisfies readonly BoardTileDraft['type'][]
export type EditableQuestionType = BoardTileDraft['type']

/** Fixed shape constraints for the rich editable question types. */
export const TENABLE_ITEM_COUNT = 10
export const MC_OPTION_COUNT = 4
export const HL_MIN_ITEMS = 4
export const HL_MAX_ITEMS = 6
/** Longest lyric line a Beat for Beat tile can hide, in words. */
export const BFB_MAX_WORDS = 40

/**
 * Every image an author can attach is either uploaded through `POST /api/images`
 * (content-addressed: the id is the sha256 of the bytes) or is one of the static
 * files the seeded boards ship with. Nothing else is ever accepted: an arbitrary
 * URL here would let a board author point every player's browser at a third-party
 * host, and `data:`/`javascript:` values have no business in an `<img src>` we
 * render for someone else.
 *
 * Shared by the editor and the server validator so the two can't drift.
 */
const UPLOADED_IMAGE_PATH = /^\/api\/images\/[0-9a-f]{64}$/
// Some seeded filenames contain spaces ('david villa.png'), so the character
// class has to allow them; '..' is rejected separately rather than by omitting
// the dot, which the extension needs anyway.
const STATIC_IMAGE_PATH = /^\/question-images\/[A-Za-z0-9_ .\-/]+\.(png|jpg|jpeg|webp|gif)$/

export function isUploadedImagePath(value: string): boolean {
  if (UPLOADED_IMAGE_PATH.test(value)) return true
  return STATIC_IMAGE_PATH.test(value) && !value.includes('..')
}

/** Field length caps for editable board text. Shared by client + server so they can't drift. */
export const MAX_TILE_TEXT = 500
export const MAX_OPTION_TEXT = 200
export const MAX_LABEL_TEXT = 120
/** A single Beat for Beat word. Long enough for the worst compound noun, short enough to be one box. */
export const MAX_WORD_TEXT = 40

/** A YouTube video id and an optional start offset in seconds. */
export interface YouTubeRef {
  id: string
  start?: number
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

/** True for a bare YouTube video id. Used by the server to re-check a stored id. */
export function isYouTubeVideoId(value: string): boolean {
  return YOUTUBE_ID.test(value)
}

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
])

/**
 * Seconds from a `t`/`start` parameter. Accepts both the plain `90` and the
 * `1m30s` forms YouTube's own share links produce. Returns undefined for
 * anything else rather than guessing.
 */
function parseStartSeconds(raw: string | null): number | undefined {
  if (!raw) return undefined
  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw)
    return Number.isSafeInteger(seconds) && seconds >= 0 ? seconds : undefined
  }
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw)
  if (!match || (!match[1] && !match[2] && !match[3])) return undefined
  const seconds = Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
  return Number.isSafeInteger(seconds) ? seconds : undefined
}

/**
 * Pulls the video id and start offset out of a YouTube link.
 *
 * The URL itself is then thrown away: only the id is ever stored, for the same
 * reason `isUploadedImagePath` refuses arbitrary image URLs. A board is embedded
 * in other people's browsers, and an unconstrained URL in that position is
 * somebody else's request to make. Reconstructing the embed URL from a validated
 * 11-character id means a hostile board can only ever point at YouTube.
 *
 * Returns null for anything that isn't a recognisable YouTube video link.
 */
export function parseYouTubeUrl(raw: string): YouTubeRef | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  let url: URL
  try {
    // Bare ids and scheme-less links ('youtu.be/xxx') are common paste shapes.
    if (isYouTubeVideoId(trimmed)) return { id: trimmed }
    url = new URL(/^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null

  const segments = url.pathname.split('/').filter(Boolean)
  const id =
    url.hostname.toLowerCase() === 'youtu.be'
      ? segments[0]
      : segments[0] === 'embed' || segments[0] === 'shorts' || segments[0] === 'v'
        ? segments[1]
        : url.searchParams.get('v') ?? undefined

  if (!id || !isYouTubeVideoId(id)) return null

  const start = parseStartSeconds(url.searchParams.get('t') ?? url.searchParams.get('start'))
  return start !== undefined && start > 0 ? { id, start } : { id }
}

/** Rebuilds a shareable watch URL, so the editor can round-trip a stored id. */
export function youTubeWatchUrl(ref: YouTubeRef): string {
  const start = ref.start !== undefined && ref.start > 0 ? `&t=${ref.start}` : ''
  return `https://www.youtube.com/watch?v=${ref.id}${start}`
}

/** The embed URL the player iframe loads. Audio only: nothing renders it visibly. */
export function youTubeEmbedUrl(ref: YouTubeRef): string {
  const start = ref.start !== undefined && ref.start > 0 ? `&start=${ref.start}` : ''
  return `https://www.youtube-nocookie.com/embed/${ref.id}?autoplay=1&rel=0${start}`
}

export interface SimpleTileDraft {
  type: 'simple'
  question: string
  answer: string
  questionImage?: string
  answerImage?: string
}

export interface TenableTileDraft {
  type: 'tenable'
  prompt: string
  items: string[]
}

export interface MultipleChoiceTileDraft {
  type: 'multipleChoice'
  question: string
  options: [string, string, string, string]
  correctIndex: number
  questionImage?: string
  answerImage?: string
}

export interface HigherLowerTileDraftItem {
  label: string
  numericValue: number
  image?: string
}

export interface HigherLowerTileDraft {
  type: 'higherLower'
  metric: string
  items: HigherLowerTileDraftItem[]
}

/**
 * Same shape as the stored `BeatForBeatQuestion`: the editor resolves the typed
 * line into words and the pasted link into an id before sending, so nothing is
 * left for `draftToGame` to interpret.
 */
export interface BeatForBeatTileDraft {
  type: 'beatForBeat'
  words: string[]
  colors: BeatColor[]
  songTitle?: string
  artist?: string
  youtubeId?: string
  youtubeStart?: number
}

/** A single editor tile on the wire. Tagged union, chosen per tile. */
export type BoardTileDraft =
  | SimpleTileDraft
  | TenableTileDraft
  | MultipleChoiceTileDraft
  | HigherLowerTileDraft
  | BeatForBeatTileDraft

/** The minimal wire shape the board editor POSTs to /api/boards. */
export interface BoardDraft {
  title: string
  description?: string
  themeId?: string
  backgroundId?: BoardBackgroundId
  /** An uploaded image path, or `null` to clear a photo the board already had. */
  backgroundImage?: string | null
  tiebreaker?: SimpleQuestion
  categories: {
    name: string
    tiles: BoardTileDraft[]
  }[]
}

/** Lightweight board listing returned by GET /api/boards (no tiles). */
export interface BoardSummary {
  id: number
  title: string
  description?: string
  categories: { name: string }[]
  theme?: GameTheme
  /** False for boards using rich question types, which the editor can't round-trip. */
  editable: boolean
}

/** A full board as returned by GET /api/boards/:id. */
export type LoadedGame = Game & { id: number; editable: boolean }

/** Points awarded per correct comparison in a higher/lower question. */
export const HL_POINTS_PER_COMPARISON = 100

/**
 * Number of scoreable comparisons in a higher/lower question (N items -> N-1).
 *
 * Returns 0 for every other question type, and for malformed higherLower
 * content (missing or too-short `items`). Single source of truth for both the
 * board label and the host's "hvor mange riktige?" picker, so a missing `items`
 * can't make one survive while the other throws.
 */
export function higherLowerComparisons(content: QuestionContent): number {
  if (content.type !== 'higherLower') return 0
  return Math.max(0, (content.items?.length ?? 0) - 1)
}

/**
 * Whether a question type takes buzz-ins.
 *
 * Høyere/Lavere and Beat for Beat are host-driven: the host clicks through the
 * comparisons or flips the words, and there is nothing for a team to race to
 * answer first. Leaving the buzzer armed there only produces stray buzzes that
 * burn a team's one buzz for the round.
 */
export function buzzerEnabledForType(type: QuestionType): boolean {
  return type !== 'higherLower' && type !== 'beatForBeat'
}

/**
 * The points a tile actually awards, as shown on the board.
 *
 * Most types award `tile.points` flat, but two ignore it:
 * - `tenable` awards rank × 100, so the range is `0-{TENABLE_ITEM_COUNT * 100}`.
 * - `higherLower` awards {HL_POINTS_PER_COMPARISON} per correct comparison, and
 *   N items give N-1 comparisons.
 *
 * Malformed higherLower content (fewer than 2 items has no comparison at all)
 * falls back to `tile.points`, so the label can never be `0--100` or `NaN`.
 *
 * `isRange` is returned rather than inferred from a hyphen in `label`, so
 * callers styling ranges never have to sniff the string.
 *
 * Lives here rather than in QuestionTile so the board can stay a pure component
 * file; this module has no imports, so it can't create a cycle.
 */
export function tilePointsLabel(tile: Tile): { label: string; isRange: boolean } {
  if (tile.content.type === 'tenable') {
    return { label: `0-${TENABLE_ITEM_COUNT * 100}`, isRange: true }
  }

  if (tile.content.type === 'higherLower') {
    const comparisons = higherLowerComparisons(tile.content)
    if (comparisons > 0) {
      return { label: `0-${comparisons * HL_POINTS_PER_COMPARISON}`, isRange: true }
    }
  }

  return { label: String(tile.points), isRange: false }
}

export interface Team {
  id: string
  name: string
  score: number
}
