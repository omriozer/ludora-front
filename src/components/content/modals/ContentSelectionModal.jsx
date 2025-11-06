import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, FileText, Upload, X, Image, Music, Video } from 'lucide-react';
import { getContentSchema } from '../schemas/contentMetadataSchemas';
import { GameContent } from '@/services/entities';
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import ContentCreateForm from './ContentCreateForm';

/**
 * ContentSelectionModal - Modal for searching and selecting content by semantic type
 */
const ContentSelectionModal = ({
  isOpen,
  onClose,
  semanticType,
  onContentSelected,
  currentSelection = null
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createWithValue, setCreateWithValue] = useState('');

  // Get schema for this semantic type
  const schema = getContentSchema(semanticType);

  // Determine if this is a file-based semantic type
  const isFileType = ['image', 'audio', 'video', 'complete_card'].includes(semanticType);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
      setShowCreateForm(false);
      setCreateWithValue('');
    }
  }, [isOpen]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      clog('🔍 Searching content:', { semanticType, query: searchQuery });

      // Search in the GameContent entity using the backend's search functionality
      const results = await GameContent.find({
        semantic_type: semanticType,
        search: searchQuery // Let the backend handle the field mapping and search logic
      });

      clog('🔍 Search results:', results);
      setSearchResults(results || []);

    } catch (error) {
      cerror('❌ Error searching content:', error);
      toast({
        title: 'שגיאה בחיפוש',
        description: 'לא ניתן לחפש תוכן כרגע. נסה שוב.',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Handle content selection
  const handleSelectContent = (content) => {
    clog('✅ Content selected:', content);
    onContentSelected(content);
  };

  // Handle new content creation success
  const handleContentCreated = (newContent) => {
    clog('✅ New content created:', newContent);

    // Add a small delay to ensure the toast is shown and the parent component
    // has time to properly process the selection before the modal closes
    setTimeout(() => {
      clog('🎯 Selecting newly created content:', newContent);
      onContentSelected(newContent);
    }, 100);
  };

  // Handle creating new content with search value
  const handleCreateWithSearch = () => {
    setCreateWithValue(searchQuery.trim());
    setShowCreateForm(true);
  };

  // Handle creating new content (for file upload or general create)
  const handleCreateNew = () => {
    setCreateWithValue('');
    setShowCreateForm(true);
  };

  // Handle going back to search from create form
  const handleBackToSearch = () => {
    setShowCreateForm(false);
    setCreateWithValue('');
  };

  // Handle Enter key in search
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Get appropriate icon for semantic type
  const getSemanticIcon = () => {
    switch (semanticType) {
      case 'image': return Image;
      case 'audio': return Music;
      case 'video': return Video;
      default: return FileText;
    }
  };

  if (!schema) {
    return null;
  }

  const SemanticIcon = getSemanticIcon();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-6xl max-h-[95vh] overflow-hidden bg-white border-0 shadow-2xl [&>button]:hidden"
        dir="rtl"
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-gradient-to-l from-blue-50 to-blue-100">
          <DialogTitle className="flex items-center gap-4 text-xl font-bold text-gray-900">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <SemanticIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 text-right">
              <h2 className="text-xl font-bold">בחירת {schema.label}</h2>
              <p className="text-sm font-normal text-gray-600 mt-1">
                {showCreateForm ? 'יצירת תוכן חדש' : 'חפש תוכן קיים או צור חדש'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {showCreateForm ? (
            /* Create Form View */
            <div className="h-full flex flex-col">
              <ContentCreateForm
                semanticType={semanticType}
                onContentCreated={handleContentCreated}
                onCancel={handleBackToSearch}
                initialValue={createWithValue}
              />
            </div>
          ) : (
            /* Search View */
            <div className="h-full flex flex-col p-6 space-y-6">
              {/* Search Input */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder={`חפש ${schema.label} קיים...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      className="pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <Button
                    onClick={handleSearch}
                    disabled={!searchQuery.trim() || isSearching}
                    className="h-12 px-6 bg-blue-600 hover:bg-blue-700"
                  >
                    {isSearching ? (
                      <LudoraLoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Search className="w-4 h-4 ml-2" />
                        חיפוש
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Always Show Upload Button for File Types */}
              {isFileType && (
                <div className="bg-gradient-to-l from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <Button
                    onClick={handleCreateNew}
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Upload className="w-5 h-5 ml-2" />
                    העלה {schema.label} חדש
                  </Button>
                </div>
              )}

              {/* Search Results */}
              <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <LudoraLoadingSpinner size="md" />
                          <p className="text-gray-600 mt-4">מחפש תוכן...</p>
                        </div>
                      </div>
                    ) : hasSearched ? (
                      searchResults.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">תוצאות חיפוש</h3>
                            <Badge variant="secondary">
                              {searchResults.length} תוצאות
                            </Badge>
                          </div>
                          {searchResults.map((content) => (
                            <ContentSearchResult
                              key={content.id}
                              content={content}
                              onSelect={handleSelectContent}
                              isSelected={currentSelection?.id === content.id}
                              semanticType={semanticType}
                            />
                          ))}
                        </div>
                      ) : (
                        /* No Results - Show Create Suggestion */
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <SemanticIcon className="w-8 h-8 text-gray-500" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">לא נמצאו תוצאות</h3>
                          <p className="text-gray-600 mb-4">
                            לא נמצא {schema.label} עבור "{searchQuery}"
                          </p>
                          {!isFileType && searchQuery.trim() && (
                            <Button
                              onClick={handleCreateWithSearch}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Plus className="w-4 h-4 ml-2" />
                              צור "{searchQuery}" חדש
                            </Button>
                          )}
                          {!searchQuery.trim() && (
                            <Button
                              onClick={handleCreateNew}
                              variant="outline"
                              className="border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                              <Plus className="w-4 h-4 ml-2" />
                              צור {schema.label} חדש
                            </Button>
                          )}
                        </div>
                      )
                    ) : (
                      /* Initial State */
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">חיפוש {schema.label}</h3>
                        <p className="text-gray-600 mb-4">הכנס מילות חיפוש למציאת תוכן קיים</p>
                        {!isFileType && (
                          <Button
                            onClick={handleCreateNew}
                            variant="outline"
                            className="border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            <Plus className="w-4 h-4 ml-2" />
                            או צור {schema.label} חדש
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Only show when not in create form mode */}
        {!showCreateForm && (
          <DialogFooter className="px-4 py-2 border-t border-gray-200 bg-gray-50">
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="h-8 px-4"
            >
              <X className="w-3 h-3 ml-1" />
              סגור
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

/**
 * ContentSearchResult - Individual search result item
 */
const ContentSearchResult = ({ content, onSelect, isSelected, semanticType }) => {
  const schema = getContentSchema(semanticType);

  const getDisplayValue = () => {
    // For image and complete_card content, show the filename or description instead of URL
    if (content.semantic_type === 'image') {
      if (content.metadata?.name) return content.metadata.name;
      if (content.metadata?.description) return content.metadata.description;
      return 'תמונה ללא שם';
    }

    if (content.semantic_type === 'complete_card') {
      if (content.metadata?.name) return content.metadata.name;
      if (content.metadata?.description) return content.metadata.description;
      return 'קלף שלם ללא שם';
    }

    if (content.value) return content.value;
    if (content.metadata?.name) return content.metadata.name;
    if (content.metadata?.description) {
      return content.metadata.description.length > 50
        ? `${content.metadata.description.substring(0, 50)}...`
        : content.metadata.description;
    }
    return 'תוכן ללא שם';
  };

  const getMetadataDisplay = () => {
    if (!content.metadata) return null;

    const metadataItems = [];
    Object.entries(content.metadata).forEach(([key, value]) => {
      if (value && key !== 'name' && key !== 'description') {
        metadataItems.push(`${key}: ${value}`);
      }
    });

    return metadataItems.slice(0, 3); // Show only first 3 metadata items
  };

  return (
    <div
      className={`
        p-4 border rounded-xl cursor-pointer transition-all duration-200
        ${isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
        }
      `}
      onClick={() => onSelect(content)}
    >
      <div className="flex items-start justify-between">
        {/* Image preview for image and complete_card content */}
        {(content.semantic_type === 'image' || content.semantic_type === 'complete_card') && content.value && (
          <div className="flex-shrink-0 ml-4 mb-2">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
              <img
                src={content.value}
                alt={getDisplayValue()}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs" style={{display: 'none'}}>
                IMG
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 truncate">
              {getDisplayValue()}
            </h4>
            {isSelected && (
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            )}
          </div>

          {content.metadata?.description && (
            <p className="text-gray-600 text-sm leading-relaxed mb-2">
              {content.metadata.description.length > 80
                ? `${content.metadata.description.substring(0, 80)}...`
                : content.metadata.description}
            </p>
          )}

          {/* Metadata display */}
          {getMetadataDisplay() && getMetadataDisplay().length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {getMetadataDisplay().slice(0, 2).map((item, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs bg-gray-50 border-gray-300 text-gray-600"
                >
                  {item}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Badge
          variant="secondary"
          className="text-xs flex-shrink-0 mr-2 bg-blue-100 text-blue-700"
        >
          {schema.label}
        </Badge>
      </div>
    </div>
  );
};

export default ContentSelectionModal;