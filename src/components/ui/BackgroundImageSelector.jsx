import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  Image as ImageIcon,
  Plus,
  X,
  Check,
  AlertCircle,
  Grid3X3,
  Palette
} from 'lucide-react';
import { GameContent } from '@/services/entities';
import { apiUploadWithProgress } from '@/services/apiClient';
import { getApiBase } from '@/utils/api';
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';

/**
 * BackgroundImageSelector - Reusable component for selecting background images
 * Supports uploading new images and selecting from existing game_card_bg images
 *
 * @param {Array} selectedImages - Array of selected image content objects
 * @param {function} onImagesSelected - Callback when images selection changes: (images) => void
 * @param {number} minSelection - Minimum number of images to select (default: 1)
 * @param {number} maxSelection - Maximum number of images to select (default: 10)
 * @param {boolean} disabled - Whether the selector is disabled
 * @param {string} className - Additional CSS classes
 * @param {string} variant - Button variant: 'outline' | 'default' | 'ghost'
 * @param {string} size - Button size: 'sm' | 'md' | 'lg'
 */
const BackgroundImageSelector = ({
  selectedImages = [],
  onImagesSelected,
  minSelection = 1,
  maxSelection = 10,
  disabled = false,
  className = '',
  variant = 'outline',
  size = 'md'
}) => {
  // Helper function to construct absolute image URLs
  const getImageUrl = (imageValue) => {
    if (!imageValue) {
      clog('🚨 getImageUrl: Empty imageValue');
      return '';
    }

    clog('🔍 getImageUrl input:', imageValue);

    // If it's already an absolute URL, return as-is
    if (imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
      clog('✅ getImageUrl: Already absolute URL:', imageValue);
      return imageValue;
    }

    // If it starts with /api/, prepend the API base URL (removing /api from base)
    if (imageValue.startsWith('/api/')) {
      const apiBase = getApiBase();
      clog('🔍 getImageUrl: API base from getApiBase():', apiBase);
      // Remove /api from the end of apiBase since imageValue already includes /api/
      const baseWithoutApi = apiBase.replace(/\/api$/, '');
      const finalUrl = `${baseWithoutApi}${imageValue}`;
      clog('✅ getImageUrl: Constructed absolute URL:', finalUrl);
      return finalUrl;
    }

    // Otherwise, treat as a relative path and prepend full API base
    const finalUrl = `${getApiBase()}${imageValue.startsWith('/') ? '' : '/'}${imageValue}`;
    clog('✅ getImageUrl: Constructed full API URL:', finalUrl);
    return finalUrl;
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableImages, setAvailableImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load available background images
  const loadBackgroundImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const images = await GameContent.find({
        semantic_type: 'game_card_bg',
        data_type: 'image_url'
      });
      // Filter out any images without valid IDs
      const validImages = (images || []).filter(img => img && img.id);
      setAvailableImages(validImages);
      clog('📸 Loaded background images:', validImages);

      // Debug: Log each image's value field
      validImages.forEach((img, index) => {
        clog(`🖼️ Image ${index}: id=${img.id}, value="${img.value}"`);
      });
    } catch (error) {
      cerror('Error loading background images:', error);
      toast({
        title: "שגיאה בטעינת תמונות רקע",
        description: "לא ניתן לטעון את תמונות הרקע הקיימות",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle opening modal and loading images
  const handleOpenModal = () => {
    if (!disabled) {
      setIsModalOpen(true);
      loadBackgroundImages();
    }
  };

  // Handle closing modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "סוג קובץ לא נתמך",
        description: "אנא בחר קובץ תמונה בפורמט JPG, PNG או GIF",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "קובץ גדול מדי",
        description: "גודל הקובץ חייב להיות עד 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create form data for upload
      const atomicFormData = new FormData();
      atomicFormData.append('file', file);
      atomicFormData.append('semantic_type', 'game_card_bg');
      atomicFormData.append('data_type', 'image_url');
      atomicFormData.append('metadata', JSON.stringify({
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        description: `תמונת רקע - ${file.name}`,
        theme: 'abstract',
        color_scheme: 'colorful'
      }));

      // Upload file with progress tracking using the correct endpoint
      const response = await apiUploadWithProgress(
        '/entities/gamecontent/upload',
        atomicFormData,
        (progress) => {
          setUploadProgress(progress);
          clog(`📊 Background image upload progress: ${progress}%`);
        }
      );

      clog('📸 Uploaded background image:', response);

      // Add to available images (ensure it has a valid ID)
      if (response && response.gamecontent && response.gamecontent.id) {
        setAvailableImages(prev => [response.gamecontent, ...prev]);
      } else {
        cerror('Invalid upload response - missing ID:', response);
      }

      toast({
        title: "תמונה הועלתה בהצלחה",
        description: "תמונת הרקע נוספה לאוסף",
        variant: "default"
      });

      // Clear file input
      event.target.value = '';

    } catch (error) {
      cerror('Error uploading background image:', error);
      toast({
        title: "שגיאה בהעלאת תמונה",
        description: "לא ניתן להעלות את התמונה כרגע. נסה שוב.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle image selection toggle
  const handleImageToggle = (image) => {
    const isCurrentlySelected = selectedImages.some(img => img.id === image.id);

    if (isCurrentlySelected) {
      // Remove from selection
      const newSelection = selectedImages.filter(img => img.id !== image.id);

      // Check minimum constraint
      if (newSelection.length < minSelection) {
        toast({
          title: "בחירה מינימלית נדרשת",
          description: `חובה לבחור לפחות ${minSelection} תמונות רקע`,
          variant: "destructive"
        });
        return;
      }

      onImagesSelected?.(newSelection);
    } else {
      // Add to selection
      if (selectedImages.length >= maxSelection) {
        toast({
          title: "הגעת למקסימום הבחירות",
          description: `ניתן לבחור עד ${maxSelection} תמונות רקע`,
          variant: "destructive"
        });
        return;
      }

      const newSelection = [...selectedImages, image];
      onImagesSelected?.(newSelection);
    }
  };

  // Clear all selections
  const handleClearAll = () => {
    if (minSelection > 0) {
      toast({
        title: "לא ניתן לנקות הכל",
        description: `חובה לבחור לפחות ${minSelection} תמונות רקע`,
        variant: "destructive"
      });
      return;
    }
    onImagesSelected?.([]);
  };

  // Remove specific image from selection
  const handleRemoveImage = (imageId, event) => {
    event.stopPropagation();
    const newSelection = selectedImages.filter(img => img.id !== imageId);

    if (newSelection.length < minSelection) {
      toast({
        title: "בחירה מינימלית נדרשת",
        description: `חובה לבחור לפחות ${minSelection} תמונות רקע`,
        variant: "destructive"
      });
      return;
    }

    onImagesSelected?.(newSelection);
  };

  // Generate button label
  const getButtonLabel = () => {
    if (selectedImages.length > 0) {
      return `נבחרו ${selectedImages.length} תמונות רקע`;
    }
    return 'בחירת תמונות רקע לקלפים';
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Main Selection Button */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant={selectedImages.length > 0 ? 'default' : variant}
            size={size}
            onClick={handleOpenModal}
            disabled={disabled}
            className={`
              ${selectedImages.length > 0 ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              flex items-center gap-2
            `}
          >
            {selectedImages.length > 0 ? (
              <>
                <Grid3X3 className="w-4 h-4" />
                <span>{getButtonLabel()}</span>
              </>
            ) : (
              <>
                <Palette className="w-4 h-4" />
                <span>{getButtonLabel()}</span>
              </>
            )}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              בחירת תמונות רקע לקלפים
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Upload Section */}
            <Card className="p-4 border-dashed border-2 border-purple-200 bg-purple-50">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-purple-800">העלאת תמונת רקע חדשה</h3>
                  <Badge variant="secondary">JPG, PNG, GIF עד 5MB</Badge>
                </div>

                <div className="flex items-center gap-4">
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                      <Upload className="w-4 h-4" />
                      בחר תמונה
                    </div>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading || disabled}
                      className="hidden"
                    />
                  </Label>

                  {isUploading && (
                    <div className="flex items-center gap-2 text-purple-600">
                      <LudoraLoadingSpinner size="sm" />
                      <span className="text-sm">מעלה... {uploadProgress}%</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Selection Info */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="text-sm text-blue-700">
                  נבחרו: <span className="font-bold">{selectedImages.length}</span> מתוך {maxSelection}
                </div>
                {minSelection > 0 && (
                  <Badge variant="outline" className="text-xs">
                    מינימום: {minSelection}
                  </Badge>
                )}
              </div>

              {selectedImages.length > 0 && minSelection === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-red-500 hover:text-red-700"
                >
                  נקה הכל
                </Button>
              )}
            </div>

            {/* Images Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <LudoraLoadingSpinner />
                  <p className="text-sm text-gray-500 mt-2">טוען תמונות רקע...</p>
                </div>
              </div>
            ) : availableImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {availableImages.map((image) => {
                  const isSelected = selectedImages.some(img => img.id === image.id);

                  return (
                    <div
                      key={image.id}
                      className={`
                        relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all
                        ${isSelected
                          ? 'border-purple-500 ring-2 ring-purple-200 shadow-lg'
                          : 'border-gray-200 hover:border-purple-300'
                        }
                      `}
                      onClick={() => handleImageToggle(image)}
                    >
                      {/* Image */}
                      <div className="aspect-square relative bg-gray-100">
                        <img
                          src={getImageUrl(image.value)}
                          alt="תמונת רקע"
                          className="w-full h-full object-cover"
                          onLoad={(e) => {
                            clog(`✅ Image loaded successfully: ${e.target.src}`);
                          }}
                          onError={(e) => {
                            cerror(`❌ Image failed to load: ${e.target.src}`);
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
                          }}
                        />

                        {/* Selection Overlay */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                            <div className="bg-purple-600 rounded-full p-1">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}

                        {/* Remove button for selected images */}
                        {isSelected && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleRemoveImage(image.id, e)}
                            className="absolute top-1 right-1 p-1 h-auto bg-red-500 hover:bg-red-600 text-white rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>

                      {/* Image Info */}
                      <div className="p-2 bg-white">
                        <p className="text-xs text-gray-600 truncate">
                          {image.metadata?.originalName || `תמונה ${image.id ? image.id.slice(-6) : 'לא זוהה'}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-8 text-gray-500">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">אין תמונות רקע זמינות</p>
                <p className="text-xs mt-1">העלה תמונה ראשונה כדי להתחיל</p>
              </div>
            )}

            {/* Validation Messages */}
            {selectedImages.length < minSelection && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  יש לבחור לפחות {minSelection} תמונות רקע
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Selected Images Preview */}
      {selectedImages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedImages.map((image) => (
            <div key={image.id} className="relative">
              <img
                src={getImageUrl(image.value)}
                alt="תמונת רקע נבחרת"
                className="w-12 h-12 object-cover rounded border-2 border-purple-300"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjZjdmN2Y3Ii8+PHRleHQgeD0iMjQiIHk9IjI4IiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JTUc8L3RleHQ+PC9zdmc+';
                }}
              />
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleRemoveImage(image.id, e)}
                  className="absolute -top-1 -right-1 p-0 h-4 w-4 bg-red-500 hover:bg-red-600 text-white rounded-full"
                >
                  <X className="w-2 h-2" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selection Count Badge */}
      {selectedImages.length > 0 && (
        <Badge variant="secondary" className="text-xs w-fit">
          {selectedImages.length} תמונות רקע
        </Badge>
      )}
    </div>
  );
};

export default BackgroundImageSelector;