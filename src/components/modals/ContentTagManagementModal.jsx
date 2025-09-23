import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tags, X, Plus } from 'lucide-react';
import { GameContentTag, ContentTag } from '@/services/entities';

export default function ContentTagManagementModal({ 
  isOpen, 
  onClose, 
  content, 
  contentType, 
  onTagsUpdated, 
  getEntityDisplayName, 
  getEntityIcon 
}) {
  const [allTags, setAllTags] = useState([]);
  const [contentTags, setContentTags] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Load tags and content tags
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load all available tags
      const tags = await GameContentTag.list('-created_date').catch(() => []);
      setAllTags(tags);

      // Load current content tags
      const currentContentTagsRelations = await ContentTag.filter({
        content_id: content.id,
        content_type: contentType
      }).catch(() => []);

      const tagIds = currentContentTagsRelations.map(ct => ct.tag_id);
      const currentTags = tags.filter(tag => tagIds.includes(tag.id));
      setContentTags(currentTags);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
    setIsLoading(false);
  }, [content.id, contentType]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Add tag to content
  const handleAddTag = async (tag) => {
    try {
      // Check if tag is already assigned
      const existing = contentTags.find(ct => ct.id === tag.id);
      if (existing) return;

      // Create ContentTag relationship
      await ContentTag.create({
        content_id: content.id,
        content_type: contentType,
        tag_id: tag.id
      });

      // Update local state
      setContentTags(prev => [...prev, tag]);
      if (onTagsUpdated) {
        onTagsUpdated();
      }
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  // Remove tag from content
  const handleRemoveTag = async (tag) => {
    try {
      // Find and delete ContentTag relationship
      const contentTagRelations = await ContentTag.filter({
        content_id: content.id,
        content_type: contentType,
        tag_id: tag.id
      }).catch(() => []);

      for (const relation of contentTagRelations) {
        await ContentTag.delete(relation.id);
      }

      // Update local state
      setContentTags(prev => prev.filter(ct => ct.id !== tag.id));
      if (onTagsUpdated) {
        onTagsUpdated();
      }
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  };

  // Create new tag
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setIsCreatingTag(true);
    try {
      const newTag = await GameContentTag.create({ name: newTagName.trim() });
      setAllTags(prev => [newTag, ...prev]);
      setNewTagName('');

      // Automatically add to content
      await handleAddTag(newTag);
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('שגיאה ביצירת התגית');
    }
    setIsCreatingTag(false);
  };

  // Filter available tags (exclude already assigned ones)
  const availableTags = allTags.filter(tag =>
    !contentTags.find(ct => ct.id === tag.id) &&
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  const displayName = getEntityDisplayName ? getEntityDisplayName(content, contentType) : content.name || content.title || 'תוכן';
  const IconComponent = getEntityIcon ? getEntityIcon(contentType) : Tags;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 md:p-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Tags className="w-6 h-6" />
              <div>
                <h2 className="text-lg md:text-xl font-bold">ניהול תגיות</h2>
                <p className="text-green-100 text-sm">
                  <span className="font-medium">עבור: </span>
                  {displayName}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">טוען תגיות...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Tags */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">תגיות נוכחיות ({contentTags.length})</h3>
                {contentTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {contentTags.map(tag => (
                      <div key={tag.id} className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-full text-sm">
                        <span>#{tag.name}</span>
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">אין תגיות מוקצות</p>
                )}
              </div>

              {/* Add New Tag */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">צור והוסף תגית חדשה</h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="שם התגית החדשה..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim() || isCreatingTag}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    צור
                  </Button>
                </div>
              </div>

              {/* Available Tags */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">תגיות זמינות להוספה</h3>
                <div className="mb-3">
                  <Input
                    placeholder="חפש תגיות..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>

                {availableTags.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableTags.map(tag => (
                      <div
                        key={tag.id}
                        onClick={() => handleAddTag(tag)}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <span className="font-medium">#{tag.name}</span>
                        <Plus className="w-4 h-4 text-green-600" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    {searchTerm ? 'לא נמצאו תגיות התואמות לחיפוש' : 'כל התגיות כבר מוקצות או שאין תגיות במערכת'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t bg-gray-50 text-center flex-shrink-0">
          <Button onClick={onClose} className="bg-green-600 hover:bg-green-700 text-white">
            סגור
          </Button>
        </div>
      </div>
    </div>
  );
}