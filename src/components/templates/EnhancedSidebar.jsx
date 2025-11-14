import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Grid,
  Group,
  Eye,
  Layout,
  Maximize2,
  Minimize2
} from 'lucide-react';

// Import the new components
import ItemButtons from './ItemButtons';
import GroupManager from './GroupManager';
import BulkOperationsToolbar from './BulkOperationsToolbar';

const EnhancedSidebar = ({
  // Props from original components
  templateConfig,
  onItemClick,
  selectedItem,
  userRole,
  onCenterX,
  onCenterY,
  onAddElement,
  onToggleVisibility,
  onLockToggle,
  onDuplicate,
  onDelete,

  // New grouping and layer props
  groups = {},
  onGroupCreate,
  onGroupUpdate,
  onGroupDelete,
  onGroupToggleVisibility,
  onGroupToggleLock,
  onGroupDuplicate,
  onElementAddToGroup,
  onElementRemoveFromGroup,
  onGroupSelect,
  selectedGroupId,


  // Multi-selection props
  selectedItems = [],
  onSelectionChange,
  onBulkAction,

  // Template type for watermark-specific tools
  templateType = 'branding',

  // Menu state
  isOpen = true,
  onToggleOpen,
  position = 'right'
}) => {
  const [activeTab, setActiveTab] = useState('elements');
  const [isMinimized, setIsMinimized] = useState(false);
  const [menuWidth, setMenuWidth] = useState(320);

  // Combine built-in and custom elements for layer/bulk operations
  const allElements = {
    ...templateConfig,
    ...templateConfig?.customElements
  };

  // Remove customElements from the root level to avoid duplication
  const { customElements, ...builtInElements } = templateConfig || {};

  const combinedElements = {
    ...builtInElements,
    ...customElements
  };

  // Calculate visible elements count (same logic as ItemButtons.jsx)
  const getVisibleElementsCount = () => {
    let count = 0;

    // Count visible built-in elements (backend-compatible logic)
    ['logo', 'url', 'copyright-text'].forEach(builtInKey => {
      const builtInElement = templateConfig?.[builtInKey];
      if (builtInElement && builtInElement.visible !== false && builtInElement.hidden !== true) {
        count++;
      }
    });

    // Count visible custom elements (backend-compatible logic)
    Object.entries(customElements || {}).forEach(([elementId, element]) => {
      if (element && element.visible !== false && element.hidden !== true) {
        count++;
      }
    });

    return count;
  };

  // Tab configuration
  const tabs = [
    {
      key: 'elements',
      icon: Grid,
      label: 'אלמנטים',
      count: getVisibleElementsCount()
    },
    {
      key: 'groups',
      icon: Group,
      label: 'קבוצות',
      count: Object.keys(groups).length
    }
  ];

  // Handle multi-selection
  const handleMultiSelect = (items) => {
    onSelectionChange?.(items);
  };

  // Handle bulk operations
  const handleBulkOperation = (operation, data) => {
    onBulkAction?.(operation, data);
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'elements':
        return (
          <ItemButtons
            templateConfig={templateConfig}
            onItemClick={onItemClick}
            selectedItem={selectedItem}
            userRole={userRole}
            onCenterX={onCenterX}
            onCenterY={onCenterY}
            onAddElement={onAddElement}
            onToggleVisibility={onToggleVisibility}
            onLockToggle={onLockToggle}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            selectedItems={selectedItems}
            onSelectionChange={onSelectionChange}
            templateType={templateType}
          />
        );

      case 'groups':
        return (
          <GroupManager
            groups={groups}
            elements={combinedElements}
            onGroupCreate={onGroupCreate}
            onGroupUpdate={onGroupUpdate}
            onGroupDelete={onGroupDelete}
            onGroupToggleVisibility={onGroupToggleVisibility}
            onGroupToggleLock={onGroupToggleLock}
            onGroupDuplicate={onGroupDuplicate}
            onElementAddToGroup={onElementAddToGroup}
            onElementRemoveFromGroup={onElementRemoveFromGroup}
            onGroupSelect={onGroupSelect}
            selectedGroupId={selectedGroupId}
            userRole={userRole}
          />
        );


      default:
        return null;
    }
  };

  if (!isOpen) {
    return (
      <div className={`fixed top-4 ${position === 'right' ? 'right-4' : 'left-4'} z-40`}>
        <Button
          variant="default"
          onClick={onToggleOpen}
          className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
          title="פתח תפריט הגדרות"
        >
          <Settings className="w-5 h-5 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && window.innerWidth < 1024 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onToggleOpen}
        />
      )}

      {/* Main menu panel */}
      <div
        className={`fixed top-0 ${position === 'right' ? 'right-0' : 'left-0'} h-full z-40
          ${isMinimized ? 'w-16' : 'w-80'} bg-white border-l border-gray-200 shadow-xl
          transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : position === 'right' ? 'translate-x-full' : '-translate-x-full'}
          lg:translate-x-0 lg:relative lg:z-0`}
        style={{ width: isMinimized ? 64 : menuWidth }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          {!isMinimized && (
            <div>
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                עורך התצוגה
              </h3>
              <p className="text-xs text-gray-600">נהל אלמנטים, קבוצות ושכבות</p>
            </div>
          )}

          {/* Header controls */}
          <div className="flex items-center gap-1">
            {/* Minimize toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0"
              title={isMinimized ? "הרחב" : "מזער"}
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4" />
              ) : (
                <Minimize2 className="w-4 h-4" />
              )}
            </Button>

            {/* Close on mobile */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleOpen}
              className="h-8 w-8 p-0 lg:hidden"
              title="סגור"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {!isMinimized ? (
          <>
            {/* Tab navigation */}
            <div className="border-b bg-gray-50">
              <div className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex flex-col items-center gap-1 p-3 text-xs font-medium transition-colors
                      ${activeTab === tab.key
                        ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                      }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full
                        ${activeTab === tab.key
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-200 text-gray-600'}`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
              {renderTabContent()}
            </div>
          </>
        ) : (
          /* Minimized mode - icon navigation */
          <div className="flex flex-col items-center pt-4 space-y-4">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setActiveTab(tab.key);
                  setIsMinimized(false);
                }}
                className="h-10 w-10 p-0 relative"
                title={tab.label}
              >
                <tab.icon className="w-4 h-4" />
                {tab.count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {tab.count}
                  </span>
                )}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Bulk operations toolbar - appears when items are selected and in elements tab */}
      {selectedItems.length > 0 && activeTab === 'elements' && (
        <BulkOperationsToolbar
          selectedItems={selectedItems}
          selectedElements={combinedElements}
          onGroup={() => handleBulkOperation('group', selectedItems)}
          onUngroup={() => handleBulkOperation('ungroup', selectedItems)}
          onDuplicate={() => handleBulkOperation('duplicate', selectedItems)}
          onDelete={() => handleBulkOperation('delete', selectedItems)}
          onMove={() => handleBulkOperation('move', selectedItems)}
          onLock={() => handleBulkOperation('lock', selectedItems)}
          onUnlock={() => handleBulkOperation('unlock', selectedItems)}
          onShow={() => handleBulkOperation('show', selectedItems)}
          onHide={() => handleBulkOperation('hide', selectedItems)}
          onAlignLeft={() => handleBulkOperation('alignLeft', selectedItems)}
          onAlignTop={() => handleBulkOperation('alignTop', selectedItems)}
          onAlignCenter={() => handleBulkOperation('alignCenter', selectedItems)}
          onDistribute={() => handleBulkOperation('distribute', selectedItems)}
          onClearSelection={() => handleMultiSelect([])}
          userRole={userRole}
        />
      )}
    </>
  );
};

export default EnhancedSidebar;