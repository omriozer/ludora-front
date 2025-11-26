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
  Layers
} from 'lucide-react';
import { GameContent } from '@/services/entities';
import { apiUploadWithProgress } from '@/services/apiClient';
import { getApiBase } from '@/utils/api';
import { ludlog, luderror } from '@/lib/ludlog';
import { toast } from '@/components/ui/use-toast';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';

/**
 * CompleteCardSelector - Reusable component for selecting complete card images
 * Supports uploading new complete cards and selecting from existing complete_card images
 *
 * @param {Array} selectedCards - Array of selected complete card content objects
 * @param {function} onCardsSelected - Callback when cards selection changes: (cards) => void
 * @param {number} minSelection - Minimum number of cards to select (default: 1)
 * @param {number} maxSelection - Maximum number of cards to select (default: 20)
 * @param {boolean} disabled - Whether the selector is disabled
 * @param {string} className - Additional CSS classes
 * @param {string} variant - Button variant: 'outline' | 'default' | 'ghost'
 * @param {string} size - Button size: 'sm' | 'md' | 'lg'
 */
const CompleteCardSelector = ({
  selectedCards = [],
  onCardsSelected,
  minSelection = 1,
  maxSelection = 20,
  disabled = false,
  className = '',
  variant = 'outline',
  size = 'md'
}) => {
  // Helper function to construct absolute image URLs
  const getImageUrl = (imageValue) => {
    if (!imageValue) {
      ludlog.media('🚨 getImageUrl: Empty imageValue');
      return '';
    }

    ludlog.media('🔍 getImageUrl input:', { data: imageValue });

    // If it's already an absolute URL, return as-is
    if (imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
      ludlog.api('✅ getImageUrl: Already absolute URL:', { data: imageValue });
      return imageValue;
    }

    // If it starts with /api/, prepend the API base URL (removing /api from base)
    if (imageValue.startsWith('/api/')) {
      const apiBase = getApiBase();
      ludlog.api('🔍 getImageUrl: API base from getApiBase();:', apiBase);
      // Remove /api from the end of apiBase since imageValue already includes /api/
      const baseWithoutApi = apiBase.replace(/\/api$/, '');
      const finalUrl = `${baseWithoutApi}${imageValue}`;
      ludlog.api('✅ getImageUrl: Constructed absolute URL:', { data: finalUrl });
      return finalUrl;
    }

    // Otherwise, treat as a relative path and prepend full API base
    const finalUrl = `${getApiBase()}${imageValue.startsWith('/') ? '' : '/'}${imageValue}`;
    ludlog.api('✅ getImageUrl: Constructed full API URL:', { data: finalUrl });
    return finalUrl;
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableCards, setAvailableCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load available complete cards
  const loadCompleteCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const cards = await GameContent.find({
        semantic_type: 'complete_card',
        data_type: 'image_url'
      });
      // Filter out any cards without valid IDs
      const validCards = (cards || []).filter(card => card && card.id);
      setAvailableCards(validCards);
      ludlog.ui('🃏 Loaded complete cards:', { data: validCards });

      // Debug: Log each card's value field
      validCards.forEach((card, index) => {
        ludlog.ui(`🖼️ Card ${index}: id=${card.id}, { data: value="${card.value}"` });
      });
    } catch (error) {
      luderror.ui('Error loading complete cards:', error);
      toast({
        title: "שגיאה בטעינת קלפים שלמים",
        description: "לא ניתן לטעון את הקלפים השלמים הקיימים",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle opening modal and loading cards
  const handleOpenModal = () => {
    if (!disabled) {
      setIsModalOpen(true);
      loadCompleteCards();
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
      atomicFormData.append('semantic_type', 'complete_card');
      atomicFormData.append('data_type', 'image_url');
      atomicFormData.append('metadata', JSON.stringify({
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        description: `קלף שלם - ${file.name}`,
        card_type: 'memory_pair',
        visual_style: 'illustration',
        color_scheme: 'colorful'
      }));

      // Upload file with progress tracking using the correct endpoint
      const response = await apiUploadWithProgress(
        '/entities/gamecontent/upload',
        atomicFormData,
        (progress) => {
          setUploadProgress(progress);
          ludlog.media(`📊 Complete card upload progress: ${progress}%`);
        }
      );

      ludlog.api('🃏 Uploaded complete card:', { data: response });

      // Add to available cards (ensure it has a valid ID)
      if (response && response.gamecontent && response.gamecontent.id) {
        setAvailableCards(prev => [response.gamecontent, ...prev]);
      } else {
        luderror.api('Invalid upload response - missing ID:', response);
      }

      toast({
        title: "קלף הועלה בהצלחה",
        description: "הקלף השלם נוסף לאוסף",
        variant: "default"
      });

      // Clear file input
      event.target.value = '';

    } catch (error) {
      luderror.media('Error uploading complete card:', error);
      toast({
        title: "שגיאה בהעלאת קלף",
        description: "לא ניתן להעלות את הקלף כרגע. נסה שוב.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle card selection toggle
  const handleCardToggle = (card) => {
    const isCurrentlySelected = selectedCards.some(c => c.id === card.id);

    if (isCurrentlySelected) {
      // Remove from selection
      const newSelection = selectedCards.filter(c => c.id !== card.id);

      // Check minimum constraint
      if (newSelection.length < minSelection) {
        toast({
          title: "בחירה מינימלית נדרשת",
          description: `חובה לבחור לפחות ${minSelection} קלפים שלמים`,
          variant: "destructive"
        });
        return;
      }

      onCardsSelected?.(newSelection);
    } else {
      // Add to selection
      if (selectedCards.length >= maxSelection) {
        toast({
          title: "הגעת למקסימום הבחירות",
          description: `ניתן לבחור עד ${maxSelection} קלפים שלמים`,
          variant: "destructive"
        });
        return;
      }

      const newSelection = [...selectedCards, card];
      onCardsSelected?.(newSelection);
    }
  };

  // Clear all selections
  const handleClearAll = () => {
    if (minSelection > 0) {
      toast({
        title: "לא ניתן לנקות הכל",
        description: `חובה לבחור לפחות ${minSelection} קלפים שלמים`,
        variant: "destructive"
      });
      return;
    }
    onCardsSelected?.([]);
  };

  // Remove specific card from selection
  const handleRemoveCard = (cardId, event) => {
    event.stopPropagation();
    const newSelection = selectedCards.filter(c => c.id !== cardId);

    if (newSelection.length < minSelection) {
      toast({
        title: "בחירה מינימלית נדרשת",
        description: `חובה לבחור לפחות ${minSelection} קלפים שלמים`,
        variant: "destructive"
      });
      return;
    }

    onCardsSelected?.(newSelection);
  };

  // Generate button label
  const getButtonLabel = () => {
    if (selectedCards.length > 0) {
      return `נבחרו ${selectedCards.length} קלפים שלמים`;
    }
    return 'בחירת קלפים שלמים';
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Main Selection Button */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant={selectedCards.length > 0 ? 'default' : variant}
            size={size}
            onClick={handleOpenModal}
            disabled={disabled}
            className={`
              ${selectedCards.length > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              flex items-center gap-2
            `}
          >
            {selectedCards.length > 0 ? (
              <>
                <Layers className="w-4 h-4" />
                <span>{getButtonLabel()}</span>
              </>
            ) : (
              <>
                <Layers className="w-4 h-4" />
                <span>{getButtonLabel()}</span>
              </>
            )}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              בחירת קלפים שלמים
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Upload Section */}
            <Card className="p-4 border-dashed border-2 border-blue-200 bg-blue-50">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-blue-800">העלאת קלף שלם חדש</h3>
                  <Badge variant="secondary">JPG, PNG, GIF עד 5MB</Badge>
                </div>

                <div className="flex items-center gap-4">
                  <Label htmlFor="card-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                      <Upload className="w-4 h-4" />
                      בחר קלף
                    </div>
                    <Input
                      id="card-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading || disabled}
                      className="hidden"
                    />
                  </Label>

                  {isUploading && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <LudoraLoadingSpinner size="sm" />
                      <span className="text-sm">מעלה... {uploadProgress}%</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Selection Info */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="text-sm text-green-700">
                  נבחרו: <span className="font-bold">{selectedCards.length}</span> מתוך {maxSelection}
                </div>
                {minSelection > 0 && (
                  <Badge variant="outline" className="text-xs">
                    מינימום: {minSelection}
                  </Badge>
                )}
              </div>

              {selectedCards.length > 0 && minSelection === 0 && (
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

            {/* Cards Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <LudoraLoadingSpinner />
                  <p className="text-sm text-gray-500 mt-2">טוען קלפים שלמים...</p>
                </div>
              </div>
            ) : availableCards.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {availableCards.map((card) => {
                  const isSelected = selectedCards.some(c => c.id === card.id);

                  return (
                    <div
                      key={card.id}
                      className={`
                        relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all
                        ${isSelected
                          ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg'
                          : 'border-gray-200 hover:border-blue-300'
                        }
                      `}
                      onClick={() => handleCardToggle(card)}
                    >
                      {/* Card Image */}
                      <div className="aspect-[3/4] relative bg-gray-100">
                        <img
                          src={getImageUrl(card.value)}
                          alt="קלף שלם"
                          className="w-full h-full object-cover"
                          onLoad={(e) => {
                            ludlog.media(`✅ Card image loaded successfully: ${e.target.src}`);
                          }}
                          onError={(e) => {
                            luderror.media(`❌ Card image failed to load: ${e.target.src}`);
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEzMyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEzMyIgZmlsbD0iI2Y3ZjdmNyIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjEiLz48dGV4dCB4PSI1MCIgeT0iNzAiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPktMRjwvdGV4dD48L3N2Zz4=';
                          }}
                        />

                        {/* Selection Overlay */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                            <div className="bg-blue-600 rounded-full p-1">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}

                        {/* Remove button for selected cards */}
                        {isSelected && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleRemoveCard(card.id, e)}
                            className="absolute top-1 right-1 p-1 h-auto bg-red-500 hover:bg-red-600 text-white rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>

                      {/* Card Info */}
                      <div className="p-2 bg-white">
                        <p className="text-xs text-gray-600 truncate">
                          {card.metadata?.content || card.metadata?.originalName || `קלף ${card.id ? card.id.slice(-6) : 'לא זוהה'}`}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {card.metadata?.card_type && `סוג: ${card.metadata.card_type}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-8 text-gray-500">
                <Layers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">אין קלפים שלמים זמינים</p>
                <p className="text-xs mt-1">העלה קלף ראשון כדי להתחיל</p>
              </div>
            )}

            {/* Validation Messages */}
            {selectedCards.length < minSelection && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  יש לבחור לפחות {minSelection} קלפים שלמים
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Selected Cards Preview */}
      {selectedCards.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCards.map((card) => (
            <div key={card.id} className="relative">
              <img
                src={getImageUrl(card.value)}
                alt="קלף שלם נבחר"
                className="w-12 h-16 object-cover rounded border-2 border-blue-300"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjdmN2Y3IiBzdHJva2U9IiNjY2MiIHN0cm9rZS13aWR0aD0iMSIvPjx0ZXh0IHg9IjI0IiB5PSIzNiIgZm9udC1zaXplPSI4IiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5LTEY8L3RleHQ+PC9zdmc+';
                }}
              />
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleRemoveCard(card.id, e)}
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
      {selectedCards.length > 0 && (
        <Badge variant="secondary" className="text-xs w-fit">
          {selectedCards.length} קלפים שלמים
        </Badge>
      )}
    </div>
  );
};

export default CompleteCardSelector;