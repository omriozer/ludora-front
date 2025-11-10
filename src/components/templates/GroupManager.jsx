import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Group,
  Ungroup,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  Palette,
  MoreHorizontal
} from 'lucide-react';

const GroupManager = ({
  groups = {},
  elements = {},
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
  userRole
}) => {
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupName, setGroupName] = useState('');

  const isAdmin = userRole === 'admin' || userRole === 'sysadmin';

  // Group colors for visual distinction
  const groupColors = [
    'blue', 'green', 'purple', 'red', 'orange', 'yellow', 'pink', 'indigo'
  ];

  // Get next available color for new groups
  const getNextColor = () => {
    const usedColors = Object.values(groups).map(group => group.color);
    return groupColors.find(color => !usedColors.includes(color)) || groupColors[0];
  };

  // Toggle group expansion
  const toggleGroupExpansion = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // Start editing group name
  const startEditingGroup = (groupId, currentName) => {
    setEditingGroup(groupId);
    setGroupName(currentName);
  };

  // Save group name edit
  const saveGroupName = (groupId) => {
    if (groupName.trim()) {
      onGroupUpdate(groupId, { name: groupName.trim() });
    }
    setEditingGroup(null);
    setGroupName('');
  };

  // Cancel group name edit
  const cancelGroupEdit = () => {
    setEditingGroup(null);
    setGroupName('');
  };

  // Get elements in a group
  const getGroupElements = (groupId) => {
    return Object.entries(elements).filter(([, element]) => element.groupId === groupId);
  };

  // Check group states
  const getGroupState = (groupId) => {
    const groupElements = getGroupElements(groupId);
    const allVisible = groupElements.every(([, element]) => element.visible !== false);
    const allLocked = groupElements.every(([, element]) => element.locked);
    const elementCount = groupElements.length;

    return { allVisible, allLocked, elementCount };
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
        <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
          <Group className="w-4 h-4 text-purple-600" />
          ניהול קבוצות
        </h4>
        <div className="text-xs text-gray-600">
          {Object.keys(groups).length} קבוצות
        </div>
      </div>

      {/* Groups list */}
      <div className="space-y-2">
        {Object.keys(groups).length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <Group className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>אין קבוצות פעילות</p>
            <p className="text-xs mt-1">בחר מספר אלמנטים וקבץ אותם יחד</p>
          </div>
        ) : (
          Object.entries(groups).map(([groupId, group]) => {
            const { allVisible, allLocked, elementCount } = getGroupState(groupId);
            const isExpanded = expandedGroups.has(groupId);
            const isSelected = selectedGroupId === groupId;

            return (
              <div
                key={groupId}
                className={`border-2 rounded-lg transition-all ${
                  isSelected
                    ? `border-${group.color}-500 bg-${group.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Group header */}
                <div
                  className={`p-3 cursor-pointer bg-gradient-to-r from-${group.color}-50 to-transparent`}
                  onClick={() => onGroupSelect?.(groupId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Color indicator */}
                      <div className={`w-3 h-3 bg-${group.color}-500 rounded-full border border-white shadow-sm`}></div>

                      {/* Group name */}
                      {editingGroup === groupId ? (
                        <input
                          type="text"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveGroupName(groupId);
                            if (e.key === 'Escape') cancelGroupEdit();
                          }}
                          onBlur={() => saveGroupName(groupId)}
                          className="text-sm font-medium bg-white border border-gray-300 rounded px-2 py-1 w-32"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-800">
                          {group.name || `קבוצה ${groupId}`}
                        </span>
                      )}

                      {/* Element count */}
                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border">
                        {elementCount} פריטים
                      </span>
                    </div>

                    {/* Group actions */}
                    <div className="flex items-center gap-1">
                      {/* Status indicators */}
                      {!allVisible && <EyeOff className="w-3 h-3 text-gray-400" />}
                      {allLocked && <Lock className="w-3 h-3 text-gray-400" />}

                      {/* Expand/collapse */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroupExpansion(groupId);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Group content (when expanded) */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-3 space-y-3">

                    {/* Group actions */}
                    <div className="grid grid-cols-4 gap-2">

                      {/* Edit name */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditingGroup(groupId, group.name)}
                        className="h-8 text-xs"
                        title="ערוך שם"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>

                      {/* Toggle visibility */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onGroupToggleVisibility?.(groupId)}
                        className="h-8 text-xs"
                        title={allVisible ? 'הסתר קבוצה' : 'הצג קבוצה'}
                      >
                        {allVisible ? (
                          <EyeOff className="w-3 h-3 text-gray-500" />
                        ) : (
                          <Eye className="w-3 h-3 text-blue-600" />
                        )}
                      </Button>

                      {/* Toggle lock */}
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onGroupToggleLock?.(groupId)}
                          className="h-8 text-xs"
                          title={allLocked ? 'בטל נעילת קבוצה' : 'נעל קבוצה'}
                        >
                          {allLocked ? (
                            <Unlock className="w-3 h-3 text-gray-500" />
                          ) : (
                            <Lock className="w-3 h-3 text-red-500" />
                          )}
                        </Button>
                      )}

                      {/* Duplicate group */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onGroupDuplicate?.(groupId)}
                        className="h-8 text-xs"
                        title="שכפל קבוצה"
                      >
                        <Copy className="w-3 h-3 text-blue-600" />
                      </Button>
                    </div>

                    {/* Ungroup and delete */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Ungroup all elements
                          const groupElements = getGroupElements(groupId);
                          groupElements.forEach(([elementId]) => {
                            onElementRemoveFromGroup?.(elementId, groupId);
                          });
                        }}
                        className="h-8 text-xs"
                        title="בטל קיבוץ"
                      >
                        <Ungroup className="w-3 h-3 text-orange-600 mr-1" />
                        בטל קיבוץ
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onGroupDelete?.(groupId)}
                        className="h-8 text-xs text-red-600 hover:text-red-700"
                        title="מחק קבוצה"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        מחק
                      </Button>
                    </div>

                    {/* Elements in group */}
                    <div className="space-y-1">
                      <div className="text-xs text-gray-600 font-medium">אלמנטים בקבוצה:</div>
                      {getGroupElements(groupId).map(([elementId, element]) => (
                        <div
                          key={elementId}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded border text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {element.type ?
                                (element.type === 'box' ? '📦' : element.type === 'line' ? '➖' : '⋯') :
                                (elementId === 'logo' ? '🖼️' : elementId === 'text' ? '📝' : '🔗')
                              }
                            </span>
                            <span className="text-gray-700">
                              {element.type ?
                                (element.type === 'box' ? 'תיבה' : element.type === 'line' ? 'קו' : 'קו מנוקד') :
                                (elementId === 'logo' ? 'לוגו' : elementId === 'text' ? 'טקסט' : 'קישור')
                              }
                            </span>
                            {!element.visible && <EyeOff className="w-3 h-3 text-gray-400" />}
                            {element.locked && <Lock className="w-3 h-3 text-gray-400" />}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onElementRemoveFromGroup?.(elementId, groupId)}
                            className="h-5 w-5 p-0 text-gray-400 hover:text-red-500"
                            title="הסר מהקבוצה"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Quick actions for selected groups */}
      {Object.keys(groups).length > 0 && (
        <div className="p-3 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-600 mb-2">פעולות מהירות:</div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Hide all groups
                Object.keys(groups).forEach(groupId => {
                  onGroupToggleVisibility?.(groupId, false);
                });
              }}
              className="h-8 text-xs"
            >
              <EyeOff className="w-3 h-3 mr-1" />
              הסתר הכל
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Show all groups
                Object.keys(groups).forEach(groupId => {
                  onGroupToggleVisibility?.(groupId, true);
                });
              }}
              className="h-8 text-xs"
            >
              <Eye className="w-3 h-3 mr-1" />
              הצג הכל
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManager;