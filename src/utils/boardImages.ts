import type { Game, QuestionContent } from '../types/game'

export interface BoardImageRef {
  /** The URL as it will be requested by the running board. */
  url: string
  /** Human-readable position, e.g. "Kategori 2 · 600 · svar-bilde". */
  location: string
  /** Where to jump in the preview. -1/-1 for board-level images (background). */
  ci: number
  ti: number
}

/** Every picture a single tile's content refers to, with a role label for each. */
function contentImages(content: QuestionContent): { url: string; role: string }[] {
  switch (content.type) {
    case 'simple':
    case 'multipleChoice':
      return [
        ...(content.questionImage ? [{ url: content.questionImage, role: 'bilde i spørsmålet' }] : []),
        ...(content.answerImage ? [{ url: content.answerImage, role: 'bilde i svaret' }] : []),
      ]
    case 'higherLower':
      return content.items.flatMap((item, i) =>
        item.image ? [{ url: item.image, role: `rad ${i + 1}${item.label ? ` (${item.label})` : ''}` }] : [],
      )
    // The editor cannot author these two, but older boards use them and can be
    // opened in the preview, so they are collected as well.
    case 'overUnder':
      return content.items.flatMap((item, i) =>
        item.image ? [{ url: item.image, role: `bilde ${i + 1}${item.label ? ` (${item.label})` : ''}` }] : [],
      )
    case 'yearCountryImage':
      return content.image ? [{ url: content.image, role: 'bilde' }] : []
    case 'tenable':
      return []
  }
}

/**
 * Collects every image a board references, in board order, so the preview can
 * verify they all load without the author opening 25 tiles one by one.
 */
export function collectBoardImages(game: Game): BoardImageRef[] {
  const refs: BoardImageRef[] = []

  if (game.theme?.backgroundImage) {
    refs.push({ url: game.theme.backgroundImage, location: 'Bakgrunnsbilde', ci: -1, ti: -1 })
  }

  game.categories.forEach((category, ci) => {
    const categoryName = category.name.trim() || `Kategori ${ci + 1}`
    category.tiles.forEach((tile, ti) => {
      for (const { url, role } of contentImages(tile.content)) {
        refs.push({ url, location: `${categoryName} · ${tile.points} · ${role}`, ci, ti })
      }
    })
  })

  return refs
}
