/**
 * ContentSelector - Component for selecting existing EduContent with create option
 *
 * Provides search, filtering, and selection of educational content items
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { EduContent } from '@/services/apiClient';
import ContentDisplay from './ContentDisplay';
import ContentCreator from './ContentCreator';

const ContentSelector = ({
  value = null,
  onChange,
  placeholder = "בחר תוכן",
  excludeIds = [],
  elementTypes = null, // Filter by specific element types
  label = "בחר תוכן"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedElementType, setSelectedElementType] = useState('all');
  const [contentItems, setContentItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedContent, setSelectedContent] = useState(value);
  const [showCreator, setShowCreator] = useState(false);

  const itemsPerPage = 12;

  // Load content when component mounts or filters change
  useEffect(() => {
    if (isOpen) {
      loadContent();
    }
  }, [isOpen, searchTerm, selectedElementType, currentPage]);

  // Update selected content when value prop changes
  useEffect(() => {
    setSelectedContent(value);
  }, [value]);

  const loadContent = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const params = {
        limit: itemsPerPage,
        offset: currentPage * itemsPerPage
      };

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      if (selectedElementType !== 'all') {
        params.element_type = selectedElementType;
      }

      // Apply element type filter if specified
      if (elementTypes && elementTypes.length > 0) {
        params.element_type = elementTypes[0]; // Use first allowed type if multiple
      }

      const response = await EduContent.find(params);

      // Filter out excluded content
      let filteredContent = response.data || [];
      if (excludeIds.length > 0) {
        filteredContent = filteredContent.filter(item => !excludeIds.includes(item.id));
      }

      setContentItems(filteredContent);
      setTotalPages(Math.ceil((response.pagination?.total || 0) / itemsPerPage));

    } catch (error) {
      console.error('Error loading content:', error);
      setError('שגיאה בטעינת התוכן');
      setContentItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedElementType, currentPage, excludeIds, elementTypes]);

  const handleContentSelect = (content) => {
    setSelectedContent(content);
    if (onChange) {
      onChange(content);
    }
    setIsOpen(false);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(0); // Reset to first page when searching
  };

  const handleElementTypeChange = (type) => {
    setSelectedElementType(type);
    setCurrentPage(0); // Reset to first page when filtering
  };

  const handleCreateNew = () => {
    setShowCreator(true);
  };

  const handleContentCreated = (newContent) => {
    setShowCreator(false);
    // Add new content to the list
    setContentItems(prev => [newContent, ...prev]);
    // Auto-select the new content
    handleContentSelect(newContent);
  };

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const clearSelection = () => {
    setSelectedContent(null);
    if (onChange) {
      onChange(null);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {/* Selected content preview or selection button */}
      <div className="space-y-2">
        {selectedContent ? (
          <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
            <ContentDisplay
              content={selectedContent}
              size="sm"
              className="flex-shrink-0"
            />
            <div className="flex-grow min-w-0">
              <div className="font-medium text-sm truncate">{selectedContent.content}</div>
              <div className="text-xs text-gray-500">
                {getElementTypeLabel(selectedContent.element_type)}
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                onClick={() => setIsOpen(true)}
                variant="outline"
                size="sm"
              >
                שנה
              </Button>
              <Button
                onClick={clearSelection}
                variant="outline"
                size="sm"
              >
                נקה
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setIsOpen(true)}
            variant="outline"
            className="w-full justify-start"
          >
            {placeholder}
          </Button>
        )}
      </div>

      {/* Selection dropdown (inline, not modal) */}
      {isOpen && (
        <div className="border border-gray-200 rounded-lg bg-white shadow-lg">
          {/* Header */}
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">בחירת תוכן</h4>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateNew}
                  variant="default"
                  size="sm"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  צור חדש
                </Button>
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="outline"
                  size="sm"
                >
                  ביטול
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <div className="flex-grow">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="חפש תוכן..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="pr-9"
                    size="sm"
                  />
                </div>
              </div>

              {!elementTypes && (
                <Select value={selectedElementType} onValueChange={handleElementTypeChange}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="סוג תוכן" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסוגים</SelectItem>
                    <SelectItem value="data">טקסט</SelectItem>
                    <SelectItem value="playing_card_complete">תמונה מלאה</SelectItem>
                    <SelectItem value="playing_card_bg">רקע קלף</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Content grid */}
          <div className="p-3 max-h-64 overflow-y-auto">
            {error && (
              <Alert variant="destructive" className="mb-3">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center h-20">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : contentItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-gray-400" />
                </div>
                <h4 className="font-medium text-gray-700 mb-2">לא נמצא תוכן מתאים</h4>
                <p className="text-gray-500 text-sm mb-3">נסה לחפש במילים אחרות או צור תוכן חדש</p>
                <Button
                  onClick={handleCreateNew}
                  variant="default"
                  size="sm"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  צור תוכן ראשון
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {contentItems.map(content => (
                  <div
                    key={content.id}
                    className="cursor-pointer border border-gray-200 rounded-lg p-2 hover:border-blue-300 hover:shadow-sm transition-all"
                    onClick={() => handleContentSelect(content)}
                  >
                    <ContentDisplay
                      content={content}
                      size="sm"
                      className="mb-1"
                    />
                    <div className="text-xs font-medium truncate mb-1">
                      {content.content}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getElementTypeLabel(content.element_type)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-xs text-gray-600">
                עמוד {currentPage + 1} מתוך {totalPages}
              </div>
              <div className="flex gap-1">
                <Button
                  onClick={prevPage}
                  disabled={currentPage === 0}
                  variant="outline"
                  size="sm"
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
                <Button
                  onClick={nextPage}
                  disabled={currentPage >= totalPages - 1}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Creator Modal */}
      <ContentCreator
        isOpen={showCreator}
        onClose={() => setShowCreator(false)}
        onCreate={handleContentCreated}
        defaultElementType={elementTypes?.[0] || 'data'}
      />
    </div>
  );
};

// Helper function
const getElementTypeLabel = (elementType) => {
  const labels = {
    'data': 'טקסט',
    'playing_card_complete': 'תמונה מלאה',
    'playing_card_bg': 'רקע קלף'
  };
  return labels[elementType] || elementType;
};

export default ContentSelector;