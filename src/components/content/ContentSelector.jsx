import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, X } from 'lucide-react';
import { getContentSchema } from './schemas/contentMetadataSchemas';
import ContentSelectionModal from './modals/ContentSelectionModal';

/**
 * ContentSelector - Reusable component for selecting content by semantic type
 * @param {string} semanticType - The type of content to select (word, question, name, etc.)
 * @param {string} variant - Button variant: 'select' | 'outline' | 'ghost'
 * @param {string} size - Button size: 'sm' | 'md' | 'lg'
 * @param {object} selectedContent - Currently selected content object
 * @param {function} onContentSelected - Callback when content is selected: (content) => void
 * @param {function} onContentCleared - Callback when content is cleared: () => void
 * @param {boolean} disabled - Whether the selector is disabled
 * @param {string} className - Additional CSS classes
 * @param {boolean} showClearButton - Whether to show the clear button when content is selected
 */
const ContentSelector = ({
  semanticType,
  variant = 'outline',
  size = 'sm',
  selectedContent = null,
  onContentSelected,
  onContentCleared,
  disabled = false,
  className = '',
  showClearButton = true
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get schema for this semantic type
  const schema = getContentSchema(semanticType);

  if (!schema) {
    return (
      <div className="text-red-500 text-xs">
        שגיאה: סוג תוכן לא נתמך - {semanticType}
      </div>
    );
  }

  // Generate button label
  const getButtonLabel = () => {
    if (selectedContent) {
      // Show selected content value (truncated)
      const displayValue = selectedContent.value || selectedContent.metadata?.name || 'תוכן נבחר';
      return displayValue.length > 20 ? `${displayValue.substring(0, 20)}...` : displayValue;
    }
    return `בחירת ${schema.label}`;
  };

  // Check if content is an image
  const isImageContent = () => {
    return semanticType === 'image' && selectedContent?.value;
  };

  // Handle opening the modal
  const handleOpenModal = () => {
    if (!disabled) {
      setIsModalOpen(true);
    }
  };

  // Handle closing the modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Handle content selection from modal
  const handleContentSelected = (content) => {
    try {
      // Call parent callback first to ensure selection is processed
      if (onContentSelected) {
        onContentSelected(content);
      }
      // Close modal only after parent has processed the selection
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error selecting content:', error);
      // Keep modal open on error so user can try again
    }
  };

  // Handle clearing selected content
  const handleClearContent = (e) => {
    e.stopPropagation(); // Prevent opening modal
    if (onContentCleared) {
      onContentCleared();
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Main Selection Button */}
      <Button
        type="button"
        variant={selectedContent ? 'default' : variant}
        size={size}
        onClick={handleOpenModal}
        disabled={disabled}
        className={`
          ${selectedContent ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          flex items-center gap-2 min-w-0
        `}
      >
        {selectedContent ? (
          isImageContent() ? (
            <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-100">
              <img
                src={selectedContent.value}
                alt="Selected image"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs" style={{display: 'none'}}>
                IMG
              </div>
            </div>
          ) : (
            <>
              <Search className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{getButtonLabel()}</span>
            </>
          )
        ) : (
          <>
            <Plus className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{getButtonLabel()}</span>
          </>
        )}
      </Button>

      {/* Clear Button */}
      {selectedContent && showClearButton && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClearContent}
          className="p-1 h-auto text-gray-500 hover:text-red-500"
        >
          <X className="w-3 h-3" />
        </Button>
      )}

      {/* Content Type Badge */}
      {selectedContent && (
        <Badge variant="secondary" className="text-xs">
          {schema.label}
        </Badge>
      )}

      {/* Content Selection Modal */}
      <ContentSelectionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        semanticType={semanticType}
        onContentSelected={handleContentSelected}
        currentSelection={selectedContent}
      />
    </div>
  );
};

export default ContentSelector;