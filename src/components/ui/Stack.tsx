import { forwardRef } from 'react'
import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactElement, Ref } from 'react'
import styles from './ui.module.css'
import { cx } from './cx'

/** Steps on the 4px spacing scale (`--sp-1` … `--sp-12`). */
export type StackGap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

type StackOwnProps<E extends ElementType> = {
  as?: E
  gap?: StackGap
  align?: CSSProperties['alignItems']
  justify?: CSSProperties['justifyContent']
  wrap?: boolean
  className?: string
  style?: CSSProperties
}

export type StackProps<E extends ElementType> = StackOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof StackOwnProps<E>>

function gapValue(gap: StackGap | undefined): string | undefined {
  if (gap == null) return undefined
  return gap === 0 ? '0' : `var(--sp-${gap})`
}

function makeStack(direction: 'hstack' | 'vstack') {
  function StackInner<E extends ElementType = 'div'>(
    { as, gap, align, justify, wrap, className, style, ...rest }: StackProps<E>,
    ref: Ref<Element>,
  ) {
    const Component = (as ?? 'div') as ElementType
    return (
      <Component
        ref={ref}
        className={cx(styles.stack, styles[direction], className)}
        style={{
          gap: gapValue(gap),
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : undefined,
          ...style,
        }}
        {...rest}
      />
    )
  }
  return forwardRef(StackInner) as <E extends ElementType = 'div'>(
    props: StackProps<E> & { ref?: Ref<Element> },
  ) => ReactElement | null
}

export const HStack = makeStack('hstack')
export const VStack = makeStack('vstack')
