import { useEffect, useState, useRef, type RefObject } from 'react'

interface IntersectionOptions extends IntersectionObserverInit {
  triggerOnce?: boolean
}

export function useIntersectionObserver<T extends HTMLElement = HTMLElement>(
  options: IntersectionOptions = {}
): [RefObject<T | null>, boolean] {
  const { threshold = 0, root = null, rootMargin = '0px', triggerOnce = false } = options
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(false)
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    if (triggerOnce && hasTriggered) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        if (entry.isIntersecting && triggerOnce) {
          setHasTriggered(true)
        }
      },
      { threshold, root, rootMargin }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold, root, rootMargin, triggerOnce, hasTriggered])

  return [ref, isIntersecting]
}

export function useLazyLoad<T extends HTMLElement = HTMLElement>(
  options: IntersectionOptions = {}
): [RefObject<T | null>, boolean] {
  return useIntersectionObserver<T>({ ...options, triggerOnce: true })
}
