/**
 * CompositeCardDisplay - Reusable component for rendering composite cards
 *
 * Shows background image with text overlay, used in game content and previews
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';

const CompositeCardDisplay = ({
  bgContent,
  dataContent,
  size = 'md',
  showMetadata = false,
  onClick = null,
  className = '',
  customStyles = null // Custom styles from usage_metadata
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick({ bgContent, dataContent });
    }
  };

  const getSizeClasses = (size) => {
    switch (size) {
      case 'sm':
        return 'w-16 h-16 text-xs';
      case 'md':
        return 'w-24 h-24 text-sm';
      case 'lg':
        return 'w-32 h-32 text-base';
      case 'xl':
        return 'w-40 h-40 text-lg';
      default:
        return 'w-24 h-24 text-sm';
    }
  };

  const getCompositeTextSize = (size) => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'md':
        return 'text-sm';
      case 'lg':
        return 'text-base';
      case 'xl':
        return 'text-lg';
      default:
        return 'text-sm';
    }
  };

  const getCompositeIconSize = (size) => {
    switch (size) {
      case 'sm':
        return 'text-lg';
      case 'md':
        return 'text-xl';
      case 'lg':
        return 'text-2xl';
      case 'xl':
        return 'text-3xl';
      default:
        return 'text-xl';
    }
  };

  // Get positioning classes based on custom styles (RTL-adjusted)
  const getPositionClasses = (position) => {
    switch (position) {
      case 'top':
        return 'items-start justify-center pt-2';
      case 'bottom':
        return 'items-end justify-center pb-2';
      case 'left':
        // In RTL context, visual left = justify-end
        return 'items-center justify-end pr-2';
      case 'right':
        // In RTL context, visual right = justify-start
        return 'items-center justify-start pl-2';
      case 'top-left':
        // RTL: visual top-left = justify-end
        return 'items-start justify-end pt-2 pr-2';
      case 'top-right':
        // RTL: visual top-right = justify-start
        return 'items-start justify-start pt-2 pl-2';
      case 'bottom-left':
        // RTL: visual bottom-left = justify-end
        return 'items-end justify-end pb-2 pr-2';
      case 'bottom-right':
        // RTL: visual bottom-right = justify-start
        return 'items-end justify-start pb-2 pl-2';
      case 'center':
      default:
        return 'items-center justify-center';
    }
  };

  // Get text styles based on custom styles
  const getTextStyles = (customStyles, size) => {
    const baseSize = getCompositeTextSize(size);
    const styles = {
      color: customStyles?.textColor || '#ffffff',
      fontWeight: customStyles?.fontWeight || 'bold',
    };

    // Apply font family
    if (customStyles?.fontFamily) {
      styles.fontFamily = customStyles.fontFamily;
    }

    // Apply font size multiplier
    if (customStyles?.fontSize && customStyles.fontSize !== 1) {
      const sizeMap = {
        'text-xs': 12,
        'text-sm': 14,
        'text-base': 16,
        'text-lg': 18
      };
      const basePixelSize = sizeMap[baseSize] || 14;
      styles.fontSize = `${basePixelSize * customStyles.fontSize}px`;
    }

    // Apply text shadow
    if (customStyles?.textShadow !== false) {
      styles.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    }

    return styles;
  };

  // Get background overlay styles
  const getBackgroundOverlayStyles = (customStyles) => {
    const opacity = customStyles?.backgroundOpacity ?? 0.2;
    return {
      backgroundColor: `rgba(0,0,0,${opacity})`
    };
  };

  const baseClasses = `
    ${getSizeClasses(size)}
    ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
    ${className}
  `.trim();

  return (
    <div
      className={`
        relative border-2 border-purple-300 rounded-lg overflow-hidden shadow-md
        ${baseClasses}
      `}
      onClick={handleClick}
    >
      {/* Background image */}
      {bgContent?.fileUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgContent.fileUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-purple-200" />
      )}

      {/* Text overlay with enhanced styling */}
      <div
        className={`absolute inset-0 flex p-2 ${getPositionClasses(customStyles?.position || 'center')}`}
        style={getBackgroundOverlayStyles(customStyles)}
      >
        <div className="text-center">
          <div
            className="break-words"
            style={getTextStyles(customStyles, size)}
          >
            {dataContent?.content || 'תוכן'}
          </div>
        </div>
      </div>

      {/* Composite indicator */}
      {showMetadata && (
        <div className="absolute top-1 right-1">
          <Badge variant="secondary" className="text-xs bg-white/90 text-purple-700">
            קלף משולב
          </Badge>
        </div>
      )}

      {/* Fallback for missing background */}
      {!bgContent?.fileUrl && (
        <div className={`absolute inset-0 flex ${getPositionClasses(customStyles?.position || 'center')} text-purple-700 bg-purple-50 p-2`}>
          <div className="text-center">
            <div className={`${getCompositeIconSize(size)} mb-1`}>🎨</div>
            <div
              className="break-words"
              style={{
                ...getTextStyles(customStyles, size),
                color: customStyles?.textColor || '#7c3aed' // Use purple as fallback for no-bg cases
              }}
            >
              {dataContent?.content || 'תוכן'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompositeCardDisplay;