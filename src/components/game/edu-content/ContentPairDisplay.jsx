/**
 * ContentPairDisplay - Display a memory game content pair with actions
 *
 * Shows two content items side by side with edit/delete functionality
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, ArrowLeftRight, Layers, Type, Image } from 'lucide-react';
import ContentDisplay from './ContentDisplay';
import CompositeCardDisplay from './CompositeCardDisplay';

// Helper functions for pair type detection
const isData = (content) => content?.element_type === 'data';
const isBg = (content) => content?.element_type === 'playing_card_bg';
const isComplete = (content) => content?.element_type === 'playing_card_complete';
const isSubPair = (content) => content?._source === 'eduContentUse';

const getPairType = (contentA, contentB) => {
  if (!contentA || !contentB) return null;

  if ((isBg(contentA) && isData(contentB)) || (isData(contentA) && isBg(contentB))) {
    return 'composite_card';
  }
  if (isData(contentA) && isData(contentB)) {
    return 'text_pair';
  }
  if (isComplete(contentA) && isComplete(contentB)) {
    return 'image_pair';
  }
  return 'mixed_pair';
};

const getPairTypeInfo = (pairType) => {
  const typeInfo = {
    composite_card: {
      label: 'קלף משולב',
      description: 'קלף אחד עם רקע ותמונה',
      icon: Layers,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    text_pair: {
      label: 'זוג טקסט',
      description: 'שני קלפי טקסט להתאמה',
      icon: Type,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    image_pair: {
      label: 'זוג תמונות',
      description: 'שני קלפי תמונה להתאמה',
      icon: Image,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    mixed_pair: {
      label: 'זוג מעורב',
      description: 'שני קלפים שונים להתאמה',
      icon: ArrowLeftRight,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
  };

  return typeInfo[pairType] || null;
};

const ContentPairDisplay = ({
  contentUse,
  onEdit,
  onDelete,
  isDeleting = false
}) => {
  if (!contentUse || !contentUse.contentItems || contentUse.contentItems.length !== 2) {
    return (
      <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="text-sm">זוג תוכן לא תקין</div>
          <div className="text-xs mt-1">נדרשים בדיוק 2 פריטי תוכן</div>
        </div>
      </div>
    );
  }

  const [contentA, contentB] = contentUse.contentItems;

  // Calculate pair type
  const pairType = getPairType(contentA, contentB);
  const pairTypeInfo = getPairTypeInfo(pairType);

  const handleEdit = () => {
    if (onEdit && !isDeleting) {
      onEdit(contentUse);
    }
  };

  const handleDelete = () => {
    if (onDelete && !isDeleting) {
      onDelete(contentUse.id);
    }
  };

  // Helper function to render individual content items (handles both regular content and sub-pairs)
  const renderContentItem = (content, label) => {
    if (isSubPair(content)) {
      // This is a sub-pair, extract its components and render as composite card
      const subItems = content.contentItems || [];
      if (subItems.length === 2) {
        const bgContent = subItems.find(item => isBg(item));
        const dataContent = subItems.find(item => isData(item));

        if (bgContent && dataContent) {
          return (
            <div className="flex-1">
              <div className="text-xs text-gray-600 mb-2 font-medium">{label}</div>
              <CompositeCardDisplay
                bgContent={bgContent}
                dataContent={dataContent}
                size="lg"
                showMetadata={false}
                className="mx-auto"
              />
              <div className="text-xs text-center mt-2 text-purple-600 font-medium">
                קלף משולב
              </div>
            </div>
          );
        }
      }

      // Fallback for invalid sub-pair
      return (
        <div className="flex-1">
          <div className="text-xs text-gray-600 mb-2 font-medium">{label}</div>
          <div className="w-32 h-32 border-2 border-dashed border-red-300 rounded-lg bg-red-50 flex items-center justify-center mx-auto">
            <span className="text-red-500 text-xs">קלף משולב לא תקין</span>
          </div>
        </div>
      );
    } else {
      // Regular content
      return (
        <div className="flex-1">
          <div className="text-xs text-gray-600 mb-2 font-medium">{label}</div>
          <ContentDisplay
            content={content}
            size="lg"
            showMetadata={false}
            className="mx-auto"
          />
          <div className="text-xs text-center mt-2 text-gray-500">
            {getContentTypeLabel(content)}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="relative group">
      {/* Main pair display */}
      <div className={`p-4 border-2 rounded-lg bg-white hover:shadow-md transition-shadow ${
        pairTypeInfo ? pairTypeInfo.borderColor : 'border-gray-200'
      }`}>

        {pairType === 'composite_card' ? (
          // Composite Card Display - Single merged card (when both items are bg+data directly)
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                {pairTypeInfo && (
                  <>
                    <pairTypeInfo.icon className={`w-4 h-4 ${pairTypeInfo.color}`} />
                    <span className={`text-sm font-semibold ${pairTypeInfo.color}`}>
                      {pairTypeInfo.label}
                    </span>
                  </>
                )}
                <Badge variant="secondary" className="text-xs">
                  {pairTypeInfo.description}
                </Badge>
              </div>

              {/* Composite card preview */}
              <div className="flex justify-center">
                <CompositeCardDisplay
                  bgContent={isBg(contentA) ? contentA : contentB}
                  dataContent={isData(contentA) ? contentA : contentB}
                  size="xl"
                  showMetadata={true}
                  className="mx-auto"
                />
              </div>

              {/* Component breakdown */}
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <span>רקע:</span>
                  <span className="font-medium">{isBg(contentA) ? contentA.content : contentB.content}</span>
                </div>
                <div>•</div>
                <div className="flex items-center gap-1">
                  <span>טקסט:</span>
                  <span className="font-medium">{isData(contentA) ? contentA.content : contentB.content}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleEdit}
                disabled={isDeleting}
                variant="outline"
                size="sm"
                className="h-8 px-2"
              >
                <Edit className="w-4 h-4" />
                <span className="mr-1">עריכה</span>
              </Button>

              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                variant="outline"
                size="sm"
                className="h-8 px-2 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                <span className="mr-1">
                  {isDeleting ? 'מוחק...' : 'מחיקה'}
                </span>
              </Button>
            </div>
          </div>
        ) : (
          // Regular Pair Display - Two separate cards (handles sub-pairs automatically)
          <div className="flex items-center gap-4">
            {/* Content A - can be regular content or sub-pair */}
            {renderContentItem(contentA, 'קלף א')}

            {/* Pair Type Indicator */}
            <div className="flex flex-col items-center px-2">
              {pairTypeInfo ? (
                <>
                  <pairTypeInfo.icon className={`w-6 h-6 ${pairTypeInfo.color}`} />
                  <Badge variant="outline" className="mt-2 text-xs">
                    {pairTypeInfo.label}
                  </Badge>
                </>
              ) : (
                <>
                  <ArrowLeftRight className="w-6 h-6 text-gray-400" />
                  <Badge variant="outline" className="mt-2 text-xs">
                    זוג
                  </Badge>
                </>
              )}
            </div>

            {/* Content B - can be regular content or sub-pair */}
            {renderContentItem(contentB, 'קלף ב')}

            {/* Action buttons */}
            <div className="flex flex-col gap-2 ml-4">
              <Button
                onClick={handleEdit}
                disabled={isDeleting}
                variant="outline"
                size="sm"
                className="h-8 px-2"
              >
                <Edit className="w-4 h-4" />
                <span className="mr-1">עריכה</span>
              </Button>

              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                variant="outline"
                size="sm"
                className="h-8 px-2 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                <span className="mr-1">
                  {isDeleting ? 'מוחק...' : 'מחיקה'}
                </span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Pair metadata */}
      <div className="flex items-center gap-2 mt-2 px-4">
        <div className="text-xs text-gray-500">
          נוצר: {new Date(contentUse.createdAt).toLocaleDateString('he-IL')}
        </div>

        {/* Content type combination badge */}
        <Badge variant="secondary" className="text-xs">
          {getContentCombinationLabel(contentA, contentB)}
        </Badge>
      </div>

      {/* Loading overlay */}
      {isDeleting && (
        <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
          <div className="flex items-center gap-2 text-red-600">
            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">מוחק זוג...</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
const getContentTypeLabel = (content) => {
  // Handle sub-pairs
  if (isSubPair(content)) {
    return 'קלף משולב';
  }

  // Handle regular content by element_type
  const labels = {
    'data': 'טקסט',
    'playing_card_complete': 'תמונה מלאה',
    'playing_card_bg': 'רקע קלף'
  };
  return labels[content?.element_type] || content?.element_type;
};

const getContentCombinationLabel = (contentA, contentB) => {
  const labelA = getContentTypeLabel(contentA);
  const labelB = getContentTypeLabel(contentB);

  if (labelA === labelB) {
    return labelA;
  }

  return `${labelA} - ${labelB}`;
};

export default ContentPairDisplay;