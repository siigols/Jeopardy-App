import { forwardRef } from 'react'
import type { ComponentPropsWithoutRef, ElementType, ReactElement, Ref } from 'react'
import styles from './ui.module.css'
import { cx } from './cx'
import type { TypeSize, TypeTone } from './typeScale'
import { sizeClass, toneClass } from './typeScale'

type HeadingOwnProps<E extends ElementType> = {
  as?: E
  size?: TypeSize
  tone?: TypeTone
  className?: string
}

export type HeadingProps<E extends ElementType> = HeadingOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof HeadingOwnProps<E>>

function HeadingInner<E extends ElementType = 'h2'>(
  { as, size = 'xl', tone = 'default', className, ...rest }: HeadingProps<E>,
  ref: Ref<Element>,
) {
  const Component = (as ?? 'h2') as ElementType
  return (
    <Component
      ref={ref}
      className={cx(styles.heading, sizeClass[size], toneClass[tone], className)}
      {...rest}
    />
  )
}

export const Heading = forwardRef(HeadingInner) as <E extends ElementType = 'h2'>(
  props: HeadingProps<E> & { ref?: Ref<Element> },
) => ReactElement | null
