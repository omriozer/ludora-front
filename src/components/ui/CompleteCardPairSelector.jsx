import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Image, Upload, Plus } from 'lucide-react';
import { GameContent } from '@/services/entities';
import { apiUploadWithProgress } from '@/services/apiClient';
import { getApiBase } from '@/utils/api';
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';

/**
 * CompleteCardPairSelector - Component for selecting complete cards for memory pairs
 *
 * This component allows users to select from all available complete cards
 * and optionally upload new cards when creating memory pairs in complete card mode.
 */
const CompleteCardPairSelector = ({
  selectedCard = null,
  onCardSelected,
  onCardCleared,
  disabled = false,
  className = '',
  placeholder = 'בחר קלף',
  allowUpload = false
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [availableCards, setAvailableCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper function to construct image URL from complete card
  const getCardImageUrl = useCallback((card) => {
    if (!card?.value) {
      clog('⚠️ Card missing value:', card);
      clog('🔍 Full card object:', card);
      return null;
    }

    const imageValue = card.value;
    clog('🔗 Processing card image URL:', { cardId: card.id, imageValue, cardName: card.metadata?.name });

    // If it's already an absolute URL, return as-is
    if (imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
      clog('✅ Using absolute URL:', imageValue);
      return imageValue;
    }

    // If it starts with /api/, prepend the API base URL (removing /api from base)
    if (imageValue.startsWith('/api/')) {
      const apiBase = getApiBase();
      const baseWithoutApi = apiBase.replace(/\/api$/, '');
      const fullUrl = `${baseWithoutApi}${imageValue}`;
      clog('✅ Constructed URL from /api/ path:', fullUrl);
      return fullUrl;
    }

    // Otherwise, treat as a relative path and prepend full API base
    const fullUrl = `${getApiBase()}${imageValue.startsWith('/') ? '' : '/'}${imageValue}`;
    clog('✅ Constructed URL from relative path:', fullUrl);
    return fullUrl;
  }, []);

  // Load all available complete cards
  const loadCompleteCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const cards = await GameContent.find({
        semantic_type: 'complete_card',
        data_type: 'image_url'
      });
      const validCards = (cards || []).filter(card => card && card.id);
      setAvailableCards(validCards);
      clog('🃏 Loaded available complete cards:', validCards);
    } catch (error) {
      cerror('❌ Error loading complete cards:', error);
      toast({
        title: "שגיאה בטעינת קלפים",
        description: "לא ניתן לטעון את הקלפים השלמים הקיימים",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load cards when component mounts
  useEffect(() => {
    loadCompleteCards();
  }, [loadCompleteCards]);

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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('semantic_type', 'complete_card');
      formData.append('data_type', 'image_url');
      // Create a clean card name from the filename
      const cardName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      formData.append('metadata', JSON.stringify({
        name: cardName, // Add the name field for our streamlined schema
        description: `קלף שלם - ${cardName}`,
        card_content_type: 'image', // Set appropriate content type
        originalName: file.name,
        uploadedAt: new Date().toISOString()
      }));

      // Upload file with progress tracking
      const response = await apiUploadWithProgress(
        '/entities/gamecontent/upload',
        formData,
        (progress) => {
          setUploadProgress(progress);
          clog(`📊 Complete card upload progress: ${progress}%`);
        }
      );

      clog('🃏 Uploaded new complete card:', response);
      clog('🔍 Upload response structure:', {
        hasGamecontent: !!response?.gamecontent,
        gamecontent: response?.gamecontent,
        responseKeys: Object.keys(response || {}),
        gamecontentKeys: response?.gamecontent ? Object.keys(response.gamecontent) : null
      });

      // Add to available cards and select it
      if (response && response.gamecontent && response.gamecontent.id) {
        const newCard = response.gamecontent;
        clog('🃏 New card for selection:', {
          id: newCard.id,
          value: newCard.value,
          metadata: newCard.metadata,
          hasValue: !!newCard.value
        });
        setAvailableCards(prev => [newCard, ...prev]);

        // Auto-select the uploaded card
        if (onCardSelected) {
          clog('🎯 Auto-selecting uploaded card:', newCard);
          onCardSelected(newCard);
        }

        toast({
          title: "קלף הועלה בהצלחה",
          description: "הקלף השלם הועלה ונבחר עבור הזוג",
          variant: "default"
        });

        setIsModalOpen(false);
      }

      // Clear file input
      event.target.value = '';

    } catch (error) {
      cerror('❌ Error uploading complete card:', error);
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

  // Handle card selection
  const handleCardSelect = (cardId) => {
    const card = availableCards.find(c => c.id.toString() === cardId);
    if (card && onCardSelected) {
      clog('🃏 Complete card selected for pair:', card);
      onCardSelected(card);
    }
    setIsDropdownOpen(false);
  };

  // Handle clearing selection
  const handleClear = () => {
    if (onCardCleared) {
      clog('🃏 Complete card cleared from pair');
      onCardCleared();
    }
  };

  // Get display text for selected card
  const getCardDisplayText = (card) => {
    if (!card) return '';

    // Priority order for display text:
    // 1. metadata.name (from new streamlined schema)
    // 2. metadata.title (backwards compatibility)
    // 3. card.name (direct field)
    // 4. shortened description as fallback
    // 5. default text
    let displayText = card.metadata?.name ||
                     card.metadata?.title ||
                     card.name;

    if (!displayText && card.metadata?.description) {
      // Use first part of description if no name available
      displayText = card.metadata.description.length > 20
        ? `${card.metadata.description.substring(0, 17)}...`
        : card.metadata.description;
    }

    if (!displayText) {
      displayText = 'קלף שלם';
    }

    // Truncate if still too long
    return displayText.length > 25 ? `${displayText.substring(0, 22)}...` : displayText;
  };

  // If no cards available, show disabled state
  if (!availableCards || availableCards.length === 0) {
    return (
      <div className={`flex items-center justify-center p-2 border border-gray-200 rounded text-xs text-gray-400 ${className}`}>
        אין קלפים זמינים
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {selectedCard ? (
        // Show selected card with clear option
        <div className="flex items-center gap-2 p-2 border border-blue-500 bg-blue-50 rounded text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {(() => {
              const imageUrl = getCardImageUrl(selectedCard);
              clog('🖼️ Selected card image rendering:', {
                selectedCard,
                imageUrl,
                hasImageUrl: !!imageUrl,
                cardValue: selectedCard?.value,
                cardMetadata: selectedCard?.metadata
              });
              return imageUrl ? (
                <img
                  src={imageUrl}
                  alt={getCardDisplayText(selectedCard)}
                  className="w-8 h-8 object-cover rounded border flex-shrink-0"
                  onError={(e) => {
                    cerror('❌ Failed to load selected card image:', imageUrl);
                    cerror('❌ Selected card details for failed image:', selectedCard);
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'block';
                  }}
                  onLoad={() => {
                    clog('✅ Selected card image loaded successfully:', imageUrl);
                  }}
                />
              ) : null;
            })()}
            <Image className="w-3 h-3 text-blue-600 flex-shrink-0" style={{display: getCardImageUrl(selectedCard) ? 'none' : 'block'}} />
            <span className="truncate text-blue-700 font-medium">
              {getCardDisplayText(selectedCard)}
            </span>
          </div>
          {!disabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-4 w-4 p-0 hover:bg-red-100"
            >
              <X className="w-3 h-3 text-red-500" />
            </Button>
          )}
        </div>
      ) : (
        // Show selector with upload option
        <div className="flex gap-1">
          <Select
            onValueChange={handleCardSelect}
            disabled={disabled || isLoading}
            open={isDropdownOpen}
            onOpenChange={setIsDropdownOpen}
          >
            <SelectTrigger className="text-xs h-8 min-w-32 flex-1">
              <SelectValue placeholder={isLoading ? "טוען קלפים..." : placeholder} />
            </SelectTrigger>
            <SelectContent>
              {availableCards.length === 0 && !isLoading ? (
                <div className="p-2 text-xs text-gray-500 text-center">
                  אין קלפים שלמים זמינים
                </div>
              ) : (
                availableCards.map((card) => {
                  const imageUrl = getCardImageUrl(card);
                  return (
                    <SelectItem key={card.id} value={card.id.toString()} className="text-xs">
                      <div className="flex items-center gap-2 w-full">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={getCardDisplayText(card)}
                            className="w-8 h-8 object-cover rounded border flex-shrink-0"
                            onError={(e) => {
                              cerror('❌ Failed to load card image:', imageUrl);
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'block';
                            }}
                          />
                        ) : null}
                        <Image className="w-3 h-3 text-gray-500 flex-shrink-0" style={{display: imageUrl ? 'none' : 'block'}} />
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <span className="font-medium truncate max-w-48">
                            {getCardDisplayText(card)}
                          </span>
                          {card.metadata?.card_type && (
                            <span className="text-gray-400 text-xs truncate max-w-48">
                              {card.metadata.card_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>

          {/* Upload Button */}
          {allowUpload && (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  className="h-8 w-8 p-0 shrink-0"
                  title="העלה קלף חדש"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    העלאת קלף שלם חדש
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="p-4 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50">
                    <div className="text-center space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-blue-500" />
                      <p className="text-sm font-medium text-blue-800">
                        בחר תמונת קלף לעלאה
                      </p>
                      <p className="text-xs text-blue-600">
                        JPG, PNG או GIF - עד 5MB
                      </p>
                    </div>

                    <div className="mt-4">
                      <Label htmlFor="card-upload" className="cursor-pointer">
                        <div className="w-full bg-blue-600 text-white py-2 px-4 rounded text-center text-sm hover:bg-blue-700 transition-colors">
                          בחר קובץ
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
                    </div>

                    {isUploading && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-blue-600">
                          <LudoraLoadingSpinner size="sm" />
                          <span className="text-sm">מעלה קלף... {uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
};

export default CompleteCardPairSelector;