import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Plus, Tag, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { contentTopicService } from '@/services/contentTopicService';
import { ludlog, luderror } from '@/lib/ludlog';

/**
 * ContentTopicSelector - A reusable multi/single-select component for content topics
 *
 * Features:
 * - Multi-select topic selection with checkboxes (default)
 * - Single-select topic selection with click-to-select (singleSelection=true)
 * - Search functionality for topics
 * - Create new topic capability (admin only)
 * - Badge display for selected topics
 * - Modal and inline display modes
 * - Keyboard navigation support
 */
export function ContentTopicSelector({
  value = [], // Array of topic IDs or topic objects
  onValueChange, // Callback when selection changes
  disabled = false,
  placeholder = "בחר נושאי תוכן...",
  title = "נושאי תוכן",
  description = "בחר נושאים רלוונטיים לתוכן זה",
  searchPlaceholder = "חפש נושאים...",
  emptyMessage = "לא נמצאו נושאים",
  allowCreate = false, // Allow creating new topics (admin only)
  mode = "modal", // "modal" or "inline"
  maxHeight = "300px",
  showCount = true,
  singleSelection = false, // Enable single selection mode
  className = "",
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const searchInputRef = useRef(null);

  // Normalize value to always work with topic IDs
  const normalizeValue = useCallback((val) => {
    if (!Array.isArray(val)) return [];
    return val.map(item => typeof item === 'string' ? item : item?.id).filter(id => id !== null && id !== undefined && id !== '');
  }, []);

  const selectedIds = useMemo(() => normalizeValue(value), [value, normalizeValue]);

  // Load topics from API
  const loadTopics = async (search = '') => {
    try {
      setLoading(true);
      let result;

      if (search.trim()) {
        result = await contentTopicService.searchTopics(search, { limit: 50 });
      } else {
        result = await contentTopicService.getActiveTopics();
      }

      setTopics(Array.isArray(result) ? result : []);
    } catch (error) {
      luderror.ui('Failed to load content topics:', error);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  };

  // Load selected topic details
  const loadSelectedTopics = useCallback(async () => {
    try {
      if (selectedIds.length === 0) {
        setSelectedTopics([]);
        return;
      }

      // Get selected topics from the current topics list or fetch them
      const selected = [];
      const missingIds = [];

      selectedIds.forEach(id => {
        const existing = topics.find(t => t.id === id);
        if (existing) {
          selected.push(existing);
        } else {
          missingIds.push(id);
        }
      });

      // Fetch missing topics
      if (missingIds.length > 0) {
        const fetchPromises = missingIds.map(id =>
          contentTopicService.findById(id).catch(() => null)
        );
        const fetchedTopics = await Promise.all(fetchPromises);
        fetchedTopics.forEach(topic => {
          if (topic) selected.push(topic);
        });
      }

      setSelectedTopics(selected);
    } catch (error) {
      luderror.ui('Failed to load selected topics:', error);
    }
  }, [selectedIds, topics]);

  // Initialize topics on mount and when search changes
  useEffect(() => {
    loadTopics(searchQuery);
  }, [searchQuery]);

  // Load selected topic details when selectedIds change
  useEffect(() => {
    loadSelectedTopics();
  }, [loadSelectedTopics]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle topic selection
  const handleTopicToggle = (topic) => {
    if (disabled) return;

    if (singleSelection) {
      // For single selection, always replace with the selected topic and close modal
      onValueChange?.([topic.id]);
      setIsOpen(false);
    } else {
      // For multi-selection, toggle the topic
      const newSelectedIds = selectedIds.includes(topic.id)
        ? selectedIds.filter(id => id !== topic.id)
        : [...selectedIds, topic.id];

      onValueChange?.(newSelectedIds);
    }
  };

  // Handle search input
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle create new topic
  const handleCreateTopic = async () => {
    if (!newTopicName.trim() || !allowCreate || creating) return;

    try {
      setCreating(true);
      const newTopic = await contentTopicService.create({
        name: newTopicName.trim(),
        description: '',
        is_active: true
      });

      // Add to topics list and select it
      setTopics(prev => [newTopic, ...prev]);

      if (singleSelection) {
        // For single selection, select only this topic and close modal
        onValueChange?.([newTopic.id]);
        setIsOpen(false);
      } else {
        // For multi-selection, add to existing selection
        onValueChange?.([...selectedIds, newTopic.id]);
      }

      setNewTopicName('');

      ludlog.ui('Created new topic:', { data: newTopic });
    } catch (error) {
      luderror.ui('Failed to create topic:', error);
    } finally {
      setCreating(false);
    }
  };

  // Remove selected topic
  const removeSelectedTopic = (topicId) => {
    if (disabled) return;
    const newSelectedIds = selectedIds.filter(id => id !== topicId);
    onValueChange?.(newSelectedIds);
  };

  // Remove all selected topics (clear selection)
  const clearSelection = () => {
    if (disabled) return;
    onValueChange?.([]);
    if (singleSelection) {
      setIsOpen(false);
    }
  };

  // Render topic item
  const renderTopicItem = (topic) => {
    if (singleSelection) {
      // Single selection mode - no checkbox, click to select
      const isSelected = selectedIds.includes(topic.id);
      return (
        <div
          key={topic.id}
          onClick={() => handleTopicToggle(topic)}
          className={`flex items-center p-3 hover:bg-blue-50 rounded cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-100 border border-blue-200' : 'border border-transparent'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
              {topic.name}
            </div>
            {topic.description && (
              <p className={`text-xs truncate ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} title={topic.description}>
                {topic.description}
              </p>
            )}
          </div>
          {isSelected && (
            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2"></div>
          )}
        </div>
      );
    } else {
      // Multi-selection mode - with checkboxes
      return (
        <div key={topic.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
          <Checkbox
            id={`topic-${topic.id}`}
            checked={selectedIds.includes(topic.id)}
            onCheckedChange={() => handleTopicToggle(topic)}
            disabled={disabled}
          />
          <div className="flex-1 min-w-0">
            <Label
              htmlFor={`topic-${topic.id}`}
              className="text-sm font-medium cursor-pointer block truncate"
              title={topic.description || topic.name}
            >
              {topic.name}
            </Label>
            {topic.description && (
              <p className="text-xs text-gray-500 truncate" title={topic.description}>
                {topic.description}
              </p>
            )}
          </div>
        </div>
      );
    }
  };

  // Render selected topics as badges
  const renderSelectedBadges = () => (
    <div className="flex flex-wrap gap-1 min-h-[32px] items-start">
      {selectedTopics.map(topic => (
        <Badge key={topic.id} variant="secondary" className="flex items-center gap-1 text-xs">
          <Tag className="w-3 h-3" />
          <span>{topic.name}</span>
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeSelectedTopic(topic.id);
              }}
              className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </Badge>
      ))}
      {selectedTopics.length === 0 && (
        <span className="text-gray-400 text-sm">{placeholder}</span>
      )}
    </div>
  );

  // Render topic selection content
  const renderContent = () => (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          ref={searchInputRef}
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={handleSearchChange}
          className="pr-10"
          dir="rtl"
        />
      </div>

      {/* Create new topic */}
      {allowCreate && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between" size="sm">
              <span>יצירת נושא חדש</span>
              <Plus className="w-4 h-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <div className="flex gap-2">
              <Input
                placeholder="שם הנושא החדש"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateTopic()}
                disabled={creating}
                dir="rtl"
              />
              <Button
                onClick={handleCreateTopic}
                disabled={!newTopicName.trim() || creating}
                size="sm"
              >
                {creating ? 'יוצר...' : 'צור'}
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Topics list */}
      <ScrollArea style={{ maxHeight: maxHeight }} className="border rounded-md">
        <div className="p-2 space-y-1">
          {loading ? (
            <div className="text-center py-4 text-sm text-gray-500">טוען נושאים...</div>
          ) : topics.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">{emptyMessage}</div>
          ) : (
            topics.map(renderTopicItem)
          )}
        </div>
      </ScrollArea>

      {/* Selection summary and actions */}
      {showCount && selectedIds.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          נבחרו {selectedIds.length} נושאים
        </div>
      )}

      {/* Clear selection button for single selection mode when a topic is selected */}
      {singleSelection && selectedIds.length > 0 && !disabled && (
        <div className="pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
          >
            <X className="w-4 h-4 mr-2" />
            הסר נושא תוכן
          </Button>
        </div>
      )}
    </div>
  );

  if (mode === "inline") {
    return (
      <div className={`space-y-3 ${className}`} {...props}>
        <div className="space-y-2">
          <Label className="text-sm font-medium">{title}</Label>
          {description && <p className="text-xs text-gray-600">{description}</p>}
        </div>

        {/* Selected topics display */}
        <Card>
          <CardContent className="p-3">
            {renderSelectedBadges()}
          </CardContent>
        </Card>

        {/* Inline selection */}
        {!disabled && (
          <Card>
            <CardContent className="p-4">
              {renderContent()}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Modal mode (default)
  return (
    <div className={`space-y-2 ${className}`} {...props}>
      <Label className="text-sm font-medium">{title}</Label>
      {description && <p className="text-xs text-gray-600">{description}</p>}

      {/* Selected topics display */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full min-h-[40px] justify-start text-right"
            disabled={disabled}
          >
            <div className="flex-1">
              {singleSelection ? (
                // Single selection mode - show selected topic name
                selectedTopics.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-900">{selectedTopics[0].name}</span>
                  </div>
                ) : (
                  <span className="text-gray-400">{placeholder}</span>
                )
              ) : (
                // Multi-selection mode - show badges
                renderSelectedBadges()
              )}
            </div>
            {!disabled && (
              <ChevronDown className="w-4 h-4 shrink-0" />
            )}
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {renderContent()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContentTopicSelector;