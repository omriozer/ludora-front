import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Square, Minus, MoreHorizontal, Plus, Layers, Circle, Type, Link, Copyright, User } from 'lucide-react';
import logo from '@/assets/images/logo_sm.png';
import ElementCard from './ElementCard';

const ItemButtons = ({
  templateConfig,
  onItemClick,
  selectedItem,
  userRole,
  onCenterX,
  onCenterY,
  onAddElement,
  // Future grouping/multi-select props
  onToggleVisibility,
  onLockToggle,
  onDuplicate,
  onDelete,
  // Multi-selection props
  selectedItems: parentSelectedItems = [],
  onSelectionChange,
  // Template type for watermark-specific tools
  templateType = 'branding'
}) => {
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // Convert parent selectedItems array to Set for local use
  const selectedItems = new Set(parentSelectedItems);

  const isAdmin = userRole === 'admin' || userRole === 'sysadmin';

  // Built-in elements configuration - same for all template types
  const builtInElements = {
    logo: {
      ...templateConfig?.logo,
      visible: templateConfig?.logo?.visible,
      isPlaced: false // Always show as "add" button - built-ins are added as custom elements
    },
    url: {
      ...templateConfig?.url,
      visible: templateConfig?.url?.visible,
      isPlaced: false // Always show as "add" button - built-ins are added as custom elements
    },
    'copyright-text': {
      ...templateConfig?.['copyright-text'],
      visible: templateConfig?.['copyright-text']?.visible,
      isPlaced: false // Always show as "add" button - built-ins are added as custom elements
    }
  };

  // Custom elements from templateConfig
  const customElements = templateConfig?.customElements || {};

  // All available element types with their metadata - reordered as requested
  const allElementTypes = {
    // First section: Built-in elements in requested order
    logo: {
      name: 'לוגו',
      icon: <img src={logo} alt="לוגו" className="w-4 h-4" />,
      color: 'border-purple-300 bg-purple-50 hover:bg-purple-100',
      isBuiltIn: true
    },
    'copyright-text': {
      name: 'זכויות יוצרים',
      icon: <Copyright className="w-4 h-4" />,
      color: 'border-gray-300 bg-gray-50 hover:bg-gray-100',
      isBuiltIn: true
    },
    url: {
      name: 'קישור לאתר',
      icon: <Link className="w-4 h-4" />,
      color: 'border-cyan-300 bg-cyan-50 hover:bg-cyan-100',
      isBuiltIn: true
    },
    'free-text': {
      name: 'טקסט חופשי',
      icon: <Type className="w-4 h-4" />,
      color: 'border-blue-300 bg-blue-50 hover:bg-blue-100',
      isBuiltIn: false
    },
    'user-info': {
      name: 'פרטי משתמש',
      icon: <User className="w-4 h-4" />,
      color: 'border-violet-300 bg-violet-50 hover:bg-violet-100',
      isBuiltIn: false
    },
    // Second section: Shapes at the bottom as requested
    box: {
      name: 'תיבה',
      icon: <Square className="w-4 h-4" />,
      color: 'border-green-300 bg-green-50 hover:bg-green-100',
      isBuiltIn: false
    },
    circle: {
      name: 'עיגול',
      icon: <Circle className="w-4 h-4" />,
      color: 'border-pink-300 bg-pink-50 hover:bg-pink-100',
      isBuiltIn: false
    },
    line: {
      name: 'קו',
      icon: <Minus className="w-4 h-4" />,
      color: 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100',
      isBuiltIn: false
    },
    'dotted-line': {
      name: 'קו מנוקד',
      icon: <MoreHorizontal className="w-4 h-4" />,
      color: 'border-orange-300 bg-orange-50 hover:bg-orange-100',
      isBuiltIn: false
    }
  };

  // Create separate lists for placed items and available elements - support both structures
  const createElementLists = () => {
    const placedItems = [];
    const availableElements = [];

    // Support both unified and legacy structures
    const hasUnifiedStructure = templateConfig?.elements;

    if (hasUnifiedStructure) {
      // NEW UNIFIED STRUCTURE: process elements from arrays
      Object.entries(templateConfig.elements).forEach(([elementType, elementArray]) => {
        if (Array.isArray(elementArray)) {
          elementArray.forEach((element, index) => {
            // Use backend-compatible visibility logic: visible !== false && hidden !== true
            if (element && element.visible !== false && element.hidden !== true) {
              const elementKey = element.id || `${elementType}_${index}`;
              const elementMeta = allElementTypes[elementType] || allElementTypes['free-text'];

              console.log('🏷️ Creating placed item:', {
                elementType,
                index,
                elementKey,
                elementId: element.id,
                elementName: element.name || elementMeta.name
              });

              placedItems.push({
                key: elementKey,
                name: element.name || elementMeta.name,
                icon: elementMeta.icon,
                color: elementMeta.color,
                isBuiltIn: elementMeta.isBuiltIn,
                isPlaced: true,
                element: element,
                type: elementMeta.isBuiltIn ? 'builtin' : 'custom'
              });
            }
          });
        }
      });

      // In unified structure, show all element types as available (can add multiple instances)
      Object.entries(allElementTypes).forEach(([elementKey, elementMeta]) => {
        availableElements.push({
          key: elementKey,
          name: elementMeta.name,
          icon: elementMeta.icon,
          color: elementMeta.color,
          isBuiltIn: elementMeta.isBuiltIn,
          isPlaced: false,
          element: null,
          type: 'available'
        });
      });

    } else {
      // LEGACY STRUCTURE: process built-in and custom elements separately

      // Add placed built-in elements to placed items if they exist and are visible
      ['logo', 'url', 'copyright-text'].forEach(builtInKey => {
        const builtInElement = templateConfig?.[builtInKey];
        // Use backend-compatible visibility logic: visible !== false && hidden !== true
        if (builtInElement && builtInElement.visible !== false && builtInElement.hidden !== true) {
          const elementMeta = allElementTypes[builtInKey];

          placedItems.push({
            key: builtInKey,
            name: elementMeta.name,
            icon: elementMeta.icon,
            color: elementMeta.color,
            isBuiltIn: true,
            isPlaced: true,
            element: builtInElement,
            type: 'builtin'
          });
        }
      });

      // Add placed custom elements to placed items (only if visible)
      Object.entries(customElements).forEach(([elementId, element]) => {
        // Use backend-compatible visibility logic: visible !== false && hidden !== true
        if (element && element.visible !== false && element.hidden !== true) {
          const elementType = element.type || 'free-text';
          const elementMeta = allElementTypes[elementType] || allElementTypes['free-text'];

          placedItems.push({
            key: elementId,
            name: element.name || elementMeta.name,
            icon: elementMeta.icon,
            color: elementMeta.color,
            isBuiltIn: false,
            isPlaced: true,
            element: element,
            type: 'custom'
          });
        }
      });

      // Add available element types (only show as add buttons for non-placed built-ins)
      Object.entries(allElementTypes).forEach(([elementKey, elementMeta]) => {
        // For built-in elements, only show as available if not already placed
        if (elementMeta.isBuiltIn) {
          const builtInElement = templateConfig?.[elementKey];
          const isAlreadyPlaced = builtInElement && builtInElement.visible;

          if (!isAlreadyPlaced) {
            availableElements.push({
              key: elementKey,
              name: elementMeta.name,
              icon: elementMeta.icon,
              color: elementMeta.color,
              isBuiltIn: true,
              isPlaced: false,
              element: builtInElement || null,
              type: 'available'
            });
          }
        } else {
          // For custom elements, always show as available (they can be added multiple times)
          availableElements.push({
            key: elementKey,
            name: elementMeta.name,
            icon: elementMeta.icon,
            color: elementMeta.color,
            isBuiltIn: false,
            isPlaced: false,
            element: null,
            type: 'available'
          });
        }
      });
    }

    return { placedItems, availableElements };
  };

  const { placedItems, availableElements } = createElementLists();

  // Handle element selection or addition
  const handleElementClick = (unifiedElement) => {
    console.log('🔍 handleElementClick called with:', {
      key: unifiedElement.key,
      isPlaced: unifiedElement.isPlaced,
      name: unifiedElement.name,
      multiSelectMode
    });

    if (multiSelectMode) {
      const currentSelection = new Set(parentSelectedItems);
      if (currentSelection.has(unifiedElement.key)) {
        currentSelection.delete(unifiedElement.key);
      } else {
        currentSelection.add(unifiedElement.key);
      }
      // Convert Set back to Array and notify parent
      onSelectionChange?.(Array.from(currentSelection));
    } else {
      if (unifiedElement.isPlaced) {
        // PLACED ELEMENTS: Click should open settings menu (focus the element)
        console.log('📞 Calling onItemClick with key:', unifiedElement.key);
        onItemClick(unifiedElement.key);
      } else {
        // AVAILABLE ELEMENTS: Click should add new element to canvas
        console.log('➕ Calling onAddElement with key:', unifiedElement.key);
        onAddElement?.(unifiedElement.key);
      }
    }
  };

  // Toggle multi-select mode
  const toggleMultiSelectMode = () => {
    setMultiSelectMode(!multiSelectMode);
    onSelectionChange?.([]);
  };

  // Get header text based on template type
  const getHeaderText = () => {
    switch (templateType) {
      case 'header':
        return 'רכיבי כותרת עליונה';
      case 'watermark':
        return 'רכיבי סימן מים';
      case 'footer':
      default:
        return 'רכיבי כותרת תחתונה';
    }
  };

  const getSubHeaderText = () => {
    switch (templateType) {
      case 'header':
        return 'נהל את אלמנטי הכותרת העליונה';
      case 'watermark':
        return 'נהל את אלמנטי סימן המים';
      case 'footer':
      default:
        return 'נהל את אלמנטי התצוגה';
    }
  };

  // Render unified element card
  const renderUnifiedElementCard = (unifiedElement) => {
    const isSelected = selectedItem === unifiedElement.key;
    const isMultiSelected = selectedItems.has(unifiedElement.key);

    if (unifiedElement.isPlaced) {
      // Show as ElementCard for placed elements
      return (
        <ElementCard
          key={unifiedElement.key}
          element={unifiedElement.element}
          elementKey={unifiedElement.key}
          elementName={unifiedElement.name}
          isSelected={isSelected}
          isMultiSelected={isMultiSelected}
          isGrouped={false}
          groupColor=""
          userRole={userRole}
          onClick={() => handleElementClick(unifiedElement)}
          onToggleVisibility={onToggleVisibility}
          onCenterX={onCenterX}
          onCenterY={onCenterY}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onLockToggle={onLockToggle}
          isDraggable={false}
        />
      );
    } else {
      // Show as add button for unplaced elements
      return (
        <Button
          key={unifiedElement.key}
          onClick={() => handleElementClick(unifiedElement)}
          variant="outline"
          className={`h-auto p-2 border-2 transition-all hover:shadow-md hover:scale-105 ${unifiedElement.color}
            ${isSelected ? 'border-blue-500 bg-blue-100' : ''}
            ${isMultiSelected ? 'border-green-500 bg-green-100' : ''}`}
        >
          <div className="flex flex-col items-center gap-1">
            {unifiedElement.icon}
            <span className="text-xs font-medium">{unifiedElement.name}</span>
            <span className="text-xs text-gray-500">לחץ להוספה</span>
          </div>
        </Button>
      );
    }
  };

  return (
    <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l bg-white flex flex-col h-full">
      {/* Simplified Header */}
      <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-gray-800">אלמנטים</h3>
            <p className="text-xs text-gray-600 mt-1">לחץ להוספה או לעריכה</p>
          </div>

          {/* Multi-select toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={multiSelectMode ? "default" : "outline"}
              size="sm"
              onClick={toggleMultiSelectMode}
              className="h-8 px-2"
              title={multiSelectMode ? "בטל בחירה מרובה" : "בחירה מרובה"}
            >
              <Layers className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Multi-select info */}
        {multiSelectMode && (
          <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            {selectedItems.size > 0 ? `${selectedItems.size} פריטים נבחרו` : 'לחץ על פריטים לבחירה'}
          </div>
        )}
      </div>

      {/* Split Elements List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-2 space-y-4">
          {/* Placed Items Section */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2 text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              פריטים מוצבים ({placedItems.length})
            </h4>
            {placedItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {placedItems.map((placedItem) => renderUnifiedElementCard(placedItem))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <span className="text-2xl block mb-1">📋</span>
                אין פריטים מוצבים על הקנבס
              </div>
            )}
          </div>

          {/* Available Elements Section */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2 text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              הוסף אלמנטים
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {availableElements.map((availableElement) => renderUnifiedElementCard(availableElement))}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-4 mb-2">
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2 text-sm">💡 עצות שימוש:</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• לחץ על אלמנט לא מוצב להוספתו לקנבס</li>
                <li>• לחץ על אלמנט מוצב לעריכתו</li>
                <li>• הפעל בחירה מרובה לפעולות קבוצתיות</li>
                <li>• גרור אלמנטים ישירות על הקנבס</li>
              </ul>
            </div>
          </div>

          {/* User role info */}
          {!isAdmin && (
            <div className="mb-2">
              <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-900 font-medium">
                  👤 כיוצר תוכן: ניתן לשנות מיקום אלמנטים בלבד. עריכת תוכן ועיצוב זמינה למנהלים.
                </p>
              </div>
            </div>
          )}

          {/* Bottom padding for scrolling clearance */}
          <div className="pb-20"></div>
        </div>
      </div>
    </div>
  );
};

export default ItemButtons;