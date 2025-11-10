import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Group,
  Ungroup,
  Copy,
  Trash2,
  Move,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Layers,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyStart,
  MoreHorizontal
} from 'lucide-react';

const BulkOperationsToolbar = ({
  selectedItems = [],
  selectedElements = {},
  onGroup,
  onUngroup,
  onDuplicate,
  onDelete,
  onMove,
  onLock,
  onUnlock,
  onShow,
  onHide,
  onAlignLeft,
  onAlignTop,
  onAlignCenter,
  onDistribute,
  onClearSelection,
  userRole
}) => {
  const isAdmin = userRole === 'admin' || userRole === 'sysadmin';
  const selectedCount = selectedItems.length;

  if (selectedCount === 0) return null;

  // Check if all selected items have specific states
  const allLocked = selectedItems.every(id => selectedElements[id]?.locked);
  const allUnlocked = selectedItems.every(id => !selectedElements[id]?.locked);
  const allVisible = selectedItems.every(id => selectedElements[id]?.visible !== false);
  const allHidden = selectedItems.every(id => selectedElements[id]?.visible === false);

  // Check if items can be grouped/ungrouped
  const hasGroupedItems = selectedItems.some(id => selectedElements[id]?.groupId);
  const canGroup = selectedCount >= 2 && !hasGroupedItems;
  const canUngroup = hasGroupedItems;

  return (
    <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:max-w-md z-50">
      <div className="bg-white border-2 border-blue-500 rounded-lg shadow-lg p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-800">
              {selectedCount} פריטים נבחרו
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
            title="בטל בחירה"
          >
            ×
          </Button>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">

          {/* Primary actions row */}
          <div className="grid grid-cols-4 gap-2">

            {/* Group/Ungroup */}
            {canGroup && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGroup}
                className="flex flex-col items-center gap-1 h-auto p-2"
                title="קבץ אלמנטים"
              >
                <Group className="w-4 h-4 text-green-600" />
                <span className="text-xs">קבץ</span>
              </Button>
            )}

            {canUngroup && (
              <Button
                variant="outline"
                size="sm"
                onClick={onUngroup}
                className="flex flex-col items-center gap-1 h-auto p-2"
                title="בטל קיבוץ"
              >
                <Ungroup className="w-4 h-4 text-orange-600" />
                <span className="text-xs">בטל קיבוץ</span>
              </Button>
            )}

            {/* Duplicate */}
            <Button
              variant="outline"
              size="sm"
              onClick={onDuplicate}
              className="flex flex-col items-center gap-1 h-auto p-2"
              title="שכפל אלמנטים"
            >
              <Copy className="w-4 h-4 text-blue-600" />
              <span className="text-xs">שכפל</span>
            </Button>

            {/* Delete */}
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="flex flex-col items-center gap-1 h-auto p-2 text-red-600 hover:text-red-700 hover:border-red-300"
              title="מחק אלמנטים"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-xs">מחק</span>
            </Button>
          </div>

          {/* Secondary actions row */}
          <div className="grid grid-cols-4 gap-2">

            {/* Lock/Unlock */}
            {isAdmin && !allLocked && (
              <Button
                variant="outline"
                size="sm"
                onClick={onLock}
                className="flex flex-col items-center gap-1 h-auto p-2"
                title="נעל אלמנטים"
              >
                <Lock className="w-4 h-4 text-gray-600" />
                <span className="text-xs">נעל</span>
              </Button>
            )}

            {isAdmin && !allUnlocked && (
              <Button
                variant="outline"
                size="sm"
                onClick={onUnlock}
                className="flex flex-col items-center gap-1 h-auto p-2"
                title="בטל נעילה"
              >
                <Unlock className="w-4 h-4 text-gray-600" />
                <span className="text-xs">בטל נעילה</span>
              </Button>
            )}

            {/* Show/Hide */}
            {!allVisible && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShow}
                className="flex flex-col items-center gap-1 h-auto p-2"
                title="הצג אלמנטים"
              >
                <Eye className="w-4 h-4 text-green-600" />
                <span className="text-xs">הצג</span>
              </Button>
            )}

            {!allHidden && (
              <Button
                variant="outline"
                size="sm"
                onClick={onHide}
                className="flex flex-col items-center gap-1 h-auto p-2"
                title="הסתר אלמנטים"
              >
                <EyeOff className="w-4 h-4 text-gray-600" />
                <span className="text-xs">הסתר</span>
              </Button>
            )}

            {/* Move */}
            <Button
              variant="outline"
              size="sm"
              onClick={onMove}
              className="flex flex-col items-center gap-1 h-auto p-2"
              title="הזז יחד"
            >
              <Move className="w-4 h-4 text-purple-600" />
              <span className="text-xs">הזז</span>
            </Button>
          </div>

          {/* Alignment actions */}
          {selectedCount >= 2 && (
            <div className="border-t pt-2">
              <div className="text-xs text-gray-600 mb-1">יישור:</div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAlignLeft}
                  className="flex items-center gap-1 h-auto p-2"
                  title="ישר לשמאל"
                >
                  <AlignHorizontalJustifyStart className="w-3 h-3" />
                  <span className="text-xs">שמאל</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAlignTop}
                  className="flex items-center gap-1 h-auto p-2"
                  title="ישר למעלה"
                >
                  <AlignVerticalJustifyStart className="w-3 h-3" />
                  <span className="text-xs">למעלה</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAlignCenter}
                  className="flex items-center gap-1 h-auto p-2"
                  title="ישר למרכז"
                >
                  <MoreHorizontal className="w-3 h-3" />
                  <span className="text-xs">מרכז</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="mt-3 pt-2 border-t text-xs text-gray-500">
          {selectedCount} פריטים •
          {allLocked ? ' נעולים' : allUnlocked ? ' לא נעולים' : ' מעורבים'} •
          {allVisible ? ' גלויים' : allHidden ? ' מוסתרים' : ' מעורבים'}
        </div>
      </div>
    </div>
  );
};

export default BulkOperationsToolbar;