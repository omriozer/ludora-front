/**
 * OptimizedImage Component for Core Web Vitals optimization
 * Provides lazy loading, responsive images, and proper sizing for better LCP scores
 *
 * ⚠️  WHEN NOT TO USE OptimizedImage:
 * - DO NOT use in ProductImage component (it has its own 3-level fallback system)
 * - DO NOT use when you need custom error handling or complex fallback chains
 * - DO NOT use in components that manage their own image loading states
 *
 * ✅  WHEN TO USE OptimizedImage:
 * - Single image displays (logos, banners, user avatars, marketing images)
 * - Simple image galleries without complex fallback logic
 * - Any image where you want automatic Core Web Vitals optimization
 * - Static content images that don't need custom error handling
 *
 * OptimizedImage shows "📷 תמונה לא זמינה" on error and doesn't allow parent
 * components to handle the error event for custom fallbacks.
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

const OptimizedImage = ({
  src,
  alt = '',
  width,
  height,
  className = '',
  priority = false,
  sizes = '(max-width: 768px) 100vw, 50vw',
  quality = 85,
  placeholder = 'blur',
  blurDataURL,
  onLoad,
  onError,
  style = {},
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(priority); // Load immediately if priority
  const imgRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) return; // Skip lazy loading for priority images

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Generate responsive image URLs (if using a CDN or image service)
  const generateSrcSet = (baseSrc, quality = 85) => {
    if (!baseSrc) return '';

    // If it's an API-served image from Ludora, add responsive parameters
    if (baseSrc.startsWith('/api/')) {
      const baseUrl = baseSrc.split('?')[0];
      const searchParams = new URLSearchParams(baseSrc.split('?')[1] || '');

      // Generate multiple sizes for different screen densities
      const sizes = [640, 750, 828, 1080, 1200, 1920, 2048];

      return sizes.map(size => {
        const params = new URLSearchParams(searchParams);
        params.set('w', size.toString());
        params.set('q', quality.toString());
        return `${baseUrl}?${params.toString()} ${size}w`;
      }).join(', ');
    }

    // For external images or S3 URLs, return as-is
    return baseSrc;
  };

  const handleLoad = (e) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setError(true);
    onError?.(e);
  };

  // Generate blur data URL for placeholder if not provided
  const defaultBlurDataURL = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZjFmNWY5O3N0b3Atb3BhY2l0eToxIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNlMmU4ZjA7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyYWRpZW50KSIgLz4KPC9zdmc+';

  // Calculate aspect ratio for responsive sizing
  const aspectRatio = width && height ? (height / width) * 100 : undefined;

  // Container style with proper aspect ratio to prevent layout shift (CLS)
  const containerStyle = {
    position: 'relative',
    overflow: 'hidden',
    ...style,
    ...(aspectRatio && {
      paddingBottom: `${aspectRatio}%`,
      height: 0
    })
  };

  // Image style
  const imageStyle = {
    transition: 'opacity 0.3s ease',
    opacity: isLoaded ? 1 : 0,
    ...(aspectRatio ? {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    } : {
      width: width || '100%',
      height: height || 'auto'
    })
  };

  // Placeholder style (shown while loading)
  const placeholderStyle = {
    position: aspectRatio ? 'absolute' : 'static',
    top: 0,
    left: 0,
    width: '100%',
    height: aspectRatio ? '100%' : (height || 200),
    backgroundColor: '#f1f5f9',
    backgroundImage: placeholder === 'blur' ? `url(${blurDataURL || defaultBlurDataURL})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: isLoaded ? 0 : 1,
    transition: 'opacity 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    color: '#64748b'
  };

  const srcSet = generateSrcSet(src, quality);

  if (error) {
    return (
      <div
        ref={imgRef}
        className={cn('flex items-center justify-center bg-gray-100 text-gray-400 text-sm', className)}
        style={{ width: width || '100%', height: height || 200, ...style }}
        {...props}
      >
        📷 תמונה לא זמינה
      </div>
    );
  }

  return (
    <div
      ref={imgRef}
      className={cn('relative', className)}
      style={containerStyle}
      {...props}
    >
      {/* Placeholder/Loading state */}
      <div style={placeholderStyle}>
        {!isLoaded && !error && (
          <div className="text-gray-400 text-sm">
            טוען תמונה...
          </div>
        )}
      </div>

      {/* Actual image - only render when in view or priority */}
      {(inView || priority) && (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          style={imageStyle}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          // Add explicit dimensions for better CLS scores
          {...(width && { width })}
          {...(height && { height })}
        />
      )}
    </div>
  );
};

/**
 * Preload critical images for better LCP scores
 * Call this for above-the-fold images
 */
export const preloadImage = (src, as = 'image') => {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = as;
  link.href = src;
  document.head.appendChild(link);
};

/**
 * Generate responsive image sizes string for common layouts
 */
export const getResponsiveSizes = (layout = 'responsive') => {
  const sizeMap = {
    responsive: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    hero: '100vw',
    thumbnail: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
    fullWidth: '100vw',
    sidebar: '(max-width: 640px) 100vw, 300px',
    card: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px'
  };

  return sizeMap[layout] || sizeMap.responsive;
};

export default OptimizedImage;