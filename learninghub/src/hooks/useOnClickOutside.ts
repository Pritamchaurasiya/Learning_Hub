import { useEffect, useRef, type RefObject } from 'react'

export function useOnClickOutside(
  ref: RefObject<HTMLElement>,
  handler: (event: MouseEvent | TouchEvent) => void,
  excludeRef?: RefObject<HTMLElement>
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node

      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(target)) {
        return
      }

      // Do nothing if clicking the excluded element (e.g., toggle button)
      if (excludeRef?.current?.contains(target)) {
        return
      }

      handlerRef.current(event)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, excludeRef])
}
