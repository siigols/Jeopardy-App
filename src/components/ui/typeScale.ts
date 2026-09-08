import styles from './ui.module.css'

export type TypeSize = 'xs' | 'sm' | 'md' | 'base' | 'lg' | 'xl' | '2xl' | '3xl'
export type TypeTone = 'default' | 'muted' | 'accent'

export const sizeClass: Record<TypeSize, string> = {
  xs: styles.sizeXs,
  sm: styles.sizeSm,
  md: styles.sizeMd,
  base: styles.sizeBase,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
  '2xl': styles.size2xl,
  '3xl': styles.size3xl,
}

export const toneClass: Record<TypeTone, string> = {
  default: styles.toneDefault,
  muted: styles.toneMuted,
  accent: styles.toneAccent,
}
