import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  X,
  Check,
  Languages,
  Image,
  HelpCircle,
  List,
  Globe,
  Filter,
  Star,
  Eye,
  Minus,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

import { Word, WordEN, QA, Image as ImageEntity, ContentList } from '@/services/entities';

const CONTENT_TYPES = {
  word: {
    name: 'מילים',
    icon: Languages,
    color: 'blue',
    entity: Word,
    searchFields: ['text', 'translation']
  },
  wordEN: {
    name: 'מילים באנגלית',
    icon: Globe,
    color: 'green',
    entity: WordEN,
    searchFields: ['text', 'translation']
  },
  qa: {
    name: 'שאלות ותשובות',
    icon: HelpCircle,
    color: 'purple',
    entity: QA,
    searchFields: ['question', 'answer', 'subject']
  },
  image: {
    name: 'תמונות',
    icon: Image,
    color: 'orange',
    entity: ImageEntity,
    searchFields: ['title', 'description', 'tags']
  },
  contentList: {
    name: 'רשימות תוכן',
    icon: List,
    color: 'indigo',
    entity: ContentList,
    searchFields: ['name', 'description', 'tags']
  }
};

export default function ContentSelector({
  isOpen,
  onClose,
  onSelect,
  selectedContent = [],
  contentType = null, // If specified, only show this type
  multiple = true,
  title = 'בחר תוכן למשחק'
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(contentType || 'word');
  const [allContent, setAllContent] = useState({});
  const [expandedLists, setExpandedLists] = useState(new Set());
  const [excludedFromLists, setExcludedFromLists] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Load content for active tab
  useEffect(() => {
    if (isOpen && activeTab && !allContent[activeTab]) {
      loadContent(activeTab);
    }
  }, [isOpen, activeTab]);

  // Generate smart suggestions based on search term
  useEffect(() => {
    if (searchTerm.length > 0) {
      generateSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [searchTerm, allContent, activeTab]);

  const loadContent = async (type) => {
    if (allContent[type]) return;

    setLoading(true);
    try {
      const entity = CONTENT_TYPES[type].entity;
      const content = await entity.find({});

      setAllContent(prev => ({
        ...prev,
        [type]: content || []
      }));
    } catch (error) {
      console.error(`Error loading ${type} content:`, error);
      setAllContent(prev => ({
        ...prev,
        [type]: []
      }));
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = useCallback(() => {
    const currentContent = allContent[activeTab] || [];
    const searchFields = CONTENT_TYPES[activeTab].searchFields;

    const matches = currentContent.filter(item => {
      return searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (Array.isArray(value)) {
          return value.some(v =>
            typeof v === 'string' && v.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        return false;
      });
    });

    // Sort by relevance (exact matches first, then partial matches)
    matches.sort((a, b) => {
      const aExact = searchFields.some(field =>
        a[field]?.toLowerCase() === searchTerm.toLowerCase()
      );
      const bExact = searchFields.some(field =>
        b[field]?.toLowerCase() === searchTerm.toLowerCase()
      );

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return 0;
    });

    setSuggestions(matches.slice(0, 10)); // Limit to 10 suggestions
  }, [searchTerm, allContent, activeTab]);

  // Handle content list expansion
  const toggleListExpansion = (listId) => {
    const newExpanded = new Set(expandedLists);
    if (newExpanded.has(listId)) {
      newExpanded.delete(listId);
    } else {
      newExpanded.add(listId);
    }
    setExpandedLists(newExpanded);
  };

  // Handle excluding content from lists
  const toggleContentExclusion = (listId, contentId) => {
    const key = `${listId}_${contentId}`;
    const newExcluded = new Set(excludedFromLists);
    if (newExcluded.has(key)) {
      newExcluded.delete(key);
    } else {
      newExcluded.add(key);
    }
    setExcludedFromLists(newExcluded);
  };

  // Check if content is selected
  const isContentSelected = (content) => {
    return selectedContent.some(item =>
      item.id === content.id && item.type === activeTab
    );
  };

  // Handle content selection
  const handleContentSelect = (content) => {
    const contentWithType = { ...content, type: activeTab };

    if (multiple) {
      const isSelected = isContentSelected(content);
      if (isSelected) {
        // Remove from selection
        const newSelection = selectedContent.filter(item =>
          !(item.id === content.id && item.type === activeTab)
        );
        onSelect(newSelection);
      } else {
        // Add to selection
        onSelect([...selectedContent, contentWithType]);
      }
    } else {
      // Single selection
      onSelect([contentWithType]);
      onClose();
    }
  };

  // Handle content list selection
  const handleListSelect = (list) => {
    if (activeTab !== 'contentList') return;

    const listWithType = {
      ...list,
      type: 'contentList',
      excludedContent: Array.from(excludedFromLists)
        .filter(key => key.startsWith(`${list.id}_`))
        .map(key => key.split('_')[1])
    };

    if (multiple) {
      const isSelected = selectedContent.some(item =>
        item.id === list.id && item.type === 'contentList'
      );
      if (isSelected) {
        const newSelection = selectedContent.filter(item =>
          !(item.id === list.id && item.type === 'contentList')
        );
        onSelect(newSelection);
      } else {
        onSelect([...selectedContent, listWithType]);
      }
    } else {
      onSelect([listWithType]);
      onClose();
    }
  };

  // Get content type info
  const getContentTypeInfo = (type) => CONTENT_TYPES[type];

  // Filter content based on search
  const filteredContent = useMemo(() => {
    if (!searchTerm) return allContent[activeTab] || [];
    return suggestions;
  }, [searchTerm, suggestions, allContent, activeTab]);

  // Available tabs (filter if contentType is specified)
  const availableTabs = useMemo(() => {
    if (contentType) {
      return [contentType];
    }
    return Object.keys(CONTENT_TYPES);
  }, [contentType]);

  const renderContentItem = (content) => {
    const typeInfo = getContentTypeInfo(activeTab);
    const Icon = typeInfo.icon;
    const isSelected = isContentSelected(content);

    return (
      <div
        key={content.id}
        className={`p-3 border rounded-lg cursor-pointer transition-all ${
          isSelected
            ? `border-${typeInfo.color}-500 bg-${typeInfo.color}-50`
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
        onClick={() => handleContentSelect(content)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Icon className={`w-5 h-5 mt-1 text-${typeInfo.color}-600`} />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">
                {content.text || content.question || content.title || content.name}
              </h4>
              {(content.translation || content.answer || content.description) && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {content.translation || content.answer || content.description}
                </p>
              )}
              {content.tags && content.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {content.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {content.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{content.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="mr-2">
            {isSelected ? (
              <Check className={`w-5 h-5 text-${typeInfo.color}-600`} />
            ) : (
              <Plus className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContentList = (list) => {
    const isExpanded = expandedLists.has(list.id);
    const isSelected = selectedContent.some(item =>
      item.id === list.id && item.type === 'contentList'
    );

    return (
      <div key={list.id} className="border rounded-lg overflow-hidden">
        <div
          className={`p-3 cursor-pointer transition-all ${
            isSelected
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => handleListSelect(list)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <List className="w-5 h-5 text-indigo-600" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{list.name}</h4>
                {list.description && (
                  <p className="text-sm text-gray-600 mt-1">{list.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>{list.content_count || 0} פריטים</span>
                  {list.tags && (
                    <span>תגיות: {list.tags.join(', ')}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSelected && (
                <Check className="w-5 h-5 text-indigo-600" />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleListExpansion(list.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && list.content && (
          <div className="border-t bg-gray-50 p-3">
            <h5 className="text-sm font-medium text-gray-700 mb-2">
              תוכן ברשימה ({list.content.length}):
            </h5>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {list.content.map((content) => {
                const isExcluded = excludedFromLists.has(`${list.id}_${content.id}`);
                return (
                  <div
                    key={content.id}
                    className={`flex items-center justify-between p-2 rounded text-sm ${
                      isExcluded ? 'bg-red-50 text-red-700' : 'bg-white'
                    }`}
                  >
                    <span className={isExcluded ? 'line-through' : ''}>
                      {content.text || content.question || content.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => toggleContentExclusion(list.id, content.id)}
                    >
                      {isExcluded ? (
                        <Plus className="w-3 h-3 text-green-600" />
                      ) : (
                        <Minus className="w-3 h-3 text-red-600" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            חפש ובחר תוכן מהמערכת שלך. בחר רשימות תוכן כדי לכלול תוכן קיים.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-[70vh]">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="חפש תוכן..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* Content Type Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
            <TabsList className="grid grid-cols-5 mb-4">
              {availableTabs.map((type) => {
                const typeInfo = getContentTypeInfo(type);
                const Icon = typeInfo.icon;
                return (
                  <TabsTrigger key={type} value={type} className="flex items-center gap-1">
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{typeInfo.name}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {availableTabs.map((type) => (
              <TabsContent key={type} value={type} className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {type === 'contentList' ? (
                        filteredContent.map((list) => renderContentList(list))
                      ) : (
                        filteredContent.map((content) => renderContentItem(content))
                      )}
                      {filteredContent.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          {searchTerm ? 'לא נמצא תוכן מתאים' : 'אין תוכן זמין'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Selected Content Summary */}
          {selectedContent.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-gray-900 mb-2">
                תוכן נבחר ({selectedContent.length}):
              </h4>
              <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                {selectedContent.map((item) => {
                  const typeInfo = getContentTypeInfo(item.type);
                  const Icon = typeInfo.icon;
                  return (
                    <div
                      key={`${item.type}_${item.id}`}
                      className={`flex items-center gap-1 bg-${typeInfo.color}-50 text-${typeInfo.color}-700 px-2 py-1 rounded text-sm`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{item.text || item.question || item.title || item.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-red-100"
                        onClick={() => {
                          const newSelection = selectedContent.filter(selected =>
                            !(selected.id === item.id && selected.type === item.type)
                          );
                          onSelect(newSelection);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={onClose}>
              ביטול
            </Button>
            <Button
              onClick={onClose}
              disabled={!multiple && selectedContent.length === 0}
            >
              {multiple ? 'סיום' : 'בחר'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}