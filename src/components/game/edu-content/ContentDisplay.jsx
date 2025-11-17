/**
 * ContentDisplay - Display EduContent based on element_type
 *
 * Renders different types of educational content with appropriate styling
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import CompositeCardDisplay from './CompositeCardDisplay';

const ContentDisplay = ({
  content,
  size = 'md',
  showMetadata = false,
  onClick = null,
  className = '',
  // New props for composite rendering
  compositeMode = false,
  bgContent = null,
  dataContent = null
}) => {
  // Handle composite mode
  if (compositeMode && bgContent && dataContent) {
    return (
      <CompositeCardDisplay
        bgContent={bgContent}
        dataContent={dataContent}
        size={size}
        showMetadata={showMetadata}
        onClick={onClick}
        className={className}
      />
    );
  }

  if (!content) {
    return (
      <div className={`flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 ${getSizeClasses(size)} ${className}`}>
        <span className="text-gray-500 text-sm">אין תוכן</span>
      </div>
    );
  }

  const handleClick = () => {
    if (onClick) {
      onClick(content);
    }
  };

  const baseClasses = `
    ${getSizeClasses(size)}
    ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
    ${className}
  `.trim();

  const renderContent = () => {
    switch (content.element_type) {
      case 'data':
        return renderTextContent();

      case 'playing_card_complete':
        return renderImageContent();

      case 'playing_card_bg':
        return renderBackgroundContent();

      default:
        return renderUnknownContent();
    }
  };

  const renderTextContent = () => (
    <div
      className={`
        flex items-center justify-center
        border-2 border-blue-200 rounded-lg bg-blue-50
        text-blue-900 font-medium
        ${baseClasses}
      `}
      onClick={handleClick}
    >
      <div className="text-center px-2">
        <div className="break-words">{content.content}</div>
        {showMetadata && content.content_metadata?.language && (
          <Badge variant="secondary" className="mt-1 text-xs">
            {content.content_metadata.language}
          </Badge>
        )}
      </div>
    </div>
  );

  const renderImageContent = () => (
    <div
      className={`
        relative border-2 border-green-200 rounded-lg bg-green-50 overflow-hidden
        ${baseClasses}
      `}
      onClick={handleClick}
    >
      {content.fileUrl ? (
        <>
          <img
            src={content.fileUrl}
            alt={content.content}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          {/* Fallback if image fails to load */}
          <div
            className="hidden w-full h-full items-center justify-center text-green-700"
            style={{ display: 'none' }}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">🖼️</div>
              <div className="text-sm">{content.content}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center w-full h-full text-green-700">
          <div className="text-center">
            <div className="text-2xl mb-1">🖼️</div>
            <div className="text-sm">{content.content}</div>
          </div>
        </div>
      )}

      {showMetadata && (
        <div className="absolute bottom-1 left-1">
          <Badge variant="secondary" className="text-xs bg-white/80">
            תמונה מלאה
          </Badge>
        </div>
      )}
    </div>
  );

  const renderBackgroundContent = () => (
    <div
      className={`
        relative border-2 border-purple-200 rounded-lg overflow-hidden
        ${baseClasses}
      `}
      onClick={handleClick}
      style={{
        backgroundImage: content.fileUrl ? `url(${content.fileUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: content.fileUrl ? undefined : '#f3f4f6'
      }}
    >
      {/* Overlay for text visibility */}
      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
        <div className="text-center text-white drop-shadow-lg">
          <div className="text-sm font-medium">{content.content}</div>
          {showMetadata && (
            <Badge variant="secondary" className="mt-1 text-xs bg-white/80 text-purple-700">
              רקע קלף
            </Badge>
          )}
        </div>
      </div>

      {!content.fileUrl && (
        <div className="absolute inset-0 flex items-center justify-center text-purple-700">
          <div className="text-center">
            <div className="text-2xl mb-1">🎨</div>
            <div className="text-sm">{content.content}</div>
          </div>
        </div>
      )}
    </div>
  );

  const renderUnknownContent = () => (
    <div
      className={`
        flex items-center justify-center
        border-2 border-gray-300 rounded-lg bg-gray-100
        text-gray-600
        ${baseClasses}
      `}
      onClick={handleClick}
    >
      <div className="text-center">
        <div className="text-lg mb-1">❓</div>
        <div className="text-sm">{content.content}</div>
        <div className="text-xs opacity-60 mt-1">{content.element_type}</div>
      </div>
    </div>
  );

  return renderContent();
};

// Helper function to get size classes
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


export default ContentDisplay;