import { useEffect, useCallback } from 'react'

interface ShortcutOptions {
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
}

type ShortcutHandler = (event: KeyboardEvent) => void

export function useKeyboardShortcut(
  key: string,
  handler: ShortcutHandler,
  options: ShortcutOptions = {}
): void {
  const { ctrl = false, shift = false, alt = false, meta = false } = options

  const callback = useCallback(
    (event: KeyboardEvent) => {
      const matchesKey =
        event.key.toLowerCase() === key.toLowerCase() ||
        event.code.toLowerCase() === key.toLowerCase()
      const matchesCtrl = ctrl ? event.ctrlKey || event.metaKey : true
      const matchesShift = shift ? event.shiftKey : !event.shiftKey
      const matchesAlt = alt ? event.altKey : !event.altKey
      const matchesMeta = meta ? event.metaKey : true

      if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
        event.preventDefault()
        handler(event)
      }
    },
    [key, handler, ctrl, shift, alt, meta]
  )

  useEffect(() => {
    document.addEventListener('keydown', callback)
    return () => document.removeEventListener('keydown', callback)
  }, [callback])
}
