import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Crown,
  Move,
  Eye,
  EyeOff,
  GripVertical,
  MoreHorizontal,
  Lock,
  Unlock,
  Copy,
  Trash2
} from 'lucide-react';

const ElementCard = ({
  element,
  elementKey,
  isSelected,
  isMultiSelected,
  isGrouped,
  groupColor,
  userRole,
  onClick,
  onToggleVisibility,
  onCenterX,
  onCenterY,
  onDuplicate,
  onDelete,
  onLockToggle,
  isDraggable = true,
  ...dragHandleProps
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isAdmin = userRole === 'admin' || userRole === 'sysadmin';

  // Get element properties
  const getElementInfo = () => {
    if (element.type) {
      // Custom element
      return {
        name: getCustomElementName(element.type),
        icon: getCustomElementIcon(element.type),
        color: getCustomElementColor(element.type),
        isCustom: true
      };
    } else {
      // Built-in element
      return getBuiltInElementInfo(elementKey);
    }
  };

  const getCustomElementName = (type) => {
    switch (type) {
      case 'box': return 'תיבה';
      case 'line': return 'קו';
      case 'dotted-line': return 'קו מנוקד';
      case 'free-text': return 'טקסט חופשי';
      case 'watermark-text': return 'טקסט סימן מים';
      case 'watermark-logo': return 'לוגו סימן מים';
      case 'logo': return 'לוגו';
      default: return type;
    }
  };

  const getCustomElementIcon = (type) => {
    switch (type) {
      case 'box': return '📦';
      case 'line': return '➖';
      case 'dotted-line': return '⋯';
      case 'free-text': return '✏️';
      case 'watermark-text': return '🔤';
      case 'watermark-logo': return '🖼️';
      case 'logo': return '🖼️';
      default: return '🔧';
    }
  };

  const getCustomElementColor = (type) => {
    switch (type) {
      case 'box': return 'border-green-300 bg-green-50 hover:bg-green-100';
      case 'line': return 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100';
      case 'dotted-line': return 'border-orange-300 bg-orange-50 hover:bg-orange-100';
      case 'free-text': return 'border-blue-300 bg-blue-50 hover:bg-blue-100';
      case 'watermark-text': return 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100';
      case 'watermark-logo': return 'border-purple-300 bg-purple-50 hover:bg-purple-100';
      case 'logo': return 'border-purple-300 bg-purple-50 hover:bg-purple-100';
      default: return 'border-gray-300 bg-gray-50 hover:bg-gray-100';
    }
  };

  const getBuiltInElementInfo = (key) => {
    const elements = {
      logo: {
        name: 'לוגו',
        icon: '🖼️',
        color: 'border-gray-300 bg-gray-50 hover:bg-gray-100',
        isCustom: false
      },
      text: {
        name: 'טקסט זכויות יוצרים',
        icon: '📝',
        color: 'border-blue-300 bg-blue-50 hover:bg-blue-100',
        isCustom: false
      },
      url: {
        name: 'קישור URL',
        icon: '🔗',
        color: 'border-purple-300 bg-purple-50 hover:bg-purple-100',
        isCustom: false
      }
    };
    return elements[key] || elements.logo;
  };

  const elementInfo = getElementInfo();
  const isVisible = element.visible !== false && !element.hidden;
  const isLocked = element.locked || false;

  // Generate thumbnail/preview
  const generateThumbnail = () => {
    if (elementInfo.isCustom) {
      return (
        <div className="w-full h-6 flex items-center justify-center text-xs text-gray-600">
          <span className="text-sm">{elementInfo.icon}</span>
        </div>
      );
    }

    // For built-in elements, show a mini preview
    return (
      <div className="w-full h-6 bg-white rounded border flex items-center justify-center text-xs text-gray-600">
        <span className="text-sm">{elementInfo.icon}</span>
      </div>
    );
  };

  const cardClasses = `
    relative group transition-all duration-200 rounded-lg border-2 cursor-pointer
    ${isSelected
      ? 'border-blue-500 bg-blue-100 shadow-md ring-2 ring-blue-200'
      : elementInfo.color
    }
    ${isMultiSelected
      ? 'ring-2 ring-purple-300 border-purple-400'
      : ''
    }
    ${isGrouped
      ? `border-l-4 border-l-${groupColor}-500 bg-gradient-to-r from-${groupColor}-50 to-transparent`
      : ''
    }
    ${!isVisible ? 'opacity-50' : ''}
    ${isLocked ? 'border-dashed' : ''}
    hover:shadow-md hover:scale-[1.02]
  `;

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag Handle */}
      {isDraggable && (
        <div
          {...dragHandleProps}
          className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-3 h-3 text-gray-400" />
        </div>
      )}

      {/* Multi-select checkbox */}
      {isMultiSelected && (
        <div className="absolute left-1 top-1">
          <div className="w-3 h-3 bg-purple-500 rounded-sm border border-white shadow-sm"></div>
        </div>
      )}

      <div className="p-2">
        {/* Header with thumbnail and info */}
        <div className="flex items-center gap-2 mb-1">
          {/* Thumbnail */}
          <div className="w-8 h-6 flex-shrink-0">
            {generateThumbnail()}
          </div>

          {/* Element info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {elementInfo.name}
              </h4>
              {isAdmin && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>{elementInfo.isCustom ? 'מותאם אישית' : 'מובנה'}</span>
              {isGrouped && (
                <>
                  <span>•</span>
                  <span className="text-purple-600">בקבוצה</span>
                </>
              )}
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-1">
            {isLocked && (
              <Lock className="w-3 h-3 text-gray-400" />
            )}
            {!isVisible && (
              <EyeOff className="w-3 h-3 text-gray-400" />
            )}
          </div>
        </div>

        {/* Quick actions - visible on hover or when selected */}
        {(isHovered || isSelected) && (
          <div className="flex items-center gap-1 mt-1">
            {/* Visibility toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility?.(elementKey);
              }}
              title={isVisible ? 'הסתר אלמנט' : 'הצג אלמנט'}
            >
              {isVisible ? (
                <Eye className="w-3 h-3 text-blue-600" />
              ) : (
                <EyeOff className="w-3 h-3 text-gray-400" />
              )}
            </Button>

            {/* Lock toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onLockToggle?.(elementKey);
              }}
              title={isLocked ? 'בטל נעילה' : 'נעל אלמנט'}
            >
              {isLocked ? (
                <Lock className="w-3 h-3 text-red-500" />
              ) : (
                <Unlock className="w-3 h-3 text-gray-400" />
              )}
            </Button>

            {/* Center X */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onCenterX?.(elementKey);
              }}
              title="מרכז X"
            >
              <Move className="w-3 h-3 rotate-90" />
            </Button>

            {/* Center Y */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onCenterY?.(elementKey);
              }}
              title="מרכז Y"
            >
              <Move className="w-3 h-3" />
            </Button>

            {/* More actions */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                title="פעולות נוספות"
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Position indicator */}
        {element.position && (
          <div className="text-xs text-gray-400 mt-1">
            מיקום: {Math.round(element.position.x)}%, {Math.round(element.position.y)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default ElementCard;