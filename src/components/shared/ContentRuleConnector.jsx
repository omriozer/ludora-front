import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Plus, Filter, Search, Languages, Book, ImageIcon, HelpCircle, List, ChevronDown, ChevronRight, Settings, ChevronUp, Info } from 'lucide-react';
import { Word, WordEN, QA, Image, ContentList, ContentRelationship, Attribute } from '@/services/entities';
import { GAME_TYPES, getGameTypeConfig } from '@/config/gameTypes';
import { printLog } from '../../utils/logger';

// Content type configurations
const CONTENT_TYPES = {
  Word: {
    name: 'מילים בעברית',
    icon: Languages,
    color: 'blue',
    entity: Word,
    searchFields: ['word', 'vocalized', 'context'],
    filterableAttributes: ['difficulty', 'root']
  },
  WordEN: {
    name: 'מילים באנגלית',
    icon: Book,
    color: 'green',
    entity: WordEN,
    searchFields: ['word'],
    filterableAttributes: ['difficulty']
  },
  QA: {
    name: 'שאלות ותשובות',
    icon: HelpCircle,
    color: 'purple',
    entity: QA,
    searchFields: ['question', 'answer'],
    filterableAttributes: ['difficulty']
  },
  Image: {
    name: 'תמונות',
    icon: ImageIcon,
    color: 'orange',
    entity: Image,
    searchFields: ['name', 'description'],
    filterableAttributes: []
  },
  ContentList: {
    name: 'רשימות תוכן',
    icon: List,
    color: 'indigo',
    entity: ContentList,
    searchFields: ['name', 'description'],
    filterableAttributes: []
  }
};

// Utility functions for grouping content
const groupContentByType = (content) => {
  return content.reduce((groups, item) => {
    const type = item.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(item);
    return groups;
  }, {});
};

const groupContentBySource = (content) => {
  return content.reduce((groups, item) => {
    const sourceKey = item.sourceList ? `list_${item.sourceList.id}` : 'manual';
    if (!groups[sourceKey]) {
      groups[sourceKey] = [];
    }
    groups[sourceKey].push(item);
    return groups;
  }, {});
};

// ContentBadge component for displaying content items
function ContentBadge({ content, onRemove, onExclude, isFromList = false }) {
  const config = CONTENT_TYPES[content.type];
  const Icon = config?.icon || Settings;

  const getContentDisplayName = (content) => {
    switch (content.type) {
      case 'Word':
        return content.vocalized || content.word || 'מילה ללא שם';
      case 'WordEN':
        return content.word || 'מילה ללא שם';
      case 'QA':
        const question = content.question_text || content.question || 'שאלה ללא טקסט';
        const answer = content.answer_text || content.answer || '';
        return answer ? `${question} (תשובה: ${answer})` : question;
      case 'Image':
        const imageName = content.name || content.title || 'תמונה ללא שם';
        return content.description ? `${imageName} - ${content.description}` : imageName;
      case 'ContentList':
        const listName = content.name || content.title || 'רשימה ללא שם';
        return content.description ? `${listName} - ${content.description}` : listName;
      default:
        return content.name || content.title || 'פריט ללא שם';
    }
  };

  const handleRemoveClick = () => {
    console.log('🔴 ContentBadge X clicked:', {
      contentId: content.id,
      contentType: content.type,
      isFromList: isFromList,
      hasSourceList: !!content.sourceList,
      sourceListName: content.sourceList?.name
    });

    // If it's from a list, exclude it instead of removing it completely
    if (isFromList && content.sourceList && onExclude) {
      console.log('🔴 Excluding item from list instead of removing');
      onExclude(content, true);
    } else {
      console.log('🔴 Removing item completely');
      onRemove(content);
    }
  };

  return (
    <Badge
      variant={isFromList ? "secondary" : "outline"}
      className={`flex items-center gap-2 px-3 py-1 ${
        isFromList
          ? 'border-purple-200 bg-purple-50 text-purple-700'
          : 'border-gray-200 text-gray-700'
      }`}
      title={isFromList && content.sourceList ? `מרשימה: ${content.sourceList.name}` : ''}
    >
      <Icon className="w-3 h-3" />
      <span className="text-sm">{getContentDisplayName(content)}</span>
      {isFromList && content.sourceList && (
        <span className="text-xs opacity-70">
          ({content.sourceList.name})
        </span>
      )}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-auto p-0 ml-1 hover:bg-transparent"
        onClick={handleRemoveClick}
        title={isFromList ? "החרג פריט זה מהמשחק (הוא יועבר לרשימת המוחרגים)" : "הסר פריט זה לחלוטין"}
      >
        <X className="w-3 h-3" />
      </Button>
    </Badge>
  );
}

