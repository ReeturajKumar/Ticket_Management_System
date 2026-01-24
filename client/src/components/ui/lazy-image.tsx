import { useState, useRef, useEffect, type ImgHTMLAttributes, memo } from 'react'
import { cn } from '@/lib/utils'

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Placeholder to show while loading (default: blur placeholder) */
  placeholder?: 'blur' | 'skeleton' | 'none'
  /** Low-quality placeholder image URL (for blur effect) */
  placeholderSrc?: string
  /** Blur amount for placeholder (default: 20) */
  blurAmount?: number
  /** Root margin for intersection observer */
  rootMargin?: string
  /** Threshold for intersection observer */
  threshold?: number
  /** Callback when image loads */
  onLoad?: () => void
  /** Callback when image fails to load */
  onError?: () => void
}

/**
 * LazyImage - Image component with lazy loading using Intersection Observer
 * Only loads images when they're about to enter the viewport
 * 
 * @example
 * <LazyImage
 *   src="/images/hero.jpg"
 *   alt="Hero image"
 *   placeholder="blur"
 *   className="w-full h-64 object-cover"
 * />
 */
export const LazyImage = memo(function LazyImage({
  src,
  alt,
  placeholder = 'skeleton',
  placeholderSrc,
  blurAmount = 20,
  rootMargin = '50px',
  threshold = 0.1,
  className,
  onLoad: onLoadProp,
  onError: onErrorProp,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Intersection Observer to detect when image enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [rootMargin, threshold])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoadProp?.()
  }

  const handleError = () => {
    setHasError(true)
    onErrorProp?.()
  }

  // Skeleton placeholder
  if (placeholder === 'skeleton' && !isLoaded) {
    return (
      <div
        ref={imgRef as any}
        className={cn(
          'animate-pulse bg-muted',
          className
        )}
        {...(props as any)}
      >
        {isInView && src && (
          <img
            src={src}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            className="opacity-0 absolute"
          />
        )}
      </div>
    )
  }

  // Blur placeholder
  if (placeholder === 'blur') {
    return (
      <div
        ref={imgRef as any}
        className={cn('relative overflow-hidden', className)}
        style={props.style}
      >
        {/* Low quality placeholder */}
        {!isLoaded && placeholderSrc && (
          <img
            src={placeholderSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: `blur(${blurAmount}px)`, transform: 'scale(1.1)' }}
          />
        )}
        
        {/* Skeleton if no placeholder */}
        {!isLoaded && !placeholderSrc && (
          <div className="absolute inset-0 animate-pulse bg-muted" />
        )}
        
        {/* Actual image */}
        {isInView && src && (
          <img
            src={src}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
            {...props}
          />
        )}
      </div>
    )
  }

  // No placeholder - just lazy load
  return (
    <img
      ref={imgRef}
      src={isInView ? src : undefined}
      alt={alt}
      onLoad={handleLoad}
      onError={handleError}
      className={cn(
        'transition-opacity duration-300',
        isLoaded ? 'opacity-100' : 'opacity-0',
        hasError && 'hidden',
        className
      )}
      {...props}
    />
  )
})

/**
 * useImagePreload - Hook to preload images
 * Useful for preloading images that will be needed soon
 * 
 * @example
 * const { isLoaded, error } = useImagePreload('/images/next-slide.jpg');
 */
export function useImagePreload(src: string) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!src) return

    const img = new Image()
    
    img.onload = () => setIsLoaded(true)
    img.onerror = () => setError(new Error(`Failed to load image: ${src}`))
    
    img.src = src

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [src])

  return { isLoaded, error }
}

/**
 * preloadImages - Utility to preload multiple images
 * Returns a promise that resolves when all images are loaded
 * 
 * @example
 * await preloadImages(['/img1.jpg', '/img2.jpg', '/img3.jpg']);
 */
export function preloadImages(srcs: string[]): Promise<void[]> {
  return Promise.all(
    srcs.map(
      (src) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = () => reject(new Error(`Failed to load: ${src}`))
          img.src = src
        })
    )
  )
}

export default LazyImage
