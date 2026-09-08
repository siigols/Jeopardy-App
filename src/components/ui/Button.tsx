import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import styles from './ui.module.css'
import { cx } from './cx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon' | 'unstyled'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClass: Record<Exclude<ButtonVariant, 'unstyled'>, string> = {
  primary: styles.btnPrimary,
  secondary: styles.btnSecondary,
  ghost: styles.btnGhost,
  icon: styles.btnIcon,
}

const sizeClass: Record<ButtonSize, string> = {
  sm: styles.btnSm,
  md: styles.btnMd,
  lg: styles.btnLg,
}

/**
 * Note: no default `type` is set. The board editor renders real `<form>`s that
 * rely on the native submit default, so injecting `type="button"` here would
 * silently change behaviour.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, ...rest },
  ref,
) {
  if (variant === 'unstyled') {
    return <button ref={ref} className={className} {...rest} />
  }
  return (
    <button
      ref={ref}
      className={cx(styles.btn, sizeClass[size], variantClass[variant], className)}
      {...rest}
    />
  )
})
