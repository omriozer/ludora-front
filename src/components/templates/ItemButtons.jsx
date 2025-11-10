import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Square, Minus, MoreHorizontal, Plus, Layers } from 'lucide-react';
import ElementCard from './ElementCard';

const ItemButtons = ({
  footerConfig,
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
      ...footerConfig?.logo,
      visible: footerConfig?.logo?.visible
    },
    text: {
      ...footerConfig?.text,
      visible: footerConfig?.text?.visible
    },
    url: {
      ...footerConfig?.url,
      visible: footerConfig?.url?.visible
    }
  };

  // Custom elements from footerConfig
  const customElements = footerConfig?.customElements || {};

  // Tools - same for all template types
  const getNewTools = () => {
    return [
      {
        key: 'free-text',
        name: 'טקסט חופשי',
        icon: <Plus className="w-4 h-4" />,
        color: 'border-blue-300 bg-blue-50 hover:bg-blue-100'
      },
      {
        key: 'logo',
        name: 'לוגו',
        icon: <Square className="w-4 h-4" />,
        color: 'border-purple-300 bg-purple-50 hover:bg-purple-100'
      },
      {
        key: 'box',
        name: 'תיבה',
        icon: <Square className="w-4 h-4" />,
        color: 'border-green-300 bg-green-50 hover:bg-green-100'
      },
      {
        key: 'line',
        name: 'קו',
        icon: <Minus className="w-4 h-4" />,
        color: 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100'
      },
      {
        key: 'dotted-line',
        name: 'קו מנוקד',
        icon: <MoreHorizontal className="w-4 h-4" />,
        color: 'border-orange-300 bg-orange-50 hover:bg-orange-100'
      }
    ];
  };

  const newTools = getNewTools();

  // Handle element selection
  const handleElementClick = (elementKey) => {
    if (multiSelectMode) {
      const currentSelection = new Set(parentSelectedItems);
      if (currentSelection.has(elementKey)) {
        currentSelection.delete(elementKey);
      } else {
        currentSelection.add(elementKey);
      }
      // Convert Set back to Array and notify parent
      onSelectionChange?.(Array.from(currentSelection));
    } else {
      onItemClick(elementKey);
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

  return (
    <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l bg-white flex flex-col h-full">
      {/* Modern Header */}
      <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-gray-800">{getHeaderText()}</h3>
            <p className="text-xs text-gray-600 mt-1">{getSubHeaderText()}</p>
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

      {/* Elements List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-2 space-y-2">

          {/* Built-in Elements */}
          {Object.keys(builtInElements).length > 0 && (
            <div className="space-y-1">
              <h4 className="font-semibold text-sm text-gray-700 mb-1 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                אלמנטים מובנים
              </h4>

              {Object.entries(builtInElements).map(([elementKey, element]) => (
                <ElementCard
                  key={elementKey}
                  element={element}
                  elementKey={elementKey}
                  isSelected={selectedItem === elementKey}
                  isMultiSelected={selectedItems.has(elementKey)}
                  isGrouped={false}
                  groupColor=""
                  userRole={userRole}
                  onClick={() => handleElementClick(elementKey)}
                  onToggleVisibility={onToggleVisibility}
                  onCenterX={onCenterX}
                  onCenterY={onCenterY}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  onLockToggle={onLockToggle}
                  isDraggable={false}
                />
              ))}
            </div>
          )}

          {/* Custom Elements */}
          {Object.keys(customElements).length > 0 && (
            <div className="space-y-1">
              <h4 className="font-semibold text-sm text-gray-700 mb-1 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                אלמנטים מותאמים
              </h4>

              {Object.entries(customElements).map(([elementId, element]) => (
                <ElementCard
                  key={elementId}
                  element={element}
                  elementKey={elementId}
                  isSelected={selectedItem === elementId}
                  isMultiSelected={selectedItems.has(elementId)}
                  isGrouped={false}
                  groupColor=""
                  userRole={userRole}
                  onClick={() => handleElementClick(elementId)}
                  onToggleVisibility={onToggleVisibility}
                  onCenterX={onCenterX}
                  onCenterY={onCenterY}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  onLockToggle={onLockToggle}
                  isDraggable={false}
                />
              ))}
            </div>
          )}

          {/* Instructions at bottom of scrollable area */}
          <div className="mt-4 mb-2">
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2 text-sm">💡 עצות שימוש:</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• לחץ על כרטיס לעריכת אלמנט</li>
                <li>• השתמש בכפתורי הפעולות המהירות</li>
                <li>• הפעל בחירה מרובה לפעולות קבוצתיות</li>
                <li>• גרור אלמנטים ישירות על הקנבס</li>
              </ul>
            </div>
          </div>

          {/* User role info at bottom of scrollable area */}
          {!isAdmin && (
            <div className="mb-2">
              <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-900 font-medium">
                  👤 כיוצר תוכן: ניתן לשנות מיקום אלמנטים בלבד. עריכת תוכן ועיצוב זמינה למנהלים.
                </p>
              </div>
            </div>
          )}

          {/* Add Element Tools in scrollable area */}
          <div className="mt-4 mb-2">
            <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            הוסף אלמנט
          </h4>
        </div>

              <div className="grid grid-cols-3 gap-1">
                {newTools.map((tool) => (
                  <Button
                    key={tool.key}
                    onClick={() => onAddElement?.(tool.key)}
                    variant="outline"
                    className={`h-auto p-2 border-2 transition-all hover:shadow-md hover:scale-105 ${tool.color}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {tool.icon}
                      <span className="text-xs font-medium">{tool.name}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom padding for scrolling clearance */}
          <div className="pb-20"></div>
        </div>
      </div>

    </div>
  );
};

export default ItemButtons;