// ContentListPreview component for showing list contents before selection
function ContentListPreview({ contentList, selectedContentTypes = [] }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contentList) {
      loadPreview();
    }
  }, [contentList, selectedContentTypes]);

  const loadPreview = async () => {
    if (!contentList) return;

    setLoading(true);
    try {
      let response = [];

      // Try multiple methods to get content list items
      try {
        // Method 1: Direct API call
        if (ContentList.getContentItems) {
          response = await ContentList.getContentItems(contentList.id);
        }
      } catch (directError) {
        printLog('Direct getContentItems failed, trying relationships:', directError.message);

        try {
          // Method 2: Use ContentRelationship to find linked content
          const relationships = await ContentRelationship.find({
            source_type: 'ContentList',
            source_id: contentList.id
          });

          console.log('Found relationships:', relationships);

          // Extract content items from relationships
          const contentPromises = relationships.map(async (rel) => {
            try {
              const entityService = CONTENT_TYPES[rel.target_type]?.entity;
              if (entityService) {
                const item = await entityService.findById(rel.target_id);
                return { ...item, type: rel.target_type };
              }
            } catch (itemError) {
              printLog('Error loading item:', rel, itemError);
              return null;
            }
          });

          const contentItems = await Promise.all(contentPromises);
          response = contentItems.filter(item => item !== null);
        } catch (relationshipError) {
          console.log('Relationship method failed, trying reverse relationships:', relationshipError);

          try {
            // Method 3: Try reverse relationships (target_type = ContentList)
            const reverseRelationships = await ContentRelationship.find({
              target_type: 'ContentList',
              target_id: contentList.id
            });

            console.log('Found reverse relationships:', reverseRelationships);

            const reverseContentPromises = reverseRelationships.map(async (rel) => {
              try {
                const entityService = CONTENT_TYPES[rel.source_type]?.entity;
                if (entityService) {
                  const item = await entityService.findById(rel.source_id);
                  return { ...item, type: rel.source_type };
                }
              } catch (itemError) {
                printLog('Error loading reverse item:', rel, itemError);
                return null;
              }
            });

            const reverseContentItems = await Promise.all(reverseContentPromises);
            response = reverseContentItems.filter(item => item !== null);
          } catch (reverseError) {
            console.error('All methods failed to load content list items:', reverseError);
            response = [];
          }
        }
      }

      printLog('ContentListPreview - Loaded content items:', response);

      // Show all content from the list (no filtering by type)
      const filteredContent = response;

      // Group by type and count
      const typeCounts = {};
      let totalCount = 0;

      filteredContent.forEach(item => {
        if (!typeCounts[item.type]) {
          typeCounts[item.type] = 0;
        }
        typeCounts[item.type] += 1;
        totalCount += 1;
      });

      setPreview({ typeCounts, totalCount, filteredContent });
    } catch (error) {
      printLog('Error loading list preview:', error);
      setPreview({ typeCounts: {}, totalCount: 0, filteredContent: [] });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500 flex items-center gap-2">
        <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
        טוען תוכן...
      </div>
    );
  }

  if (!preview) {
    return <div className="text-sm text-gray-500">לא ניתן לטעון תוכן</div>;
  }

  if (preview.totalCount === 0) {
    return <div className="text-sm text-orange-600">הרשימה ריקה או לא נמצאו פריטים מתאימים</div>;
  }

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <div className="text-gray-500 font-medium">
        {preview.totalCount} פריטים כולל:
      </div>
      {Object.entries(preview.typeCounts).map(([type, count]) => {
        const config = CONTENT_TYPES[type];
        const Icon = config?.icon || Settings;
        return (
          <div
            key={type}
            className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-gray-700"
          >
            <Icon className="w-3 h-3" />
            <span>{count} {config?.name || type}</span>
          </div>
        );
      })}
    </div>
  );
}

// Stage connection types
const CONNECTION_TYPES = {
  manual: {
    name: 'בחירה ידנית',
    description: 'בחר תכנים ספציפיים עבור השלב הזה'
  },
  attribute: {
    name: 'לפי תכונות',
    description: 'כלול תכנים שמתאימים לתכונות מסוימות'
  },
  relation: {
    name: 'לפי קשרים',
    description: 'כלול תכנים שמקושרים לתכנים אחרים'
  },
  list: {
    name: 'רשימת תוכן',
    description: 'כלול כל התכנים מרשימה קיימת'
  },
  combined: {
    name: 'שילוב מקורות',
    description: 'שלב בחירה ידנית, רשימות ותכונות'
  }
};


