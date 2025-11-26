/**
 * ContentCreator - Modal for creating new EduContent
 *
 * Supports both text content and file uploads with progress tracking
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, Plus, AlertTriangle } from 'lucide-react';
import { EduContent } from '@/services/apiClient';
import { showSuccess, showError } from '@/utils/messaging';
import { fixHebrewFilename, getFilenameWithoutExtension } from '@/utils/fileEncodingUtils';

const ContentCreator = ({
  isOpen,
  onClose,
  onCreate,
  defaultElementType = 'data'
}) => {
  const [formData, setFormData] = useState({
    element_type: defaultElementType,
    content: '',
    content_metadata: {}
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const requiresFile = formData.element_type !== 'data';

  const handleClose = () => {
    if (!isCreating) {
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setFormData({
      element_type: defaultElementType,
      content: '',
      content_metadata: {}
    });
    setSelectedFile(null);
    setUploadProgress(0);
    setError('');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (formData.element_type === 'playing_card_complete' || formData.element_type === 'playing_card_bg') {
        if (!file.type.startsWith('image/')) {
          setError('יש לבחור קובץ תמונה בלבד');
          return;
        }
      }

      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        setError('גודל הקובץ חייב להיות פחות מ-50MB');
        return;
      }

      setSelectedFile(file);
      setError('');

      // Auto-set content to filename if empty (with Hebrew encoding fix)
      if (!formData.content) {
        const fixedFilename = fixHebrewFilename(file.name);
        const filenameWithoutExt = getFilenameWithoutExtension(fixedFilename);
        setFormData(prev => ({
          ...prev,
          content: filenameWithoutExt
        }));
      }
    }
  };

  const validateForm = () => {
    if (!formData.content.trim()) {
      setError('שם התוכן הוא שדה חובה');
      return false;
    }

    if (requiresFile && !selectedFile) {
      setError(`נדרש לבחור קובץ עבור ${getElementTypeLabel(formData.element_type)}`);
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    setError('');
    setUploadProgress(0);

    try {
      let createdContent;

      if (requiresFile && selectedFile) {
        // Create content with file upload
        const formDataPayload = new FormData();
        formDataPayload.append('file', selectedFile);
        formDataPayload.append('element_type', formData.element_type);
        formDataPayload.append('content', formData.content);
        formDataPayload.append('content_metadata', JSON.stringify(formData.content_metadata));

        createdContent = await EduContent.upload(formDataPayload, (progress) => {
          setUploadProgress(progress);
        });
      } else {
        // Create text-only content
        createdContent = await EduContent.create(formData);
      }

      showSuccess('נוצר בהצלחה', `תוכן חדש נוצר: ${formData.content}`);

      if (onCreate) {
        onCreate(createdContent);
      }

      resetForm();
      onClose();

    } catch (error) {
      console.error('Error creating content:', error);
      setError(error.message || 'שגיאה ביצירת התוכן');
      showError('שגיאה', error.message || 'לא הצלחנו ליצור את התוכן');
    } finally {
      setIsCreating(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            יצירת תוכן חדש
          </DialogTitle>
          <DialogDescription>
            צור תוכן חדש למשחק הזיכרון
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Element Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="element_type">סוג תוכן</Label>
            <Select
              value={formData.element_type}
              onValueChange={(value) => {
                handleInputChange('element_type', value);
                setSelectedFile(null); // Reset file when type changes
              }}
              disabled={isCreating}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג תוכן" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="data">טקסט</SelectItem>
                <SelectItem value="playing_card_complete">תמונה מלאה</SelectItem>
                <SelectItem value="playing_card_bg">רקע קלף</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Name */}
          <div className="space-y-2">
            <Label htmlFor="content">שם התוכן</Label>
            <Input
              id="content"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="הכנס שם לתוכן"
              disabled={isCreating}
            />
          </div>

          {/* File Upload (for image types) */}
          {requiresFile && (
            <div className="space-y-2">
              <Label htmlFor="file">קובץ תמונה</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  id="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={isCreating}
                  className="hidden"
                />
                <label
                  htmlFor="file"
                  className="cursor-pointer flex flex-col items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  <Upload className="w-8 h-8" />
                  {selectedFile ? (
                    <>
                      <span className="font-medium">{fixHebrewFilename(selectedFile.name)}</span>
                      <span className="text-xs">
                        ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </>
                  ) : (
                    <>
                      <span>לחץ לבחירת קובץ תמונה</span>
                      <span className="text-xs">תומך ב-JPG, PNG, SVG (עד 50MB)</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isCreating && requiresFile && uploadProgress > 0 && (
            <div className="space-y-2">
              <Label>מעלה קובץ...</Label>
              <Progress value={uploadProgress} className="w-full" />
              <div className="text-sm text-gray-600 text-center">
                {uploadProgress}%
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={isCreating}
          >
            ביטול
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || (!formData.content.trim())}
            className="min-w-24"
          >
            {isCreating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                יוצר...
              </div>
            ) : (
              'צור תוכן'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

export default ContentCreator;