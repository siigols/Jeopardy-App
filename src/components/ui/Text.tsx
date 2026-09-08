import { forwardRef } from 'react'
import type { ComponentPropsWithoutRef, ElementType, ReactElement, Ref } from 'react'
import styles from './ui.module.css'
import { cx } from './cx'
import type { TypeSize, TypeTone } from './typeScale'
import { sizeClass, toneClass } from './typeScale'

type TextOwnProps<E extends ElementType> = {
  as?: E
  size?: TypeSize
  tone?: TypeTone
  className?: string
}

export type TextProps<E extends ElementType> = TextOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof TextOwnProps<E>>

function TextInner<E extends ElementType = 'p'>(
  { as, size = 'base', tone = 'default', className, ...rest }: TextProps<E>,
  ref: Ref<Element>,
) {
  const Component = (as ?? 'p') as ElementType
  return (
    <Component
      ref={ref}
      className={cx(styles.text, sizeClass[size], toneClass[tone], className)}
      {...rest}
    />
  )
}

export const Text = forwardRef(TextInner) as <E extends ElementType = 'p'>(
  props: TextProps<E> & { ref?: Ref<Element> },
) => ReactElement | null