function ContentListExpander({ contentList, onContentSelect, onContentDeselect, selectedContent = [], excludedContent = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [listContent, setListContent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contentCount, setContentCount] = useState(0);

  useEffect(() => {
    if (contentList) {
      loadListContent();
    }
  }, [contentList]);

  const loadListContent = async () => {
    if (!contentList) return;

    setLoading(true);
    try {
      // Load actual content list items from the API
      let response = [];

      // Try to get content items from the ContentList entity
      if (ContentList.getContentItems) {
        response = await ContentList.getContentItems(contentList.id);
      } else {
        // Fallback: if getContentItems doesn't exist, try to load the list details
        console.warn('ContentList.getContentItems not available, trying to load content manually');
        // You might need to implement this based on your actual API structure
        // For now, return empty array to avoid demo data
        response = [];
      }

      setListContent(response || []);
      setContentCount(response?.length || 0);
    } catch (error) {
      console.error('Error loading list content:', error);
      setListContent([]);
      setContentCount(0);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTotalCount = () => {
    // Return total count of all items in the list
    return listContent.length;
  };

  const getSelectedCount = () => {
    // Count how many items from this list are currently selected
    return listContent.filter(item => {
      const isSelected = selectedContent.some(selected =>
        selected.id === item.id && selected.type === item.type
      );
      const isExcluded = excludedContent.some(excluded =>
        excluded.id === item.id && excluded.type === item.type
      );
      return isSelected && !isExcluded;
    }).length;
  };

  const getContentCountsByType = () => {
    const counts = {};
    // Count all items in the list by type
    listContent.forEach(item => {
      if (!counts[item.type]) {
        counts[item.type] = { total: 0, selected: 0 };
      }
      counts[item.type].total += 1;

      const isSelected = selectedContent.some(selected =>
        selected.id === item.id && selected.type === item.type
      );
      const isExcluded = excludedContent.some(excluded =>
        excluded.id === item.id && excluded.type === item.type
      );
      if (isSelected && !isExcluded) {
        counts[item.type].selected += 1;
      }
    });
    return counts;
  };

  const getDisplayName = (item, type) => {
    switch (type) {
      case 'Word':
        return item.vocalized || item.word || 'מילה ללא שם';
      case 'WordEN':
        return item.word || 'מילה ללא שם';
      case 'QA':
        const question = item.question_text || 'שאלה ללא טקסט';
        const correctAnswers = item.correct_answers && Array.isArray(item.correct_answers) && item.correct_answers.length > 0
          ? item.correct_answers.map(ans => ans.answer_text || ans).join(', ')
          : '';
        return correctAnswers ? `${question} (תשובה: ${correctAnswers})` : question;
      case 'Image':
        return item.description || 'תמונה ללא תיאור';
      case 'ContentList':
        const listName = item.name || item.title || 'רשימה ללא שם';
        return item.description ? `${listName} - ${item.description}` : listName;
      default:
        return item.name || item.title || 'פריט ללא שם';
    }
  };

  const isContentSelected = (item) => {
    return selectedContent.some(selected =>
      selected.id === item.id && selected.type === item.type
    );
  };

  const isContentExcluded = (item) => {
    return excludedContent.some(excluded =>
      excluded.id === item.id && excluded.type === item.type
    );
  };

  return (
    <div className="border rounded-lg p-3">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <List className="w-4 h-4" />
          <span className="font-medium">{contentList.name}</span>
          <div className="flex gap-1 flex-wrap">
            <Badge variant="outline">
              {getSelectedCount()}/{getFilteredTotalCount()} נבחרו
            </Badge>
            {Object.entries(getContentCountsByType()).map(([type, counts]) => {
              const config = CONTENT_TYPES[type];
              const Icon = config?.icon || Settings;
              return (
                <Badge
                  key={type}
                  variant="secondary"
                  className="text-xs flex items-center gap-1"
                >
                  <Icon className="w-3 h-3" />
                  {counts.selected}/{counts.total}
                </Badge>
              );
            })}
          </div>
        </div>
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
          {listContent.map(item => {
            const config = CONTENT_TYPES[item.type];
            const Icon = config?.icon || List;
            const selected = isContentSelected(item);
            const excluded = isContentExcluded(item);

            return (
              <div
                key={`${item.type}-${item.id}`}
                className={`flex items-start gap-2 p-3 rounded border transition-colors ${
                  selected ? 'bg-blue-50 border-blue-200' :
                  excluded ? 'bg-red-50 border-red-200' :
                  'hover:bg-gray-50'
                }`}
              >
                {/* Show image thumbnail for Image content in lists */}
                {item.type === 'Image' && item.file_url ? (
                  <div className="w-8 h-8 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={item.file_url}
                      alt={item.description || 'תמונה'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="w-full h-full hidden items-center justify-center bg-gray-200">
                      <Icon className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ) : (
                  <Icon className={`w-4 h-4 text-${config?.color || 'gray'}-600 mt-0.5 flex-shrink-0`} />
                )}

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{getDisplayName(item, item.type)}</div>

                  {/* Enhanced QA display in lists */}
                  {item.type === 'QA' && (
                    <div className="mt-1 space-y-1">
                      {/* Correct answers */}
                      {item.correct_answers && Array.isArray(item.correct_answers) && item.correct_answers.length > 0 && (
                        <div className="text-xs">
                          <span className="text-green-600 font-medium">✓ </span>
                          <span className="text-gray-600">
                            {item.correct_answers
                              .slice(0, 3)
                              .map(ans => ans.answer_text || ans)
                              .join(', ') + (item.correct_answers.length > 3 ? '...' : '')}
                          </span>
                        </div>
                      )}

                      {/* Wrong answers */}
                      {item.incorrect_answers && Array.isArray(item.incorrect_answers) && item.incorrect_answers.length > 0 && (
                        <div className="text-xs">
                          <span className="text-red-600 font-medium">✗ </span>
                          <span className="text-gray-600">
                            {item.incorrect_answers.slice(0, 2).join(', ') + (item.incorrect_answers.length > 2 ? '...' : '')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show description for images */}
                  {item.type === 'Image' && item.description && (
                    <div className="text-xs text-gray-500 mt-1 truncate">{item.description}</div>
                  )}

                  {/* Show context for words */}
                  {item.type === 'Word' && item.context && (
                    <div className="text-xs text-gray-500 mt-1 truncate">{item.context}</div>
                  )}

                  {/* Show tags for words and images */}
                  {(item.type === 'Word' || item.type === 'Image') && item.tags && (
                    <div className="text-xs text-blue-500 mt-1 truncate">תגיות: {item.tags}</div>
                  )}
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  {!selected && !excluded && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onContentSelect({ ...item, fromList: contentList.id })}
                      className="text-xs px-2 py-1"
                    >
                      בחר
                    </Button>
                  )}
                  {selected && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onContentDeselect(item)}
                      className="text-xs px-2 py-1 text-red-600 hover:text-red-700"
                    >
                      בטל
                    </Button>
                  )}
                  {!excluded && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        console.log('🔴 הסתר button clicked for item:', {
                          itemId: item.id,
                          itemType: item.type,
                          contentListId: contentList?.id,
                          contentListName: contentList?.name
                        });
                        onContentDeselect({
                          ...item,
                          sourceList: contentList ? {
                            id: contentList.id,
                            name: contentList.name || contentList.title || 'רשימה ללא שם'
                          } : undefined
                        }, true);
                      }}
                      className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                      title="הסתר פריט זה - הוא לא ייכלל במשחק גם אם הוא חלק מרשימה נבחרת"
                    >
                      הסתר
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContentSelector({
  contentTypes,
  onContentSelect,
  selectedContent,
  excludedContent = [],
  gameType = null,
  selectedContentTypes = [],
  onContentTypesChange
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Content types are managed by parent component now
  const availableContentTypes = contentTypes;

  // Get game config for exclusive rules display
  const gameConfig = gameType ? getGameTypeConfig(gameType) : null;

  // Auto-search effect with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim() && selectedContentTypes.length > 0) {
        loadContent();
      } else if (!searchTerm.trim()) {
        setContent([]);
        setHasSearched(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedContentTypes]);

  const handleContentTypeToggle = (contentType) => {
    const isSelected = selectedContentTypes.includes(contentType);

    // Check for exclusive content type rules
    const gameConfig = gameType ? getGameTypeConfig(gameType) : null;
    const exclusiveRules = gameConfig?.exclusiveContentTypes;

    if (isSelected) {
      // Deselecting - ensure at least one remains
      const newSelection = selectedContentTypes.filter(type => type !== contentType);
      if (newSelection.length > 0) {
        onContentTypesChange(newSelection);
      }
    } else {
      // Selecting - check for exclusive rules
      if (exclusiveRules?.groups) {
        // Find which exclusive group this content type belongs to
        const exclusiveGroup = exclusiveRules.groups.find(group =>
          group.includes(contentType)
        );

        if (exclusiveGroup) {
          // Remove all other types from the same exclusive group
          const filtered = selectedContentTypes.filter(type =>
            !exclusiveGroup.includes(type) || type === contentType
          );
          onContentTypesChange([...filtered, contentType]);
          return;
        }
      }

      // No exclusive rules or not in an exclusive group - add normally
      onContentTypesChange([...selectedContentTypes, contentType]);
    }
  };

  const handleSelectAll = () => {
    onContentTypesChange([...availableContentTypes]);
  };

  const handleDeselectAll = () => {
    // Keep at least one selected
    onContentTypesChange([availableContentTypes[0]]);
  };


  const loadContent = async () => {
    if (!searchTerm.trim() || selectedContentTypes.length === 0) {
      setContent([]);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const allResults = [];

      // Search across all selected content types
      for (const contentType of selectedContentTypes) {
        const entityService = CONTENT_TYPES[contentType].entity;
        const data = await entityService.list({ search: searchTerm, limit: 20 });

        // Add type information to each item
        const typedData = data.map(item => ({ ...item, type: contentType }));
        allResults.push(...typedData);
      }

      // Filter out already selected and excluded content
      const filtered = allResults.filter(item => {
        const isSelected = selectedContent.some(selected =>
          selected.type === item.type && selected.id === item.id
        );
        const isExcluded = excludedContent.some(excluded =>
          excluded.type === item.type && excluded.id === item.id
        );
        return !isSelected && !isExcluded;
      });

      setContent(filtered);
    } catch (error) {
      console.error('Error loading content:', error);
      setContent([]);
    } finally {
      setLoading(false);
    }
  };


  const getDisplayName = (item, type) => {
    switch (type) {
      case 'Word':
        return item.vocalized || item.word || 'מילה ללא שם';
      case 'WordEN':
        return item.word || 'מילה ללא שם';
      case 'QA':
        const question = item.question_text || 'שאלה ללא טקסט';
        const correctAnswers = item.correct_answers && Array.isArray(item.correct_answers) && item.correct_answers.length > 0
          ? item.correct_answers.map(ans => ans.answer_text || ans).join(', ')
          : '';
        return correctAnswers ? `${question} (תשובה: ${correctAnswers})` : question;
      case 'Image':
        return item.description || 'תמונה ללא תיאור';
      case 'ContentList':
        const listName = item.name || item.title || 'רשימה ללא שם';
        return item.description ? `${listName} - ${item.description}` : listName;
      default:
        return item.name || item.title || 'פריט ללא שם';
    }
  };

  return (
    <div className="space-y-4">
      {/* Content Type Checkboxes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-medium">סוגי תוכן</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSelectAll}
              disabled={selectedContentTypes.length === availableContentTypes.length}
              className="text-xs"
            >
              בחר הכל
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDeselectAll}
              disabled={selectedContentTypes.length <= 1}
              className="text-xs"
            >
              בטל הכל
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {availableContentTypes.map(type => {
            const config = CONTENT_TYPES[type];
            const Icon = config.icon;
            const isSelected = selectedContentTypes.includes(type);

            // Check if this is part of an exclusive group
            const gameConfig = gameType ? getGameTypeConfig(gameType) : null;
            const exclusiveRules = gameConfig?.exclusiveContentTypes;
            const exclusiveGroup = exclusiveRules?.groups?.find(group => group.includes(type));
            const isInExclusiveGroup = !!exclusiveGroup;

            return (
              <label
                key={type}
                className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isInExclusiveGroup ? 'relative' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleContentTypeToggle(type)}
                  className="w-4 h-4 text-blue-600"
                />
                <Icon className={`w-4 h-4 text-${config.color}-600`} />
                <span className="text-sm font-medium">{config.name}</span>
                {isInExclusiveGroup && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full text-xs text-white flex items-center justify-center font-bold">
                    !
                  </div>
                )}
              </label>
            );
          })}
        </div>

        {/* Show explanation for exclusive content types */}
        {gameConfig?.exclusiveContentTypes?.groups && (
          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-800">
                <div className="font-medium">בחירה בלעדית</div>
                <div className="mt-1">
                  עבור משחק {gameConfig.singular}, ניתן לבחור רק אחד מסוגי התוכן הבאים בכל פעם:
                  {gameConfig.exclusiveContentTypes.groups.map((group, index) => (
                    <span key={index} className="font-medium">
                      {' '}{group.map(type => CONTENT_TYPES[type]?.name).join(' או ')}{index < gameConfig.exclusiveContentTypes.groups.length - 1 ? ',' : ''}
                    </span>
                  ))}
                  {gameConfig.exclusiveContentTypes.allowedWithAll && (
                    <span>. {gameConfig.exclusiveContentTypes.allowedWithAll.map(type => CONTENT_TYPES[type]?.name).join(' ו')} ניתן לבחור עם כל סוג תוכן.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedContentTypes.length === 0 && (
          <p className="text-sm text-red-600 mt-2">יש לבחור לפחות סוג תוכן אחד</p>
        )}
      </div>

      {/* Search Box */}
      <div>
        <Label className="text-base font-medium">חיפוש תוכן</Label>
        <div className="mt-2">
          <div className="relative">
            <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="התחל להקליד לחיפוש תוכן..."
              className="pr-10"
            />
            {loading && (
              <div className="absolute left-3 top-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
          {selectedContentTypes.length === 0 && (
            <p className="text-sm text-red-600 mt-2">יש לבחור לפחות סוג תוכן אחד</p>
          )}
        </div>
      </div>


      {/* Results */}
      {hasSearched && !loading && content.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-lg">לא נמצאו תוצאות</div>
          <div className="text-sm mt-1">נסה לשנות את מונח החיפוש או לבחור סוגי תוכן נוספים</div>
        </div>
      )}

      {!hasSearched && !loading && !searchTerm.trim() && (
        <div className="text-center py-8 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <div className="text-lg">התחל לחפש תוכן</div>
          <div className="text-sm mt-1">הכנס מונח חיפוש ותוצאות יופיעו אוטומטית</div>
        </div>
      )}

      {content.length > 0 && (
        <div className="space-y-1">
          <Label className="text-sm font-medium">תוצאות החיפוש ({content.length})</Label>
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
            {content.map(item => {
              const config = CONTENT_TYPES[item.type];
              const Icon = config.icon;

          return (
            <div
              key={item.id}
              onClick={() => onContentSelect(item)}
              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              {/* Show image thumbnail for Image content */}
              {item.type === 'Image' && item.file_url ? (
                <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={item.file_url}
                    alt={item.description || 'תמונה'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-full h-full hidden items-center justify-center bg-gray-200">
                    <Icon className="w-6 h-6 text-gray-400" />
                  </div>
                </div>
              ) : (
                <Icon className={`w-5 h-5 text-${config.color}-600 mt-1 flex-shrink-0`} />
              )}

              <div className="flex-1 min-w-0">
                <div className="font-medium line-clamp-2">{getDisplayName(item, item.type)}</div>

                {/* Enhanced QA display */}
                {item.type === 'QA' && (
                  <div className="mt-2 space-y-1">
                    {/* Correct answers */}
                    {item.correct_answers && Array.isArray(item.correct_answers) && item.correct_answers.length > 0 && (
                      <div className="text-sm">
                        <span className="text-green-600 font-medium">✓ תשובות נכונות: </span>
                        <span className="text-gray-700">
                          {item.correct_answers
                            .slice(0, 3)
                            .map(ans => ans.answer_text || ans)
                            .join(', ') + (item.correct_answers.length > 3 ? '...' : '')}
                        </span>
                      </div>
                    )}

                    {/* Wrong answers */}
                    {item.incorrect_answers && Array.isArray(item.incorrect_answers) && item.incorrect_answers.length > 0 && (
                      <div className="text-sm">
                        <span className="text-red-600 font-medium">✗ תשובות שגויות: </span>
                        <span className="text-gray-700">
                          {item.incorrect_answers.slice(0, 3).join(', ') + (item.incorrect_answers.length > 3 ? '...' : '')}
                        </span>
                      </div>
                    )}

                    {/* Explanation */}
                    {item.explanation && (
                      <div className="text-sm text-gray-500 line-clamp-2">הסבר: {item.explanation}</div>
                    )}
                  </div>
                )}

                {/* Show additional context for other content types */}
                {item.type === 'Word' && (
                  <div className="mt-1 space-y-1">
                    {item.context && (
                      <div className="text-sm text-gray-500 line-clamp-1">הקשר: {item.context}</div>
                    )}
                    {item.tags && (
                      <div className="text-sm text-blue-500 line-clamp-1">תגיות: {item.tags}</div>
                    )}
                    {item.difficulty && (
                      <div className="text-xs text-orange-500">רמה: {item.difficulty}</div>
                    )}
                  </div>
                )}

                {item.type === 'Image' && (
                  <div className="mt-1 space-y-1">
                    {item.description && (
                      <div className="text-sm text-gray-600 line-clamp-2">{item.description}</div>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {item.tags && (
                        <span className="text-blue-500">תגיות: {item.tags}</span>
                      )}
                      {item.dimensions && (
                        <span className="text-gray-400">{item.dimensions}</span>
                      )}
                    </div>
                  </div>
                )}

                {item.type === 'ContentList' && (
                  <div className="mt-1 space-y-1">
                    {item.description && (
                      <div className="text-sm text-gray-600 line-clamp-2">{item.description}</div>
                    )}
                    <ContentListPreview contentList={item} selectedContentTypes={selectedContentTypes} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
          </div>
        </div>
      )}
    </div>
  );
}

function AttributeFilter({ contentType, onAttributeChange, selectedAttributes = {} }) {
  const [availableAttributes, setAvailableAttributes] = useState([]);
  const [customAttributes, setCustomAttributes] = useState([]);

  useEffect(() => {
    loadAvailableAttributes();
  }, [contentType]);

  const loadAvailableAttributes = async () => {
    try {
      // Load all available attributes (attributes are general-purpose, not content-type specific)
      const attributes = await Attribute.list({
        limit: 100
      });

      // Group by type
      const grouped = attributes.reduce((acc, attr) => {
        if (!acc[attr.type]) {
          acc[attr.type] = [];
        }
        acc[attr.type].push(attr);
        return acc;
      }, {});

      setAvailableAttributes(grouped);
    } catch (error) {
      console.error('Error loading attributes:', error);
      setAvailableAttributes({});
    }
  };

  const addCustomAttribute = () => {
    setCustomAttributes([...customAttributes, { type: '', value: '', operator: 'equals' }]);
  };

  const updateCustomAttribute = (index, field, value) => {
    const updated = [...customAttributes];
    updated[index][field] = value;
    setCustomAttributes(updated);

    // Update parent component
    onAttributeChange({
      ...selectedAttributes,
      custom: updated.filter(attr => attr.type && attr.value)
    });
  };

  const removeCustomAttribute = (index) => {
    const updated = customAttributes.filter((_, i) => i !== index);
    setCustomAttributes(updated);

    onAttributeChange({
      ...selectedAttributes,
      custom: updated.filter(attr => attr.type && attr.value)
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">תכונות זמינות</Label>
        <div className="grid grid-cols-1 gap-3 mt-2">
          {Object.entries(availableAttributes).map(([type, values]) => (
            <div key={type} className="space-y-2">
              <Label className="text-xs text-gray-600">{type}</Label>
              <div className="flex flex-wrap gap-2">
                {values.map(attr => (
                  <Badge
                    key={attr.id}
                    variant={selectedAttributes[type]?.includes(attr.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const currentValues = selectedAttributes[type] || [];
                      const newValues = currentValues.includes(attr.value)
                        ? currentValues.filter(v => v !== attr.value)
                        : [...currentValues, attr.value];

                      onAttributeChange({
                        ...selectedAttributes,
                        [type]: newValues.length > 0 ? newValues : undefined
                      });
                    }}
                  >
                    {attr.value}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">תכונות מותאמות אישית</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addCustomAttribute}
          >
            <Plus className="w-4 h-4 mr-1" />
            הוסף תכונה
          </Button>
        </div>

        <div className="space-y-3 mt-2">
          {customAttributes.map((attr, index) => (
            <div key={index} className="grid grid-cols-3 gap-2 items-center">
              <Input
                placeholder="סוג תכונה"
                value={attr.type}
                onChange={(e) => updateCustomAttribute(index, 'type', e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="ערך"
                value={attr.value}
                onChange={(e) => updateCustomAttribute(index, 'value', e.target.value)}
                className="text-sm"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeCustomAttribute(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentUsageConfig({ gameType, usageConfig, onUsageChange }) {
  const gameConfig = gameType ? getGameTypeConfig(gameType) : null;

  if (!gameConfig) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <p className="text-sm text-gray-600">אין הגדרות שימוש זמינות עבור סוג משחק זה</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5" />
        <Label className="text-base font-medium">הגדרות שימוש בתוכן - {gameConfig.singular || gameConfig.name}</Label>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {gameConfig.modes && Object.entries(gameConfig.modes).map(([mode, description]) => (
          <div
            key={mode}
            onClick={() => onUsageChange({ ...usageConfig, mode })}
            className={`p-3 border rounded-lg cursor-pointer transition-all ${
              usageConfig?.mode === mode
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-sm">{description}</div>
          </div>
        ))}
      </div>

      {usageConfig?.mode && (
        <div className="space-y-3 mt-4">
          <Label className="text-sm font-medium">הגדרות נוספות</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">מינימום פריטים</Label>
              <Input
                type="number"
                min="1"
                value={usageConfig.minItems || 1}
                onChange={(e) => onUsageChange({
                  ...usageConfig,
                  minItems: parseInt(e.target.value) || 1
                })}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">מקסימום פריטים</Label>
              <Input
                type="number"
                min="1"
                value={usageConfig.maxItems || 10}
                onChange={(e) => onUsageChange({
                  ...usageConfig,
                  maxItems: parseInt(e.target.value) || 10
                })}
                className="text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContentStageConnector({
  stage,
  onStageContentChange,
  availableContentTypes = Object.keys(CONTENT_TYPES),
  gameType = null
}) {
  const [selectedContent, setSelectedContent] = useState(stage?.contentConnection?.content || []);
  const [excludedContent, setExcludedContent] = useState(stage?.contentConnection?.excluded || []);
  const [contentUsage, setContentUsage] = useState(stage?.contentConnection?.usage || {});
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedContentTypes, setSelectedContentTypes] = useState([]);

  // Filter content types based on game type
  const gameConfig = gameType ? getGameTypeConfig(gameType) : null;
  const filteredAvailableContentTypes = gameConfig && gameConfig.allowedContentTypes
    ? availableContentTypes.filter(type => gameConfig.allowedContentTypes.includes(type))
    : availableContentTypes;

  // Initialize selectedContentTypes with appropriate defaults based on game rules
  useEffect(() => {
    if (filteredAvailableContentTypes.length > 0 && selectedContentTypes.length === 0) {
      const exclusiveRules = gameConfig?.exclusiveContentTypes;
      if (exclusiveRules?.groups) {
        // For games with exclusive groups, select first from each group + all allowed
        const initialSelection = [];
        exclusiveRules.groups.forEach(group => {
          // Add first item from each exclusive group
          const firstAvailable = group.find(type => filteredAvailableContentTypes.includes(type));
          if (firstAvailable) {
            initialSelection.push(firstAvailable);
          }
        });
        // Add any types that are allowed with all (like ContentList)
        if (exclusiveRules.allowedWithAll) {
          exclusiveRules.allowedWithAll.forEach(type => {
            if (filteredAvailableContentTypes.includes(type) && !initialSelection.includes(type)) {
              initialSelection.push(type);
            }
          });
        }
        setSelectedContentTypes(initialSelection);
      } else {
        // Default behavior - select all available types
        setSelectedContentTypes(filteredAvailableContentTypes);
      }
    }
  }, [filteredAvailableContentTypes, gameType]);

  const handleItemSelect = async (item) => {
    printLog('handleItemSelect called with:', item);

    // Handle ContentList expansion with language filtering
    if (item.type === 'ContentList') {
      printLog('ContentList clicked, starting expansion...');
      printLog('ContentList item details:', {
        id: item.id,
        name: item.name,
        title: item.title,
        type: item.type,
        allProps: Object.keys(item)
      });

      // Prevent multiple simultaneous expansions of the same list
      if (item._expanding) {
        printLog('ContentList already expanding, skipping...');
        return;
      }

      // Mark as expanding
      item._expanding = true;
      try {
        let listContents = [];

        // Use the same robust loading logic as before
        try {
          printLog('Trying ContentList.getContentItems for ID:', item.id);
          if (ContentList.getContentItems) {
            listContents = await ContentList.getContentItems(item.id);
            printLog('ContentList.getContentItems returned:', listContents.length, 'items');
          } else {
            printLog('ContentList.getContentItems method not available');
          }
        } catch (directError) {
          printLog('Direct getContentItems failed, trying relationships:', directError.message);

          try {
            printLog('Trying ContentRelationship.find with source_type=ContentList, source_id=', item.id);

            // Add detailed debugging for the ContentRelationship API call
            printLog('ContentRelationship entity details:', {
              entityType: typeof ContentRelationship,
              hasFind: typeof ContentRelationship.find,
              basePath: ContentRelationship.basePath,
              entityName: ContentRelationship.constructor.name
            });

            // Test a simple find call first
            printLog('Testing ContentRelationship.find() without parameters...');
            const allRelationships = await ContentRelationship.find();
            printLog('All relationships count:', allRelationships.length);

            // Now try the specific query
            const relationships = await ContentRelationship.find({
              source_type: 'ContentList',
              source_id: item.id
            });
            printLog('Found', relationships.length, 'forward relationships');

            const contentPromises = relationships.map(async (rel) => {
              try {
                printLog('Processing forward relationship:', rel);
                const entityService = CONTENT_TYPES[rel.target_type]?.entity;
                if (entityService) {
                  printLog(`Loading ${rel.target_type} with ID ${rel.target_id}`);
                  const contentItem = await entityService.findById(rel.target_id);
                  printLog('Loaded content item:', contentItem);
                  if (contentItem) {
                    return { ...contentItem, type: rel.target_type };
                  } else {
                    printLog(`Content item ${rel.target_id} returned null/undefined`);
                    return null;
                  }
                } else {
                  printLog(`No entity service found for type: ${rel.target_type}`);
                  printLog(`Available CONTENT_TYPES:`, Object.keys(CONTENT_TYPES));
                  return null;
                }
              } catch (itemError) {
                printLog('Error loading item:', rel, itemError);
                return null;
              }
            });

            const contentItems = await Promise.all(contentPromises);
            printLog('Forward relationship content promises resolved:', contentItems);
            const validItems = contentItems.filter(contentItem => contentItem !== null);
            printLog('Valid forward relationship items after filtering nulls:', validItems);
            listContents = validItems;
          } catch (relationshipError) {
            printLog('Relationship method failed, trying reverse relationships:', relationshipError.message);

            try {
              printLog('Trying ContentRelationship.find with target_type=ContentList, target_id=', item.id);
              const reverseRelationships = await ContentRelationship.find({
                target_type: 'ContentList',
                target_id: item.id
              });
              printLog('Found', reverseRelationships.length, 'reverse relationships');

              const reverseContentPromises = reverseRelationships.map(async (rel) => {
                try {
                  printLog('Processing reverse relationship:', rel);
                  const entityService = CONTENT_TYPES[rel.source_type]?.entity;
                  if (entityService) {
                    printLog(`Loading ${rel.source_type} with ID ${rel.source_id}`);
                    const contentItem = await entityService.findById(rel.source_id);
                    printLog('Loaded reverse content item:', contentItem);
                    if (contentItem) {
                      return { ...contentItem, type: rel.source_type };
                    } else {
                      printLog(`Reverse content item ${rel.source_id} returned null/undefined`);
                      return null;
                    }
                  } else {
                    printLog(`No entity service found for source type: ${rel.source_type}`);
                    printLog(`Available CONTENT_TYPES:`, Object.keys(CONTENT_TYPES));
                    return null;
                  }
                } catch (itemError) {
                  printLog('Error loading reverse item:', rel, itemError);
                  return null;
                }
              });

              const reverseContentItems = await Promise.all(reverseContentPromises);
              printLog('Reverse relationship content promises resolved:', reverseContentItems);
              const validReverseItems = reverseContentItems.filter(contentItem => contentItem !== null);
              printLog('Valid reverse relationship items after filtering nulls:', validReverseItems);
              listContents = validReverseItems;
            } catch (reverseError) {
              printLog('All methods failed to load content list items:', reverseError);
              listContents = [];
            }
          }
        }

        printLog('Final listContents length:', listContents.length);
        printLog('Final listContents sample:', listContents.slice(0, 3));
        printLog('Available CONTENT_TYPES:', Object.keys(CONTENT_TYPES));

        // Filter items from the content list by selected content types
        const filteredItems = listContents.filter(contentItem => {
          const isTypeSelected = selectedContentTypes.includes(contentItem.type);
          if (!isTypeSelected) {
            printLog(`Filtering out ${contentItem.type} item: ${contentItem.title || contentItem.word || contentItem.id} (type not selected)`);
          }
          return isTypeSelected;
        });

        printLog(`ContentList ${item.name}: ${filteredItems.length}/${listContents.length} items match selected types`);
        printLog('Selected content types:', selectedContentTypes);
        printLog('All list content types:', [...new Set(listContents.map(item => item.type))]);
        printLog('Filtered items:', filteredItems);

        // Prepare all items with source information
        const itemsWithSource = filteredItems.map((contentItem, index) => {
          const itemWithSource = {
            ...contentItem,
            sourceList: {
              id: item.id,
              name: item.name || item.title || 'רשימה ללא שם'
            }
          };
          printLog(`Preparing item ${index + 1}/${filteredItems.length}:`, itemWithSource);
          return itemWithSource;
        });

        // Add all items in a single batch to avoid state race conditions
        printLog(`Adding all ${itemsWithSource.length} items to selection in batch...`);

        // Filter out items that are already selected (proper duplicate checking)
        const currentSelectedContent = selectedContent; // Get current state once
        const newItems = itemsWithSource.filter(newItem => {
          const isDuplicate = currentSelectedContent.some(existing =>
            existing.id === newItem.id && existing.type === newItem.type
          );
          if (isDuplicate) {
            printLog(`Skipping duplicate item ID: ${newItem.id}`);
          }
          return !isDuplicate;
        });

        printLog(`After duplicate filtering: ${newItems.length} items to add`);

        if (newItems.length > 0) {
          // Add all items in a single state update
          const updated = [...currentSelectedContent, ...newItems];
          setSelectedContent(updated);
          updateStageContent({ content: updated });
          printLog(`Batch update completed. New total count: ${updated.length}`);
        } else {
          printLog('No new items to add after duplicate filtering');
        }
      } catch (error) {
        printLog('Error expanding content list:', error);
        // Fallback: add the list itself
        handleContentSelect({ ...item, type: item.type });
      } finally {
        // Clear expanding flag
        delete item._expanding;
        printLog('ContentList expansion completed');
      }
    } else {
      // Regular content item
      handleContentSelect({ ...item, type: item.type });
    }
  };

  const handleContentSelect = (content) => {
    printLog('handleContentSelect called with ID:', content.id, 'Type:', content.type, 'Has sourceList:', !!content.sourceList);

    // Check if this exact item is already in selectedContent
    const existingItem = selectedContent.find(selected =>
      selected.id === content.id && selected.type === content.type
    );

    if (existingItem) {
      printLog('DUPLICATE DETECTED! Item already exists:', {
        newItem: { id: content.id, type: content.type, sourceList: content.sourceList?.name },
        existingItem: { id: existingItem.id, type: existingItem.type, sourceList: existingItem.sourceList?.name }
      });

      // For ContentList items, allow duplicates from different sources
      if (content.sourceList && existingItem.sourceList) {
        if (content.sourceList.id === existingItem.sourceList.id) {
          printLog('Blocking duplicate - same item from same ContentList');
          return;
        } else {
          printLog('Allowing duplicate - same item from different ContentList');
        }
      } else if (content.sourceList || existingItem.sourceList) {
        printLog('Allowing duplicate - one is from ContentList, one is manual');
      } else {
        printLog('Blocking duplicate - both are manual selections');
        return;
      }
    } else {
      printLog('No duplicate found, proceeding to add');
    }

    // Add the content item
    printLog('Adding content to selectedContent. Current count:', selectedContent.length);
    const updated = [...selectedContent, content];
    setSelectedContent(updated);
    updateStageContent({ content: updated });
    printLog('Updated selectedContent count:', updated.length);
  };

  const handleContentRemove = (contentToRemove) => {
    const updated = selectedContent.filter(content =>
      !(content.id === contentToRemove.id && content.type === contentToRemove.type)
    );
    setSelectedContent(updated);
    updateStageContent({ content: updated });
  };

  const handleContentDeselect = (content, exclude = false) => {
    console.log('🚫 handleContentDeselect called:', {
      contentId: content.id,
      contentType: content.type,
      exclude: exclude,
      hasSourceList: !!content.sourceList,
      sourceListName: content.sourceList?.name,
      currentExcludedCount: excludedContent.length
    });

    if (exclude) {
      console.log('🚫 Excluding content (adding to excluded, keeping in selected):', content);

      // Check if already excluded
      const alreadyExcluded = excludedContent.some(exc =>
        exc.id === content.id && exc.type === content.type
      );

      if (!alreadyExcluded) {
        const updatedExcluded = [...excludedContent, content];
        console.log('🚫 Updated excluded list:', updatedExcluded);
        setExcludedContent(updatedExcluded);
        updateStageContent({ excluded: updatedExcluded });
      } else {
        console.log('🚫 Item already excluded, skipping');
      }
    } else {
      console.log('🚫 Removing from selected content (not excluding)');
      handleContentRemove(content);
    }
  };

  const handleUsageChange = (usage) => {
    setContentUsage(usage);
    updateStageContent({ usage });
  };

  const handleExcludedRemove = (contentToRemove) => {
    console.log('🟢 Removing from excluded list:', {
      contentId: contentToRemove.id,
      contentType: contentToRemove.type,
      hasSourceList: !!contentToRemove.sourceList
    });

    // Remove from excluded list
    const updatedExcluded = excludedContent.filter(content =>
      !(content.id === contentToRemove.id && content.type === contentToRemove.type)
    );

    console.log('🟢 Updated excluded list:', updatedExcluded);
    setExcludedContent(updatedExcluded);
    updateStageContent({ excluded: updatedExcluded });

    // Item will automatically appear in included list again since it's still in selectedContent
    // but no longer in excludedContent (will be filtered properly by the display logic)
  };

  const handleListRemove = (sourceList) => {
    // Remove all content items from a specific source list
    const updated = selectedContent.filter(content =>
      !(content.sourceList && content.sourceList.id === sourceList.id)
    );
    setSelectedContent(updated);
    updateStageContent({ content: updated });
  };

  const updateStageContent = (updates) => {
    const newConnection = {
      type: 'manual', // Always manual now
      content: selectedContent,
      excluded: excludedContent,
      usage: contentUsage,
      ...updates
    };

    onStageContentChange(newConnection);
  };

  // Filter selected content to exclude items that are in the excluded list
  const getVisibleSelectedContent = () => {
    return selectedContent.filter(content => {
      const isExcluded = excludedContent.some(excluded =>
        excluded.id === content.id && excluded.type === content.type
      );
      return !isExcluded;
    });
  };

  const getContentDisplayName = (content) => {
    switch (content.type) {
      case 'Word':
        return content.vocalized || content.word || 'מילה ללא שם';
      case 'WordEN':
        return content.word || 'מילה ללא שם';
      case 'QA':
        const question = content.question_text || content.question || 'שאלה ללא טקסט';
        const answer = content.answer_text || content.answer || '';
        return answer ? `${question} (תשובה: ${answer})` : question;
      case 'Image':
        const imageName = content.name || content.title || 'תמונה ללא שם';
        return content.description ? `${imageName} - ${content.description}` : imageName;
      case 'ContentList':
        const listName = content.name || content.title || 'רשימה ללא שם';
        return content.description ? `${listName} - ${content.description}` : listName;
      default:
        return content.name || content.title || 'פריט ללא שם';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">חיבור תוכן לשלב</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Content Selection */}
          <div className="space-y-4">
            <ContentSelector
              contentTypes={filteredAvailableContentTypes}
              onContentSelect={handleItemSelect}
              selectedContent={selectedContent}
              excludedContent={excludedContent}
              gameType={gameType}
              selectedContentTypes={selectedContentTypes}
              onContentTypesChange={setSelectedContentTypes}
            />

            {/* Selected Content - Grouped by Type */}
            {getVisibleSelectedContent().length > 0 && (
              <div>
                <Label className="text-sm font-medium">תוכן נבחר ({getVisibleSelectedContent().length})</Label>

                {/* Dynamic Content Warning */}
                {selectedContent.some(content => content.sourceList) && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-amber-800">
                        <div className="font-medium">תוכן דינמי מרשימות</div>
                        <div className="mt-1">
                          התוכן המסומן ברשימות הוא דינמי - אם יתווספו או יוסרו פריטים מהרשימות,
                          התוכן במשחק יתעדכן בהתאם. ניתן לבטל בחירה של פריטים ספציפיים מהרשימות.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-3 space-y-4">
                  {Object.entries(groupContentByType(getVisibleSelectedContent())).map(([contentType, contentItems]) => {
                    const config = CONTENT_TYPES[contentType];
                    const Icon = config?.icon || Settings;

                    return (
                      <div key={contentType} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className="w-4 h-4 text-gray-600" />
                          <Label className="text-sm font-medium text-gray-900">
                            {config?.name || contentType} ({contentItems.length})
                          </Label>
                        </div>

                        <div className="space-y-2">
                          {/* Group content by source list */}
                          {Object.entries(groupContentBySource(contentItems)).map(([sourceKey, items]) => {
                            const isFromList = sourceKey !== 'manual';
                            const sourceList = isFromList ? items[0]?.sourceList : null;

                            return (
                              <div key={sourceKey}>
                                {isFromList && sourceList && (
                                  <div className="flex items-center gap-2 mb-2 p-2 bg-purple-50 border border-purple-200 rounded">
                                    <List className="w-3 h-3 text-purple-600" />
                                    <span className="text-xs font-medium text-purple-800">
                                      מרשימה: {sourceList.name}
                                    </span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-auto p-1 hover:bg-purple-200 text-purple-700 ml-auto"
                                      onClick={() => handleListRemove(sourceList)}
                                      title="הסר את כל התוכן מהרשימה"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                  {items.map((content, index) => (
                                    <ContentBadge
                                      key={`${content.type}-${content.id}-${index}`}
                                      content={content}
                                      onRemove={handleContentRemove}
                                      onExclude={handleContentDeselect}
                                      isFromList={isFromList}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Content Usage Configuration */}
          {gameType && getVisibleSelectedContent().length > 0 && (
            <ContentUsageConfig
              gameType={gameType}
              usageConfig={contentUsage}
              onUsageChange={handleUsageChange}
            />
          )}

          {/* Excluded Content Display - Always Visible */}
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <Label className="text-base font-medium text-red-700">
                תוכן מוחרג מהשלב ({excludedContent.length})
              </Label>
            </div>

            {excludedContent.length === 0 ? (
              <div className="text-sm text-red-600 bg-red-100 border border-red-200 rounded p-3">
                <div className="font-medium">אין תוכן מוחרג כרגע</div>
                <div className="mt-1 text-xs">
                  כאשר תבחר "הסתר" על פריט מרשימת תוכן, הוא יופיע כאן ולא ייכלל במשחק גם אם הוא חלק מרשימה נבחרת.
                </div>
              </div>
            ) : (
              <>
                <div className="text-sm text-red-600 mb-3 bg-red-100 border border-red-200 rounded p-2">
                  הפריטים הבאים לא ייכללו במשחק, גם אם הם חלק מרשימות תוכן נבחרות:
                </div>
                <div className="flex flex-wrap gap-2">
                  {excludedContent.map((content, index) => {
                    const config = CONTENT_TYPES[content.type];
                    const Icon = config.icon;

                    return (
                      <Badge
                        key={`excluded-${content.type}-${content.id}-${index}`}
                        variant="outline"
                        className="flex items-center gap-2 px-3 py-2 border-red-300 bg-red-100 text-red-700 hover:bg-red-200"
                        title={content.sourceList ? `הוחרג מרשימה: ${content.sourceList.name}` : 'הוחרג ידנית'}
                      >
                        <Icon className="w-3 h-3" />
                        <span className="text-sm">{getContentDisplayName(content)}</span>
                        {content.sourceList && (
                          <span className="text-xs opacity-70 bg-red-200 px-1 rounded">
                            מ: {content.sourceList.name}
                          </span>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-auto p-0 ml-1 hover:bg-red-300 text-red-600"
                          onClick={() => handleExcludedRemove(content)}
                          title="בטל החרגה - הפריט יחזור להיכלל במשחק"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}