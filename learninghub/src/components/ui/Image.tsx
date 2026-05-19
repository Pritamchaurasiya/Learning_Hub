import React, { useState, useRef, useEffect, ImgHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string
  placeholder?: React.ReactNode
  threshold?: number
  rootMargin?: string
}

export function LazyImage({
  src,
  alt,
  className,
  wrapperClassName,
  placeholder,
  threshold = 0.1,
  rootMargin = '50px',
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden bg-gray-200 dark:bg-gray-800', wrapperClassName)}
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          {placeholder ?? (
            <div className="w-full h-full animate-pulse bg-gray-300 dark:bg-gray-700" />
          )}
        </div>
      )}
      {isVisible && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
          {...props}
        />
      )}
    </div>
  )
}

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  webpSrc?: string
  fallbackSrc?: string
  nativeLazy?: boolean
}

export function OptimizedImage({
  src,
  webpSrc,
  fallbackSrc,
  nativeLazy = true,
  ...props
}: OptimizedImageProps) {
  const [supportsWebP, setSupportsWebP] = useState<boolean | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const checkWebP = async () => {
      try {
        const webpData = 'data:image/webp;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQ=='
        const img = new Image()
        img.src = webpData
        await new Promise(resolve => {
          img.onload = resolve
          img.onerror = resolve
        })
        setSupportsWebP(img.width === 1)
      } catch {
        setSupportsWebP(false)
      }
    }
    void checkWebP()
  }, [])

  const currentSrc =
    supportsWebP === null ? src : supportsWebP ? (webpSrc ?? src) : (fallbackSrc ?? src)

  return (
    <img
      src={currentSrc}
      alt={props.alt ?? ''}
      onLoad={() => setIsLoaded(true)}
      loading={nativeLazy ? 'lazy' : 'eager'}
      decoding="async"
      {...props}
      className={cn(
        'transition-opacity duration-300',
        isLoaded ? 'opacity-100' : 'opacity-0',
        props.className
      )}
    />
  )
}
