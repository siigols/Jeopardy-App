import type { CategoryColor, GameTheme } from '../types/game'

/** A selectable color theme in the board editor. */
export interface BoardThemePreset {
  id: string
  name: string
  theme: GameTheme
}

/** The classic palette, also used as the fallback when a board has no theme. */
const CLASSIC_CATEGORY_COLORS: CategoryColor[] = [
  { tile: '#4a1280', hover: '#5e18a0', header: '#330d5c' },
  { tile: '#0d5e56', hover: '#107a70', header: '#094440' },
  { tile: '#7c1038', hover: '#9e1448', header: '#590b28' },
  { tile: '#7a3008', hover: '#9c3e0a', header: '#562005' },
  { tile: '#1a5c3a', hover: '#22784c', header: '#10402a' },
]

/**
 * Preset palettes offered by the board editor. Each theme has exactly five
 * category colors (tile / hover / header, darkest last) so white text stays
 * readable on every surface. Shared by client and server.
 */
export const BOARD_THEMES: BoardThemePreset[] = [
  {
    id: 'classic',
    name: 'Klassisk',
    theme: {
      id: 'classic',
      accent: '#f5c542',
      bg: '#0b0b1a',
      categoryColors: CLASSIC_CATEGORY_COLORS,
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    theme: {
      id: 'neon',
      accent: '#2de2e6',
      bg: '#0a0718',
      categoryColors: [
        { tile: '#12106b', hover: '#1a1793', header: '#0b0a45' },
        { tile: '#6d1173', hover: '#8d1794', header: '#470b4b' },
        { tile: '#0b5f74', hover: '#0f7d97', header: '#07404e' },
        { tile: '#8a1055', hover: '#b0156d', header: '#5c0a39' },
        { tile: '#155c1f', hover: '#1c7a2a', header: '#0d3d14' },
      ],
    },
  },
  {
    id: 'skog',
    name: 'Skog',
    theme: {
      id: 'skog',
      accent: '#c8e6a0',
      bg: '#0a140d',
      categoryColors: [
        { tile: '#1d4d2b', hover: '#276639', header: '#123420' },
        { tile: '#31572c', hover: '#41733a', header: '#1f3a1c' },
        { tile: '#4a5620', hover: '#63722b', header: '#2f3714' },
        { tile: '#1a4f4a', hover: '#236a63', header: '#103532' },
        { tile: '#5a3d18', hover: '#775121', header: '#3b280f' },
      ],
    },
  },
  {
    id: 'solnedgang',
    name: 'Solnedgang',
    theme: {
      id: 'solnedgang',
      accent: '#ffd08a',
      bg: '#1a0a12',
      categoryColors: [
        { tile: '#8c2f0d', hover: '#b03d12', header: '#601f08' },
        { tile: '#a33b17', hover: '#c94d1f', header: '#6f280f' },
        { tile: '#8a1443', hover: '#ae1a55', header: '#5e0e2e' },
        { tile: '#6b2160', hover: '#8a2b7c', header: '#481641' },
        { tile: '#9c5a08', hover: '#c2730c', header: '#6a3d05' },
      ],
    },
  },
  {
    id: 'hav',
    name: 'Hav',
    theme: {
      id: 'hav',
      accent: '#7fdfff',
      bg: '#04101c',
      categoryColors: [
        { tile: '#0b3a63', hover: '#0f4d82', header: '#072742' },
        { tile: '#0d4f60', hover: '#116a7f', header: '#093640' },
        { tile: '#123a7a', hover: '#184ea1', header: '#0c2752' },
        { tile: '#0a5a52', hover: '#0e766b', header: '#073d38' },
        { tile: '#2a3f7a', hover: '#3853a1', header: '#1c2b52' },
      ],
    },
  },
  {
    id: 'natt',
    name: 'Natt',
    theme: {
      id: 'natt',
      accent: '#b9c3ff',
      bg: '#050510',
      categoryColors: [
        { tile: '#1e2140', hover: '#2b2f58', header: '#14162c' },
        { tile: '#2a2350', hover: '#3a306c', header: '#1c1736' },
        { tile: '#1c2c44', hover: '#283c5c', header: '#131e2e' },
        { tile: '#382348', hover: '#4c3062', header: '#251731' },
        { tile: '#232f3a', hover: '#314150', header: '#172029' },
      ],
    },
  },
  {
    id: 'lava',
    name: 'Lava',
    theme: {
      id: 'lava',
      accent: '#ffb347',
      bg: '#170707',
      categoryColors: [
        { tile: '#7a1005', hover: '#9c1507', header: '#520a03' },
        { tile: '#8f2c06', hover: '#b53908', header: '#5f1d04' },
        { tile: '#6b0f2a', hover: '#8a1436', header: '#4a0a1d' },
        { tile: '#93430a', hover: '#ba550d', header: '#622c06' },
        { tile: '#5a1450', hover: '#761a69', header: '#3c0d35' },
      ],
    },
  },
  {
    id: 'is',
    name: 'Is',
    theme: {
      id: 'is',
      accent: '#a8e6ff',
      bg: '#060f16',
      categoryColors: [
        { tile: '#14456b', hover: '#1a5a8b', header: '#0d2e47' },
        { tile: '#10566b', hover: '#156f8b', header: '#0b3947' },
        { tile: '#1d3f6e', hover: '#26538f', header: '#132a49' },
        { tile: '#0f5a5f', hover: '#14767c', header: '#0a3c40' },
        { tile: '#2b3f66', hover: '#385286', header: '#1c2a44' },
      ],
    },
  },
  {
    id: 'juvel',
    name: 'Juvel',
    theme: {
      id: 'juvel',
      accent: '#f3c1ff',
      bg: '#120616',
      categoryColors: [
        { tile: '#4b0f52', hover: '#63146d', header: '#320a37' },
        { tile: '#10474a', hover: '#155e62', header: '#0b2f31' },
        { tile: '#6d1030', hover: '#8d1540', header: '#490a20' },
        { tile: '#2a2a72', hover: '#383896', header: '#1c1c4c' },
        { tile: '#6b4a05', hover: '#8c6107', header: '#473106' },
      ],
    },
  },
  {
    id: 'retro',
    name: 'Retro',
    theme: {
      id: 'retro',
      accent: '#ffd166',
      bg: '#141019',
      categoryColors: [
        { tile: '#7a3b2e', hover: '#9c4c3b', header: '#52281f' },
        { tile: '#2f5d50', hover: '#3d7968', header: '#1f3e35' },
        { tile: '#6b4a1f', hover: '#8a6029', header: '#472f14' },
        { tile: '#4a3566', hover: '#604485', header: '#312344' },
        { tile: '#7a2f4a', hover: '#9c3d5f', header: '#521f32' },
      ],
    },
  },
  {
    id: 'sitrus',
    name: 'Sitrus',
    theme: {
      id: 'sitrus',
      accent: '#f7f36f',
      bg: '#101403',
      categoryColors: [
        { tile: '#4f5c08', hover: '#68790b', header: '#353d05' },
        { tile: '#2c5c1a', hover: '#3a7a23', header: '#1d3d11' },
        { tile: '#6b5a05', hover: '#8b7507', header: '#473c04' },
        { tile: '#1f5c47', hover: '#297a5e', header: '#143d2f' },
        { tile: '#6b3d05', hover: '#8b5007', header: '#472906' },
      ],
    },
  },
]

export const DEFAULT_BOARD_THEME_ID = 'classic'

/** Looks up a preset palette by id. Returns undefined for unknown ids. */
export function getBoardTheme(id: string | undefined): GameTheme | undefined {
  if (!id) return undefined
  return BOARD_THEMES.find(t => t.id === id)?.theme
}

/** Palette used when a board carries no theme of its own. */
export const DEFAULT_CATEGORY_COLORS = CLASSIC_CATEGORY_COLORS
