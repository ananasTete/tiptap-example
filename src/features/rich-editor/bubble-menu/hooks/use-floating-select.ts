import { useState, useCallback, useMemo } from 'react'
import {
  useFloating,
  useClick,
  useDismiss,
  useInteractions,
  offset,
  flip,
  shift,
  autoUpdate,
  type Placement,
} from '@floating-ui/react'

interface UseFloatingSelectOptions {
  placement?: Placement
  offsetValue?: number
}

export function useFloatingSelect(options: UseFloatingSelectOptions = {}) {
  const { placement = 'bottom-start', offsetValue = 8 } = options
  const [isOpen, setIsOpen] = useState(false)

  const {
    refs,
    floatingStyles,
    context,
    elements,
  } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    middleware: [offset(offsetValue), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })

  const click = useClick(context)
  const dismiss = useDismiss(context)

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ])

  const isPositioned = !!elements.floating && floatingStyles.transform

  const safeFloatingStyles = useMemo(() => {
    return {
      ...floatingStyles,
      visibility: isPositioned ? 'visible' : 'hidden',
    } as React.CSSProperties
  }, [floatingStyles, isPositioned])

  const close = useCallback(() => setIsOpen(false), [])
  const open = useCallback(() => setIsOpen(true), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return useMemo(
    () => ({
      isOpen,
      setIsOpen,
      open,
      close,
      toggle,
      refs,
      floatingStyles: safeFloatingStyles,
      context,
      getReferenceProps,
      getFloatingProps,
    }),
    [
      isOpen,
      open,
      close,
      toggle,
      refs,
      safeFloatingStyles,
      context,
      getReferenceProps,
      getFloatingProps,
    ]
  )
}
