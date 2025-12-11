import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * SimpleOptimizedImage - A reliable, simplified image component
 *
 * Fixed the architectural problems of OptimizedImage:
 * - No complex aspect ratio calculations that break layouts
 * - No intersection observer complexity that may fail
 * - No multiple container layers with absolute positioning
 * - Simple, reliable lazy loading using native browser support
 * - Maintains core optimizations without the problematic architecture
 *
 * Use this instead of OptimizedImage for better reliability.
 */
const SimpleOptimizedImage = ({
  src,
  alt = '',
  width,
  height,
  className = '',
  priority = false,
  quality = 85,
  onLoad,
  onError,
  style = {},
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Generate responsive image URLs for API endpoints
  const generateSrcSet = (baseSrc, quality = 85) => {
    if (!baseSrc || !baseSrc.startsWith('/api/')) {
      return '';
    }

    const baseUrl = baseSrc.split('?')[0];
    const searchParams = new URLSearchParams(baseSrc.split('?')[1] || '');

    // Generate multiple sizes for different screen densities
    const sizes = [640, 750, 828, 1080, 1200, 1920];

    return sizes.map(size => {
      const params = new URLSearchParams(searchParams);
      params.set('w', size.toString());
      params.set('q', quality.toString());
      return `${baseUrl}?${params.toString()} ${size}w`;
    }).join(', ');
  };

  const handleLoad = (e) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setHasError(true);
    onError?.(e);
  };

  // Error fallback - simple and clean
  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 text-gray-400 text-sm',
          className
        )}
        style={{ width: width || '100%', height: height || 'auto', ...style }}
        {...props}
      >
        📷 תמונה לא זמינה
      </div>
    );
  }

  const srcSet = generateSrcSet(src, quality);

  return (
    <img
      src={src}
      srcSet={srcSet || undefined}
      alt={alt}
      width={width}
      height={height}
      className={cn(
        'transition-opacity duration-300',
        isLoaded ? 'opacity-100' : 'opacity-0',
        className
      )}
      style={{
        width: width || '100%',
        height: height || 'auto',
        ...style
      }}
      onLoad={handleLoad}
      onError={handleError}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      {...props}
    />
  );
};

export default SimpleOptimizedImage;