import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import styles from './ui.module.css'
import { cx } from './cx'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Opt out of the shared styling and keep only the caller's className. */
  unstyled?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, unstyled = false, ...rest },
  ref,
) {
  return <input ref={ref} className={unstyled ? className : cx(styles.input, className)} {...rest} />
})
