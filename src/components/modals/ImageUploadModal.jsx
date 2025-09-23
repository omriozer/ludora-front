import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Tags } from 'lucide-react';
import { Image as ImageEntity, GameContentTag, ContentTag } from '@/services/entities';
import ContentTagManagementModal from './ContentTagManagementModal';

export default function ImageUploadModal({ isOpen, onClose, onImageUploaded, editingImage = null }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [savedImageRecord, setSavedImageRecord] = useState(null);
  const [description, setDescription] = useState('');
  const [showTagManagement, setShowTagManagement] = useState(false);
  const [currentTags, setCurrentTags] = useState([]);

  // Load current tags for editing image
  const loadCurrentTags = async (imageId) => {
    try {
      const contentTagRelations = await ContentTag.filter({
        content_id: imageId,
        content_type: 'Image'
      }).catch(() => []);

      if (contentTagRelations.length > 0) {
        const allTags = await GameContentTag.find().catch(() => []);
        const tagIds = contentTagRelations.map(ct => ct.tag_id);
        const imageTags = allTags.filter(tag => tagIds.includes(tag.id));
        setCurrentTags(imageTags);
      } else {
        setCurrentTags([]);
      }
    } catch (error) {
      console.error('Error loading current tags:', error);
      setCurrentTags([]);
    }
  };

  // Initialize form with editing data
  useEffect(() => {
    if (editingImage) {
      setUploadedImage({
        url: editingImage.file_url,
        name: editingImage.description || 'קובץ קיים'
      });
      setDescription(editingImage.description || '');
      setSavedImageRecord(editingImage);
      loadCurrentTags(editingImage.id);
    } else {
      resetForm();
    }
  }, [editingImage, isOpen]);

  const handleFileUpload = async (file) => {
    try {
      setIsUploading(true);
      
      // Upload file to server
      const { UploadFile } = await import('@/services/integrations');
      const result = await UploadFile({ file });
      
      if (result && result.file_url) {
        setUploadedImage({
          url: result.file_url,
          name: file.name
        });
        setDescription(file.name.replace(/\.[^/.]+$/, "")); // Remove extension for description
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('שגיאה בהעלאת הקובץ. אנא נסה שנית.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    if (imageFile) {
      handleFileUpload(imageFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSave = async () => {
    if (!uploadedImage || !description.trim()) {
      alert('אנא העלה תמונה והזן תיאור');
      return;
    }

    try {
      setIsUploading(true);
      
      const imageData = {
        file_url: uploadedImage.url,
        description: description.trim(),
        added_by: 'current_user', // Should be actual user
        is_approved: true,
        source: 'manual'
      };

      let imageRecord;
      if (editingImage) {
        // Update existing image
        imageRecord = await ImageEntity.update(editingImage.id, imageData);
        imageRecord = { ...editingImage, ...imageData };
      } else {
        // Create new image
        imageRecord = await ImageEntity.create(imageData);
      }

      // Save the image record for tag management
      setSavedImageRecord(imageRecord);

      if (onImageUploaded) {
        onImageUploaded({
          id: imageRecord.id,
          url: uploadedImage.url,
          description: description.trim()
        });
      }

      // Show success message
      if (editingImage) {
        alert('התמונה עודכנה בהצלחה!');
      } else {
        alert('התמונה נשמרה בהצלחה!');
      }
    } catch (error) {
      console.error('Error saving image:', error);
      alert('שגיאה בשמירת התמונה. אנא נסה שנית.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setUploadedImage(null);
    setSavedImageRecord(null);
    setDescription('');
    setCurrentTags([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleOpenTagManagement = () => {
    const recordToUse = savedImageRecord || editingImage;
    if (!recordToUse) {
      alert('אנא שמור את התמונה קודם לפני ניהול התגיות');
      return;
    }
    setShowTagManagement(true);
  };

  const handleTagsUpdated = () => {
    const recordToUse = savedImageRecord || editingImage;
    if (recordToUse) {
      loadCurrentTags(recordToUse.id);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingImage ? 'עריכת תמונה' : 'העלאת תמונה חדשה'}
              </h3>
              <Button variant="ghost" onClick={handleClose} className="p-2">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* File Upload Area */}
            {!uploadedImage || editingImage ? (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {editingImage && uploadedImage ? (
                  <>
                    <img 
                      src={uploadedImage.url} 
                      alt="תמונה קיימת"
                      className="w-full max-w-xs mx-auto rounded-lg mb-4"
                    />
                    <p className="text-sm text-gray-600 mb-4">תמונה קיימת - גרור תמונה חדשה לכאן כדי להחליף</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">גרור תמונה לכאן או לחץ לבחירה</p>
                  </>
                )}
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                  id="image-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('image-upload').click()}
                  disabled={isUploading}
                  className="mx-auto"
                >
                  {isUploading ? 'מעלה...' : (editingImage ? 'החלף תמונה' : 'בחר תמונה')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Image Preview */}
                <Card>
                  <CardContent className="p-4">
                    <img 
                      src={uploadedImage.url} 
                      alt="תצוגה מקדימה"
                      className="w-full max-w-xs mx-auto rounded-lg"
                    />
                    <p className="text-sm text-gray-600 text-center mt-2">{uploadedImage.name}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Description Input */}
            {uploadedImage && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    תיאור התמונה *
                  </label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="הזן תיאור לתמונה..."
                    className="w-full"
                  />
                </div>

                {/* Current Tags Display */}
                {currentTags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      תגיות קיימות
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {currentTags.map(tag => (
                        <span key={tag.id} className="inline-flex items-center bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                          #{tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={handleOpenTagManagement}
                    variant="outline"
                    className="flex-1"
                    disabled={!savedImageRecord && !editingImage}
                  >
                    <Tags className="w-4 h-4 ml-2" />
                    נהל תגיות
                  </Button>
                  
                  <Button variant="outline" onClick={handleClose} className="flex-1">
                    ביטול
                  </Button>
                  
                  <Button 
                    onClick={handleSave} 
                    disabled={isUploading || !description.trim()}
                    className="flex-1"
                  >
                    {isUploading ? 'שומר...' : (editingImage ? 'עדכן תמונה' : 'שמור תמונה')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Tag Management Modal */}
      {showTagManagement && (savedImageRecord || editingImage) && (
        <ContentTagManagementModal
          isOpen={showTagManagement}
          onClose={() => setShowTagManagement(false)}
          content={savedImageRecord || editingImage}
          contentType="Image"
          onTagsUpdated={handleTagsUpdated}
          getEntityDisplayName={(entity, type) => entity.description || 'תמונה'}
          getEntityIcon={() => Upload}
        />
      )}
    </>
  );
}