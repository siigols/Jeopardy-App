import { forwardRef } from 'react'
import type { ComponentPropsWithoutRef, ElementType, ReactElement, Ref } from 'react'
import styles from './ui.module.css'
import { cx } from './cx'

export type CardVariant = 'elevated' | 'outline' | 'subtle'

type CardOwnProps<E extends ElementType> = {
  as?: E
  variant?: CardVariant
  className?: string
}

export type CardProps<E extends ElementType> = CardOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof CardOwnProps<E>>

const variantClass: Record<CardVariant, string> = {
  elevated: styles.cardElevated,
  outline: styles.cardOutline,
  subtle: styles.cardSubtle,
}

function CardInner<E extends ElementType = 'div'>(
  { as, variant = 'elevated', className, ...rest }: CardProps<E>,
  ref: Ref<Element>,
) {
  const Component = (as ?? 'div') as ElementType
  return (
    <Component ref={ref} className={cx(styles.card, variantClass[variant], className)} {...rest} />
  )
}

export const Card = forwardRef(CardInner) as <E extends ElementType = 'div'>(
  props: CardProps<E> & { ref?: Ref<Element> },
) => ReactElement | null
