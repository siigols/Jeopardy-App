import { forwardRef } from 'react'
import type { ComponentPropsWithoutRef, ElementType, ReactElement, Ref } from 'react'

type BoxOwnProps<E extends ElementType> = {
  /** Element (or component) to render. Defaults to `div`. */
  as?: E
  className?: string
}

export type BoxProps<E extends ElementType> = BoxOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof BoxOwnProps<E>>

function BoxInner<E extends ElementType = 'div'>(
  { as, className, ...rest }: BoxProps<E>,
  ref: Ref<Element>,
) {
  const Component = (as ?? 'div') as ElementType
  return <Component ref={ref} className={className} {...rest} />
}

/**
 * The plainest primitive: renders whatever element it is told to and forwards
 * every remaining prop untouched, so handlers, ARIA and inline styles survive.
 */
export const Box = forwardRef(BoxInner) as <E extends ElementType = 'div'>(
  props: BoxProps<E> & { ref?: Ref<Element> },
) => ReactElement | null
