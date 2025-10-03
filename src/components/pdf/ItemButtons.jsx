import React from 'react';
import { Button } from '@/components/ui/button';
import { Crown, Move, Square, Minus, MoreHorizontal, Maximize2 } from 'lucide-react';

const ItemButtons = ({
  footerConfig,
  onItemClick,
  selectedItem,
  userRole,
  onCenterX,
  onCenterY,
  onAddElement
}) => {
  const isAdmin = userRole === 'admin' || userRole === 'sysadmin';

  const items = [
    {
      key: 'logo',
      name: 'לוגו',
      icon: '🖼️',
      visible: footerConfig?.logo?.visible,
      color: 'hover:bg-gray-100 border-gray-300'
    },
    {
      key: 'text',
      name: 'טקסט זכויות יוצרים',
      icon: '📝',
      visible: footerConfig?.text?.visible,
      color: 'hover:bg-blue-100 border-blue-300'
    },
    {
      key: 'url',
      name: 'קישור URL',
      icon: '🔗',
      visible: footerConfig?.url?.visible,
      color: 'hover:bg-purple-100 border-purple-300'
    }
  ];

  const newTools = [
    {
      key: 'box',
      name: 'תיבה',
      icon: <Square className="w-3 h-3" />,
      color: 'hover:bg-green-100 border-green-300'
    },
    {
      key: 'line',
      name: 'קו',
      icon: <Minus className="w-3 h-3" />,
      color: 'hover:bg-yellow-100 border-yellow-300'
    },
    {
      key: 'dotted-line',
      name: 'קו מנוקד',
      icon: <MoreHorizontal className="w-3 h-3" />,
      color: 'hover:bg-orange-100 border-orange-300'
    }
  ];

  return (
    <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l bg-white">
      {/* Header */}
      <div className="p-5 border-b bg-gradient-to-r from-gray-50 to-slate-50">
        <h3 className="font-bold text-lg text-gray-800">רכיבי כותרת תחתונה</h3>
        <p className="text-xs text-gray-600 mt-1">לחץ על רכיב לעריכה</p>
      </div>

      {/* Item Buttons */}
      <div className="p-3 space-y-2">
        {/* Built-in elements */}
        {items.map((item) => (
          <div key={item.key} className="space-y-1">
            <Button
              onClick={() => onItemClick(item.key)}
              variant={selectedItem === item.key ? "default" : "outline"}
              className={`w-full justify-start text-right h-auto p-2 border-2 transition-all text-sm ${
                selectedItem === item.key
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : `${item.color} ${!item.visible ? 'opacity-50' : ''}`
              }`}
              disabled={!item.visible}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="text-base">{item.icon}</span>
                  <div className="text-right">
                    <div className="font-medium text-xs">{item.name}</div>
                    <div className="text-xs opacity-75">
                      {item.visible ? 'פעיל' : 'לא פעיל'}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <Crown className={`w-3 h-3 ${selectedItem === item.key ? 'text-white' : 'text-amber-500'}`} />
                )}
              </div>
            </Button>

            {/* Center Actions for visible items */}
            {item.visible && (
              <div className="flex gap-1">
                <Button
                  onClick={() => onCenterX?.(item.key)}
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs p-1 h-6"
                  title={`מרכז ${item.name} ציר X`}
                >
                  <Move className="w-3 h-3 mr-1 rotate-90" />
                  מרכז X
                </Button>
                <Button
                  onClick={() => onCenterY?.(item.key)}
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs p-1 h-6"
                  title={`מרכז ${item.name} ציר Y`}
                >
                  <Move className="w-3 h-3 mr-1" />
                  מרכז Y
                </Button>
              </div>
            )}
          </div>
        ))}

        {/* Custom elements */}
        {footerConfig?.customElements && Object.entries(footerConfig.customElements).map(([elementId, element]) => {
          if (!element.visible) return null;

          const getElementIcon = (type) => {
            switch (type) {
              case 'box': return '📦';
              case 'line': return '➖';
              case 'dotted-line': return '⋯';
              default: return '🔧';
            }
          };

          const getElementName = (type) => {
            switch (type) {
              case 'box': return 'תיבה';
              case 'line': return 'קו';
              case 'dotted-line': return 'קו מנוקד';
              default: return type;
            }
          };

          const getElementColor = (type) => {
            switch (type) {
              case 'box': return 'hover:bg-green-100 border-green-300';
              case 'line': return 'hover:bg-yellow-100 border-yellow-300';
              case 'dotted-line': return 'hover:bg-orange-100 border-orange-300';
              default: return 'hover:bg-gray-100 border-gray-300';
            }
          };

          return (
            <div key={elementId} className="space-y-1">
              <Button
                onClick={() => onItemClick(elementId)}
                variant={selectedItem === elementId ? "default" : "outline"}
                className={`w-full justify-start text-right h-auto p-2 border-2 transition-all text-sm ${
                  selectedItem === elementId
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : getElementColor(element.type)
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{getElementIcon(element.type)}</span>
                    <div className="text-right">
                      <div className="font-medium text-xs">{getElementName(element.type)}</div>
                      <div className="text-xs opacity-75">מותאם אישית</div>
                    </div>
                  </div>
                  {isAdmin && (
                    <Crown className={`w-3 h-3 ${selectedItem === elementId ? 'text-white' : 'text-amber-500'}`} />
                  )}
                </div>
              </Button>

              {/* Center Actions for custom elements */}
              <div className="flex gap-1">
                <Button
                  onClick={() => onCenterX?.(elementId)}
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs p-1 h-6"
                  title={`מרכז ${getElementName(element.type)} ציר X`}
                >
                  <Move className="w-3 h-3 mr-1 rotate-90" />
                  מרכז X
                </Button>
                <Button
                  onClick={() => onCenterY?.(elementId)}
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs p-1 h-6"
                  title={`מרכז ${getElementName(element.type)} ציר Y`}
                >
                  <Move className="w-3 h-3 mr-1" />
                  מרכז Y
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Tools Section */}
      <div className="p-3 border-t">
        <h4 className="font-semibold text-sm text-gray-800 mb-2">כלים חדשים</h4>
        <div className="grid grid-cols-2 gap-2">
          {newTools.map((tool) => (
            <Button
              key={tool.key}
              onClick={() => onAddElement?.(tool.key)}
              variant="outline"
              className={`h-auto p-2 border-2 transition-all text-xs ${tool.color}`}
            >
              <div className="flex flex-col items-center gap-1">
                {tool.icon}
                <span className="text-xs">{tool.name}</span>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="p-3 border-t">
        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-lg shadow-sm">
          <h4 className="font-medium text-blue-900 mb-2 text-sm">איך להשתמש:</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• לחץ על רכיב לפתיחת תפריט הגדרות</li>
            <li>• גרור רכיבים בתצוגה המקדימה</li>
            <li>• השתמש בכפתורי מרכז X/Y למיקום מדויק</li>
            <li>• הוסף אלמנטים חדשים עם הכלים החדשים</li>
          </ul>
        </div>
      </div>

      {/* User role info */}
      {!isAdmin && (
        <div className="p-5 border-t">
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-300 rounded-lg shadow-sm">
            <p className="text-sm text-yellow-900 font-medium">
              💡 כיוצר תוכן, תוכל לשנות רק את מיקום האלמנטים. עיצוב וטקסט ניתנים לעריכה על ידי מנהלים בלבד.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemButtons;