import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, Save, Settings, AlertCircle, Trash2, Check } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { clog, cerror } from '@/lib/utils';
import { ContentSelector } from '@/components/content';
import { GameContent } from '@/services/entities';
import { api, getApiBase } from '@/utils/api';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { toast } from '@/components/ui/use-toast';
import BackgroundImageSelector from '@/components/ui/BackgroundImageSelector';

/**
 * MemoryGameSettingsDigital - Digital version settings for memory games
 * Handles configuration for interactive digital memory game features
 *
 * New Data Architecture:
 * - Uses GameContentRelation and GameContentLink tables instead of selectedContent
 * - Each memory pair is a GameContentRelation with type 'memory_pair'
 * - GameContentRelationItem stores the two content items for each pair
 * - GameContentLink connects the game to the memory pair relations
 * - Provides reusable content relationships across multiple games
 */
const MemoryGameSettingsDigital = ({
  gameProduct,
  gameEntity,
  onSettingsChange,
  isUpdating = false
}) => {
  const { settings } = useUser();
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [memoryPairs, setMemoryPairs] = useState([]); // Array of memory pair relations
  const [contentCache, setContentCache] = useState({}); // Cache for content objects by ID
  const [isLoadingPairs, setIsLoadingPairs] = useState(false);

  // Background image state
  const [backgroundImagesSetA, setBackgroundImagesSetA] = useState([]);
  const [backgroundImagesSetB, setBackgroundImagesSetB] = useState([]);

  // Card rendering mode state
  const [cardRenderingMode, setCardRenderingMode] = useState('complete'); // 'composite' or 'complete'

  // Auto-save state
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'pending', 'saving', 'error'
  const autoSaveTimeoutRef = useRef(null);

  // Available relation types
  const relationTypes = [
    { value: 'translation', label: 'תרגום' },
    { value: 'synonym', label: 'מילים נרדפות' },
    { value: 'antonym', label: 'מילים הפוכות' },
    { value: 'similar_meaning', label: 'משמעות דומה' },
    { value: 'question_answer', label: 'שאלה-תשובה' },
    { value: 'answer_question', label: 'תשובה-שאלה' },
    { value: 'distractor', label: 'מסיח דעת' }
  ];

  // Get settings configuration from global settings
  const settingsConfig = settings?.game_types?.memory_game?.settings?.digital || {};

  // Auto-save function with debouncing
  const autoSave = useCallback(async (data) => {
    if (!data || Object.keys(data).length === 0) return;

    setIsAutoSaving(true);
    setSaveStatus('saving');

    try {
      clog('🚀 Auto-saving game settings:', data);
      await onSettingsChange(data);
      setLastSaved(new Date());
      setSaveStatus('saved');
      setHasChanges(false);
      clog('✅ Auto-save successful');
    } catch (error) {
      cerror('❌ Auto-save failed:', error);
      setSaveStatus('error');
    } finally {
      setIsAutoSaving(false);
    }
  }, [onSettingsChange]);

  // Debounced auto-save - waits 1 second after user stops typing
  const debouncedAutoSave = useCallback((data) => {
    setSaveStatus('pending');

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave(data);
    }, 1000); // 1 second delay
  }, [autoSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Initialize form data with current values or defaults
  useEffect(() => {
    const currentSettings = gameEntity?.game_settings || {};
    const initialData = {};

    Object.entries(settingsConfig).forEach(([key, config]) => {
      initialData[key] = currentSettings[key] !== undefined
        ? currentSettings[key]
        : config.defaultValue;
    });

    setFormData(initialData);
    clog('🧠 Initialized memory game digital settings:', initialData);
  }, [gameEntity?.game_settings, settingsConfig]);

  // Load memory pairs for the game
  useEffect(() => {
    if (gameEntity?.id) {
      loadMemoryPairs();
    }
  }, [gameEntity?.id]);

  // Load background images from game settings
  useEffect(() => {
    const loadBackgroundImages = async () => {
      const currentSettings = gameEntity?.game_settings || {};

      // Load background images for Set A
      if (currentSettings.backgroundImagesSetA && Array.isArray(currentSettings.backgroundImagesSetA)) {
        try {
          const imagesA = await Promise.all(
            currentSettings.backgroundImagesSetA.map(async (imageId) => {
              try {
                return await GameContent.findById(imageId);
              } catch (error) {
                cerror(`Failed to load background image ${imageId}:`, error);
                return null;
              }
            })
          );
          setBackgroundImagesSetA(imagesA.filter(Boolean));
        } catch (error) {
          cerror('Error loading background images for Set A:', error);
        }
      }

      // Load background images for Set B
      if (currentSettings.backgroundImagesSetB && Array.isArray(currentSettings.backgroundImagesSetB)) {
        try {
          const imagesB = await Promise.all(
            currentSettings.backgroundImagesSetB.map(async (imageId) => {
              try {
                return await GameContent.findById(imageId);
              } catch (error) {
                cerror(`Failed to load background image ${imageId}:`, error);
                return null;
              }
            })
          );
          setBackgroundImagesSetB(imagesB.filter(Boolean));
        } catch (error) {
          cerror('Error loading background images for Set B:', error);
        }
      }
    };

    if (gameEntity?.id && gameEntity?.game_settings) {
      loadBackgroundImages();
    }
  }, [gameEntity?.id, gameEntity?.game_settings]);

  // Load card rendering mode from game settings
  useEffect(() => {
    const loadCardRenderingSettings = async () => {
      const currentSettings = gameEntity?.game_settings || {};

      // Load card rendering mode
      const renderingMode = currentSettings.cardRenderingMode || 'complete';
      setCardRenderingMode(renderingMode);
    };

    if (gameEntity?.id && gameEntity?.game_settings) {
      loadCardRenderingSettings();
    }
  }, [gameEntity?.id, gameEntity?.game_settings]);

  // Load memory pairs from API
  const loadMemoryPairs = async () => {
    if (!gameEntity?.id) return;

    setIsLoadingPairs(true);
    try {
      const response = await api.get(`/games/${gameEntity.id}/memory-pairs`);
      clog('🧠 Loaded memory pairs:', response);

      setMemoryPairs(response || []);

      // Load content for all pairs into cache
      await loadContentForPairs(response || []);

    } catch (error) {
      cerror('Error loading memory pairs:', error);
      setMemoryPairs([]);
      toast({
        title: "שגיאה בטעינת זוגות זיכרון",
        description: "לא ניתן לטעון את זוגות הזיכרון מהשרת. נסה לרענן את הדף.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPairs(false);
    }
  };

  // Load content objects for all content referenced in pairs
  const loadContentForPairs = async (pairs) => {
    if (!pairs || !Array.isArray(pairs)) return;

    // Extract all unique content IDs from all pairs
    const allIds = [];
    pairs.forEach(pair => {
      if (pair.items && Array.isArray(pair.items)) {
        pair.items.forEach(item => {
          if (item.content_id) {
            allIds.push(item.content_id);
          }
        });
      }
    });

    const uniqueIds = [...new Set(allIds)].filter(Boolean);
    if (uniqueIds.length === 0) return;

    try {
      const contentPromises = uniqueIds.map(async (id) => {
        if (contentCache[id]) return [id, contentCache[id]]; // Already cached

        try {
          const content = await GameContent.findById(id);
          return [id, content];
        } catch (error) {
          cerror(`Failed to load content ${id}:`, error);
          return [id, null];
        }
      });

      const contentResults = await Promise.all(contentPromises);
      const newCache = { ...contentCache };

      contentResults.forEach(([id, content]) => {
        if (content) {
          newCache[id] = content;
        }
      });

      setContentCache(newCache);
      clog('🧠 Loaded content cache for pairs:', newCache);

    } catch (error) {
      cerror('Error loading content for pairs:', error);
    }
  };

  // Create a new content relation pair
  const createMemoryPair = async (contentIdA, contentIdB, relationType = 'translation') => {
    if (!gameEntity?.id || !contentIdA || !contentIdB || !relationType) return null;

    try {
      const response = await api.post(`/games/${gameEntity.id}/memory-pairs`, {
        contentIdA,
        contentIdB,
        relationType
      });

      clog('🧠 Created content relation pair:', response);
      toast({
        title: "זוג נוצר בהצלחה",
        description: "זוג הזיכרון נוצר ונשמר במערכת",
        variant: "default"
      });
      return response;
    } catch (error) {
      cerror('Error creating content relation pair:', error);
      toast({
        title: "שגיאה ביצירת זוג",
        description: "לא ניתן ליצור את זוג הזיכרון כרגע. נסה שוב.",
        variant: "destructive"
      });
      return null;
    }
  };

  // Update an existing content relation pair
  const updateMemoryPair = async (relationId, contentIdA, contentIdB, relationType) => {
    if (!gameEntity?.id || !relationId) return null;

    try {
      const response = await api.put(`/games/${gameEntity.id}/memory-pairs/${relationId}`, {
        contentIdA,
        contentIdB,
        relationType
      });

      clog('🧠 Updated content relation pair:', response);
      toast({
        title: "זוג עודכן בהצלחה",
        description: "זוג הזיכרון עודכן ונשמר במערכת",
        variant: "default"
      });
      return response;
    } catch (error) {
      cerror('Error updating content relation pair:', error);
      toast({
        title: "שגיאה בעדכון זוג",
        description: "לא ניתן לעדכן את זוג הזיכרון כרגע. נסה שוב.",
        variant: "destructive"
      });
      return null;
    }
  };

  // Delete a memory pair
  const deleteMemoryPair = async (relationId) => {
    if (!gameEntity?.id || !relationId) return false;

    try {
      await api.delete(`/games/${gameEntity.id}/memory-pairs/${relationId}`);
      clog('🧠 Deleted memory pair:', relationId);
      toast({
        title: "זוג נמחק בהצלחה",
        description: "זוג הזיכרון הוסר מהמשחק",
        variant: "default"
      });
      return true;
    } catch (error) {
      cerror('Error deleting memory pair:', error);
      toast({
        title: "שגיאה במחיקת זוג",
        description: "לא ניתן למחוק את זוג הזיכרון כרגע. נסה שוב.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Get content object by ID from cache
  const getContentById = (id) => {
    return contentCache[id] || null;
  };

  // Handle input changes (for typing - no auto-save)
  const handleChange = (fieldName, value) => {
    const config = settingsConfig[fieldName];
    if (!config) return;

    // Convert value based on type
    let processedValue = value;
    if (config.type === 'number') {
      if (value === '' || value === null) {
        processedValue = config.nullable ? null : config.defaultValue;
      } else {
        processedValue = parseInt(value, 10);
      }
    } else if (config.type === 'select') {
      // For select fields, use the value as-is (no conversion needed)
      processedValue = value;
    }

    const newFormData = { ...formData, [fieldName]: processedValue };
    setFormData(newFormData);
    setHasChanges(true);

    // Only validate, don't save yet for text/number inputs
    validateField(fieldName, processedValue);

    // Cross-validation for min/max cards (but don't save)
    if (fieldName === 'min_cards' || fieldName === 'max_cards') {
      // Clear existing errors for both fields before re-validating
      setErrors(prev => ({
        ...prev,
        min_cards: prev.min_cards?.includes('מינימלי חייב להיות קטן') ? null : prev.min_cards,
        max_cards: prev.max_cards?.includes('מקסימלי חייב להיות גדול') ? null : prev.max_cards
      }));

      // Re-validate both fields with new data
      setTimeout(() => {
        if (newFormData.min_cards && newFormData.max_cards) {
          if (newFormData.min_cards > newFormData.max_cards) {
            setErrors(prev => ({
              ...prev,
              min_cards: 'מספר הקלפים המינימלי חייב להיות קטן או שווה למקסימלי'
            }));
          } else if (newFormData.max_cards < newFormData.min_cards) {
            setErrors(prev => ({
              ...prev,
              max_cards: 'מספר הקלפים המקסימלי חייב להיות גדול או שווה למינימלי'
            }));
          }
        }
      }, 0);
    }
  };

  // Handle field blur (for text/number inputs - triggers auto-save)
  const handleBlur = (fieldName) => {
    const config = settingsConfig[fieldName];
    if (!config) return;

    // Only auto-save if field is valid
    const isValid = validateField(fieldName, formData[fieldName]);
    if (isValid && !Object.values(errors).some(error => error)) {
      debouncedAutoSave(formData);
    }
  };

  // Handle select change (immediate auto-save for dropdowns)
  const handleSelectChange = (fieldName, value) => {
    const config = settingsConfig[fieldName];
    if (!config) return;

    let processedValue = value;
    const newFormData = { ...formData, [fieldName]: processedValue };
    setFormData(newFormData);
    setHasChanges(true);

    // Validate and immediately save for select fields
    const isValid = validateField(fieldName, processedValue);
    if (isValid) {
      debouncedAutoSave(newFormData);
    }
  };

  // Validate individual field
  const validateField = (fieldName, value) => {
    const config = settingsConfig[fieldName];
    if (!config || !config.validation) return true;

    const validation = config.validation;
    let error = null;

    // Required validation
    if (validation.required && (value === null || value === undefined || value === '')) {
      error = `${config.label} הוא שדה חובה`;
    }
    // Min/Max validation for numbers
    else if (config.type === 'number' && value !== null && value !== undefined) {
      if (validation.min !== undefined && value < validation.min) {
        error = validation.message || `${config.label} חייב להיות לפחות ${validation.min}`;
      } else if (validation.max !== undefined && value > validation.max) {
        error = validation.message || `${config.label} חייב להיות לכל היותר ${validation.max}`;
      }
    }
    // Max length validation for text
    else if (config.type === 'text' && validation.maxLength && value && value.length > validation.maxLength) {
      error = validation.message || `${config.label} חייב להיות עד ${validation.maxLength} תווים`;
    }
    // isIn validation for select fields
    else if (config.type === 'select' && validation.isIn && value) {
      const allowedValues = validation.isIn[0]; // isIn is nested array like [['word', 'question', ...]]
      if (!allowedValues.includes(value)) {
        error = validation.message || `${config.label} חייב להיות אחד מהערכים המותרים`;
      }
    }

    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));

    return !error;
  };

  // Validate all fields
  const validateAll = () => {
    let isValid = true;
    Object.keys(settingsConfig).forEach(fieldName => {
      const fieldValid = validateField(fieldName, formData[fieldName]);
      if (!fieldValid) isValid = false;
    });

    // Additional validation: min_cards should be <= max_cards
    if (formData.min_cards && formData.max_cards) {
      if (formData.min_cards > formData.max_cards) {
        setErrors(prev => ({
          ...prev,
          min_cards: 'מספר הקלפים המינימלי חייב להיות קטן או שווה למקסימלי'
        }));
        isValid = false;
      }
      if (formData.max_cards < formData.min_cards) {
        setErrors(prev => ({
          ...prev,
          max_cards: 'מספר הקלפים המקסימלי חייב להיות גדול או שווה למינימלי'
        }));
        isValid = false;
      }
    }

    return isValid;
  };

  // Note: Manual save removed - using auto-save instead

  // Handle content selection for a specific memory pair and position
  const handleContentSelection = async (setType, pairIndex, selectedContent) => {
    if (!selectedContent?.id) return;

    // Add content to cache
    setContentCache(prev => ({
      ...prev,
      [selectedContent.id]: selectedContent
    }));

    const existingPair = memoryPairs[pairIndex];

    if (existingPair && !existingPair.id.startsWith('temp-')) {
      // Update existing real pair
      const currentItems = existingPair.items || [];
      const otherItem = currentItems.find(item =>
        item.role !== (setType === 'A' ? 'pair_a' : 'pair_b')
      );
      const otherContentId = otherItem?.content_id;

      const contentIdA = setType === 'A' ? selectedContent.id : otherContentId;
      const contentIdB = setType === 'B' ? selectedContent.id : otherContentId;

      if (contentIdA && contentIdB) {
        const updatedPair = await updateMemoryPair(existingPair.id, contentIdA, contentIdB);
        if (updatedPair) {
          const newPairs = [...memoryPairs];
          newPairs[pairIndex] = updatedPair;
          setMemoryPairs(newPairs);
          setHasChanges(true);
        }
      } else {
        // Update the temporary state for incomplete pair
        const newPairs = [...memoryPairs];
        const currentItems = newPairs[pairIndex].items || [];
        const targetRole = setType === 'A' ? 'pair_a' : 'pair_b';

        // Update or add the item
        const existingItemIndex = currentItems.findIndex(item => item.role === targetRole);
        if (existingItemIndex >= 0) {
          currentItems[existingItemIndex] = { ...currentItems[existingItemIndex], content_id: selectedContent.id };
        } else {
          currentItems.push({ role: targetRole, content_id: selectedContent.id });
        }

        newPairs[pairIndex] = { ...newPairs[pairIndex], items: currentItems };
        setMemoryPairs(newPairs);
      }
    } else if (existingPair && existingPair.id.startsWith('temp-')) {
      // Handle temporary pair slot
      const currentItems = existingPair.items || [];
      const targetRole = setType === 'A' ? 'pair_a' : 'pair_b';

      // Update the temporary state
      const newItems = [...currentItems];
      const existingItemIndex = newItems.findIndex(item => item.role === targetRole);
      if (existingItemIndex >= 0) {
        newItems[existingItemIndex] = { ...newItems[existingItemIndex], content_id: selectedContent.id };
      } else {
        newItems.push({ role: targetRole, content_id: selectedContent.id });
      }

      // Check if we now have both sides to create a real pair
      const itemA = newItems.find(item => item.role === 'pair_a');
      const itemB = newItems.find(item => item.role === 'pair_b');

      if (itemA?.content_id && itemB?.content_id) {
        // Create new memory pair via API with the selected relation type
        const selectedRelationType = existingPair.relationType || 'translation'; // Use selected type or default to translation
        const newPair = await createMemoryPair(itemA.content_id, itemB.content_id, selectedRelationType);
        if (newPair) {
          const newPairs = [...memoryPairs];
          newPairs[pairIndex] = newPair;
          setMemoryPairs(newPairs);
          setHasChanges(true);
        }
      } else {
        // Update temporary state
        const newPairs = [...memoryPairs];
        newPairs[pairIndex] = { ...existingPair, items: newItems };
        setMemoryPairs(newPairs);
      }
    }

    clog(`🧠 Content selected for ${setType} side of pair ${pairIndex + 1}:`, selectedContent.id);
  };

  // Handle clearing content selection
  const handleContentCleared = async (setType, pairIndex) => {
    const existingPair = memoryPairs[pairIndex];

    if (existingPair) {
      const currentItems = existingPair.items || [];
      const otherItem = currentItems.find(item =>
        item.role !== (setType === 'A' ? 'pair_a' : 'pair_b')
      );

      if (otherItem?.content_id) {
        // Update the pair with only the other content
        const contentIdA = setType === 'A' ? null : otherItem.content_id;
        const contentIdB = setType === 'B' ? null : otherItem.content_id;

        if (contentIdA || contentIdB) {
          const updatedPair = await updateMemoryPair(existingPair.id, contentIdA, contentIdB);
          if (updatedPair) {
            const newPairs = [...memoryPairs];
            newPairs[pairIndex] = updatedPair;
            setMemoryPairs(newPairs);
            setHasChanges(true);
          }
        }
      } else {
        // Delete the entire pair if no content remains
        const success = await deleteMemoryPair(existingPair.id);
        if (success) {
          const newPairs = memoryPairs.filter((_, index) => index !== pairIndex);
          setMemoryPairs(newPairs);
          setHasChanges(true);
        }
      }
    }

    clog(`🧠 Content cleared for ${setType} side of pair ${pairIndex + 1}`);
  };

  // Get selected content for a specific memory pair and position
  const getSelectedContent = (setType, pairIndex) => {
    const pair = memoryPairs[pairIndex];
    if (!pair?.items) return null;

    const targetRole = setType === 'A' ? 'pair_a' : 'pair_b';
    const item = pair.items.find(item => item.role === targetRole);

    return item?.content_id ? getContentById(item.content_id) : null;
  };

  // Handle background image selection for card type sets
  const handleBackgroundImagesChange = async (setType, selectedImages) => {
    const fieldName = `backgroundImages${setType}`;

    // Update local state
    if (setType === 'SetA') {
      setBackgroundImagesSetA(selectedImages);
    } else if (setType === 'SetB') {
      setBackgroundImagesSetB(selectedImages);
    }

    // Update form data and trigger auto-save
    const newFormData = {
      ...formData,
      [fieldName]: selectedImages.map(img => img.id) // Store only IDs
    };

    setFormData(newFormData);
    setHasChanges(true);

    // Auto-save the background image selection
    debouncedAutoSave(newFormData);

    clog(`🎨 Background images updated for ${setType}:`, selectedImages);
  };

  // Handle card rendering mode change
  const handleCardRenderingModeChange = async (newMode) => {
    setCardRenderingMode(newMode);

    // Update form data and trigger auto-save
    const newFormData = {
      ...formData,
      cardRenderingMode: newMode
    };

    setFormData(newFormData);
    setHasChanges(true);

    // Auto-save the rendering mode change
    debouncedAutoSave(newFormData);

    clog(`🎭 Card rendering mode changed to:`, newMode);
  };


  // Handle relation type change for a specific pair
  const handleRelationTypeChange = async (pairIndex, newRelationType) => {
    const pair = memoryPairs[pairIndex];
    if (!pair) return;

    // Handle temporary pairs - just update the local state
    if (!pair.id || pair.id.startsWith('temp-')) {
      const newPairs = [...memoryPairs];
      newPairs[pairIndex] = { ...pair, relationType: newRelationType };
      setMemoryPairs(newPairs);
      clog(`🧠 Changed relation type for temporary pair ${pairIndex + 1} to:`, newRelationType);
      return;
    }

    // Handle saved pairs - update via API
    const items = pair.items || [];
    const itemA = items.find(item => item.role === 'pair_a');
    const itemB = items.find(item => item.role === 'pair_b');

    if (itemA?.content_id && itemB?.content_id) {
      const updatedPair = await updateMemoryPair(pair.relationId, itemA.content_id, itemB.content_id, newRelationType);
      if (updatedPair) {
        const newPairs = [...memoryPairs];
        newPairs[pairIndex] = updatedPair;
        setMemoryPairs(newPairs);
        setHasChanges(true);
      }
    }

    clog(`🧠 Changed relation type for pair ${pairIndex + 1} to:`, newRelationType);
  };

  // Add a new empty memory pair slot
  const addNewPairSlot = async () => {
    // Add empty slot - will be created when content is selected
    setMemoryPairs(prev => [...prev, { id: `temp-${Date.now()}`, items: [], relationType: 'translation' }]);
  };

  // Remove a memory pair
  const removePair = async (pairIndex) => {
    const pair = memoryPairs[pairIndex];

    if (pair && pair.id && !pair.id.startsWith('temp-')) {
      const success = await deleteMemoryPair(pair.id);
      if (success) {
        const newPairs = memoryPairs.filter((_, index) => index !== pairIndex);
        setMemoryPairs(newPairs);
        setHasChanges(true);
      }
    } else {
      // Remove temporary slot
      const newPairs = memoryPairs.filter((_, index) => index !== pairIndex);
      setMemoryPairs(newPairs);
    }
  };

  // Render input field based on configuration
  const renderField = (fieldName, config) => {
    const value = formData[fieldName] || '';
    const error = errors[fieldName];

    return (
      <div key={fieldName} className="space-y-2">
        <Label className="text-sm font-medium">
          {config.label}
          {config.validation?.required && <span className="text-red-500 ml-1">*</span>}
        </Label>

        {config.type === 'select' ? (
          <Select
            value={value || config.defaultValue}
            onValueChange={(newValue) => handleSelectChange(fieldName, newValue)}
            disabled={isAutoSaving || isUpdating}
          >
            <SelectTrigger className={`${error ? 'border-red-500' : ''} ${isAutoSaving ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <SelectValue placeholder="בחר אפשרות" />
            </SelectTrigger>
            <SelectContent>
              {config.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={config.type}
            value={value}
            onChange={(e) => handleChange(fieldName, e.target.value)}
            onBlur={() => handleBlur(fieldName)}
            placeholder={config.nullable ? 'ריק = ללא הגבלה' : ''}
            min={config.min}
            max={config.max}
            step={config.step}
            maxLength={config.maxLength}
            disabled={isAutoSaving || isUpdating}
            className={`${error ? 'border-red-500' : ''} ${isAutoSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
        )}

        {config.description && (
          <p className="text-xs text-gray-500">{config.description}</p>
        )}

        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <Card className="border-blue-200">
      <CardHeader className="bg-blue-50 border-b border-blue-200">
        <CardTitle className="flex items-center justify-between text-blue-800">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            הגדרות משחק זיכרון דיגיטלי
          </div>

          {/* Inline save status */}
          <div className="flex items-center gap-1">
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-1 text-blue-600">
                <div className="w-3 h-3">
                  <LudoraLoadingSpinner size="sm" />
                </div>
                <span className="text-xs font-normal">שומר...</span>
              </div>
            )}
            {saveStatus === 'saved' && lastSaved && (
              <div className="flex items-center gap-1 text-green-600">
                <Check className="w-3 h-3" />
                <span className="text-xs font-normal">נשמר</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-3 h-3" />
                <span className="text-xs font-normal">שגיאה</span>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Game Info */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-800">הגדרות משחק זיכרון</h3>
              <p className="text-sm text-blue-600">
                קונפיגורציה למשחק זיכרון דיגיטלי אינטראקטיבי
              </p>
            </div>
          </div>

          {/* Settings Form */}
          {Object.keys(settingsConfig).length > 0 ? (
            <div className="space-y-6">
              {/* Cards Numbers and Time Limit Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {renderField('min_cards', settingsConfig.min_cards)}
                {renderField('max_cards', settingsConfig.max_cards)}
                {renderField('time_limit', settingsConfig.time_limit)}
              </div>

              {/* Card Rendering Mode Selector */}
              <div className="space-y-4">
                <div className="border-t border-gray-200 pt-4">
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    מצב עיצוב קלפים
                  </Label>
                  <p className="text-xs text-gray-500 mb-4">
                    בחר כיצד יעוצבו קלפי המשחק
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Composite Cards Option */}
                    <div
                      className={`
                        p-4 border-2 rounded-lg cursor-pointer transition-all
                        ${cardRenderingMode === 'composite'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                        }
                      `}
                      onClick={() => handleCardRenderingModeChange('composite')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-4 h-4 rounded-full border-2 transition-all
                          ${cardRenderingMode === 'composite'
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-gray-300'
                          }
                        `}>
                          {cardRenderingMode === 'composite' && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">קלפים מורכבים</h4>
                          <p className="text-xs text-gray-500">תמונת רקע + תוכן מעל</p>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        המערכת תציג תמונת רקע עם התוכן הנבחר מעליה (מצב נוכחי)
                      </div>
                    </div>

                    {/* Complete Cards Option */}
                    <div
                      className={`
                        p-4 border-2 rounded-lg cursor-pointer transition-all
                        ${cardRenderingMode === 'complete'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                        }
                      `}
                      onClick={() => handleCardRenderingModeChange('complete')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-4 h-4 rounded-full border-2 transition-all
                          ${cardRenderingMode === 'complete'
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                          }
                        `}>
                          {cardRenderingMode === 'complete' && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">קלפים שלמים</h4>
                          <p className="text-xs text-gray-500">תמונות מוכנות ומעוצבות</p>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        השתמש בתמונות קלפים מוכנות עם כל העיצוב והתוכן (מצב חדש)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Semantic Types Row - Only show for composite mode */}
              {cardRenderingMode === 'composite' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderField('semanticTypeSetA', settingsConfig.semanticTypeSetA)}
                  {renderField('semanticTypeSetB', settingsConfig.semanticTypeSetB)}
                </div>
              )}

              {/* Background Images Selection - Only for composite mode */}
              {cardRenderingMode === 'composite' && formData.semanticTypeSetA && formData.semanticTypeSetB && (
                <div className="space-y-4">
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-4">
                      בחירת תמונות רקע לקלפים
                    </h4>
                    <p className="text-xs text-gray-500 mb-4">
                      בחר תמונות רקע עבור כל סוג קלף. ניתן לבחור 1-10 תמונות לכל סוג.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Background Images for Set A */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                          רקעי קלפים עבור צד א' ({settingsConfig.semanticTypeSetA?.options?.find(opt => opt.value === formData.semanticTypeSetA)?.label || formData.semanticTypeSetA})
                        </Label>
                        <BackgroundImageSelector
                          selectedImages={backgroundImagesSetA}
                          onImagesSelected={(images) => handleBackgroundImagesChange('SetA', images)}
                          minSelection={1}
                          maxSelection={10}
                          disabled={isAutoSaving || isUpdating}
                          variant="outline"
                          size="md"
                          className="w-full"
                        />
                      </div>

                      {/* Background Images for Set B */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                          רקעי קלפים עבור צד ב' ({settingsConfig.semanticTypeSetB?.options?.find(opt => opt.value === formData.semanticTypeSetB)?.label || formData.semanticTypeSetB})
                        </Label>
                        <BackgroundImageSelector
                          selectedImages={backgroundImagesSetB}
                          onImagesSelected={(images) => handleBackgroundImagesChange('SetB', images)}
                          minSelection={1}
                          maxSelection={10}
                          disabled={isAutoSaving || isUpdating}
                          variant="outline"
                          size="md"
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Option to use same backgrounds for both sets */}
                    {backgroundImagesSetA.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-700">
                              השתמש באותן תמונות רקע עבור שני סוגי הקלפים?
                            </p>
                            <p className="text-xs text-blue-600">
                              פעולה זו תעתיק את תמונות הרקע מצד א' לצד ב'
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBackgroundImagesChange('SetB', backgroundImagesSetA)}
                            disabled={isAutoSaving || isUpdating}
                            className="text-blue-700 border-blue-300 hover:bg-blue-100"
                          >
                            העתק לצד ב'
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* Memory Pairs Management */}
              {(
                (cardRenderingMode === 'composite' && formData.semanticTypeSetA && formData.semanticTypeSetB) ||
                (cardRenderingMode === 'complete') || // Always show for complete mode - no pools needed
                (memoryPairs.length > 0) // Always show if there are existing pairs
              ) && (
                <div className="space-y-4">
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">זוגות זיכרון</h4>
                      <Button
                        onClick={addNewPairSlot}
                        size="sm"
                        variant="outline"
                        disabled={isUpdating || isLoadingPairs || isAutoSaving}
                      >
                        הוסף זוג
                      </Button>
                    </div>

                    {isLoadingPairs && (
                      <div className="flex items-center justify-center p-4">
                        <div className="text-sm text-gray-500">טוען זוגות זיכרון...</div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {memoryPairs.map((pair, index) => {
                        const contentA = getSelectedContent('A', index);
                        const contentB = getSelectedContent('B', index);
                        const currentRelationType = pair.relationType || 'translation';

                        return (
                          <div key={pair.id || index} className="p-4 bg-gray-50 rounded-lg border">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-600">
                                  זוג {index + 1}
                                </span>

                                {/* Delete pair button */}
                                <Button
                                  onClick={() => removePair(index)}
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-700 p-1 h-6 w-6"
                                  disabled={isUpdating || isAutoSaving}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>

                              {/* Relation Type Selector */}
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-xs text-gray-500">סוג הקשר</span>
                                <Select
                                  value={currentRelationType}
                                  onValueChange={(value) => handleRelationTypeChange(index, value)}
                                  disabled={isUpdating || isLoadingPairs || isAutoSaving}
                                >
                                  <SelectTrigger className="w-40 h-8 text-xs">
                                    <SelectValue placeholder="בחר סוג קשר" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {relationTypes.map((type) => (
                                      <SelectItem key={type.value} value={type.value} className="text-xs">
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="flex gap-3 justify-center">
                              {/* Set A Content Selector */}
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs text-gray-500">צד א'</span>
                                {cardRenderingMode === 'composite' ? (
                                  <ContentSelector
                                    semanticType={formData.semanticTypeSetA}
                                    variant="outline"
                                    size="sm"
                                    selectedContent={contentA}
                                    onContentSelected={(content) => handleContentSelection('A', index, content)}
                                    onContentCleared={() => handleContentCleared('A', index)}
                                    disabled={isUpdating || isLoadingPairs || isAutoSaving}
                                    className="min-w-32"
                                  />
                                ) : (
                                  <ContentSelector
                                    semanticType="complete_card"
                                    selectedContent={contentA}
                                    onContentSelected={(card) => handleContentSelection('A', index, card)}
                                    onContentCleared={() => handleContentCleared('A', index)}
                                    disabled={isUpdating || isLoadingPairs || isAutoSaving}
                                    variant="outline"
                                    size="sm"
                                    className="min-w-32"
                                  />
                                )}
                              </div>

                              {/* Set B Content Selector */}
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs text-gray-500">צד ב'</span>
                                {cardRenderingMode === 'composite' ? (
                                  <ContentSelector
                                    semanticType={formData.semanticTypeSetB}
                                    variant="outline"
                                    size="sm"
                                    selectedContent={contentB}
                                    onContentSelected={(content) => handleContentSelection('B', index, content)}
                                    onContentCleared={() => handleContentCleared('B', index)}
                                    disabled={isUpdating || isLoadingPairs || isAutoSaving}
                                    className="min-w-32"
                                  />
                                ) : (
                                  <ContentSelector
                                    semanticType="complete_card"
                                    selectedContent={contentB}
                                    onContentSelected={(card) => handleContentSelection('B', index, card)}
                                    onContentCleared={() => handleContentCleared('B', index)}
                                    disabled={isUpdating || isLoadingPairs || isAutoSaving}
                                    variant="outline"
                                    size="sm"
                                    className="min-w-32"
                                  />
                                )}
                              </div>
                            </div>

                            {/* Card Image Preview Section */}
                            {cardRenderingMode === 'complete' && (contentA || contentB) && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex gap-3 justify-center">
                                  {/* Content A Preview */}
                                  <div className="flex flex-col items-center gap-2">
                                    <span className="text-xs text-gray-500">תצוגה מקדימה - צד א'</span>
                                    {contentA ? (
                                      <div className="relative">
                                        <img
                                          src={(() => {
                                            if (!contentA?.value) return null;
                                            const imageValue = contentA.value;
                                            // If it's already an absolute URL, return as-is
                                            if (imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
                                              return imageValue;
                                            }
                                            // If it starts with /api/, prepend the API base URL (removing /api from base)
                                            if (imageValue.startsWith('/api/')) {
                                              const apiBase = getApiBase();
                                              const baseWithoutApi = apiBase.replace(/\/api$/, '');
                                              return `${baseWithoutApi}${imageValue}`;
                                            }
                                            // Otherwise, treat as a relative path and prepend full API base
                                            return `${getApiBase()}${imageValue.startsWith('/') ? '' : '/'}${imageValue}`;
                                          })()}
                                          alt={contentA.metadata?.description || contentA.name || 'קלף א\''}
                                          className="w-16 h-16 object-cover rounded border-2 border-blue-200"
                                          onError={(e) => {
                                            cerror('❌ Failed to load preview image A:', contentA);
                                            e.target.style.display = 'none';
                                            e.target.nextElementSibling.style.display = 'flex';
                                          }}
                                        />
                                        <div className="w-16 h-16 bg-gray-100 rounded border-2 border-blue-200 flex items-center justify-center" style={{display: 'none'}}>
                                          <span className="text-xs text-gray-500">תמונה</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="w-16 h-16 bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                                        <span className="text-xs text-gray-400">ריק</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* VS indicator */}
                                  <div className="flex items-center justify-center">
                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                      <span className="text-xs font-bold text-gray-600">VS</span>
                                    </div>
                                  </div>

                                  {/* Content B Preview */}
                                  <div className="flex flex-col items-center gap-2">
                                    <span className="text-xs text-gray-500">תצוגה מקדימה - צד ב'</span>
                                    {contentB ? (
                                      <div className="relative">
                                        <img
                                          src={(() => {
                                            if (!contentB?.value) return null;
                                            const imageValue = contentB.value;
                                            // If it's already an absolute URL, return as-is
                                            if (imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
                                              return imageValue;
                                            }
                                            // If it starts with /api/, prepend the API base URL (removing /api from base)
                                            if (imageValue.startsWith('/api/')) {
                                              const apiBase = getApiBase();
                                              const baseWithoutApi = apiBase.replace(/\/api$/, '');
                                              return `${baseWithoutApi}${imageValue}`;
                                            }
                                            // Otherwise, treat as a relative path and prepend full API base
                                            return `${getApiBase()}${imageValue.startsWith('/') ? '' : '/'}${imageValue}`;
                                          })()}
                                          alt={contentB.metadata?.description || contentB.name || 'קלף ב\''}
                                          className="w-16 h-16 object-cover rounded border-2 border-green-200"
                                          onError={(e) => {
                                            cerror('❌ Failed to load preview image B:', contentB);
                                            e.target.style.display = 'none';
                                            e.target.nextElementSibling.style.display = 'flex';
                                          }}
                                        />
                                        <div className="w-16 h-16 bg-gray-100 rounded border-2 border-green-200 flex items-center justify-center" style={{display: 'none'}}>
                                          <span className="text-xs text-gray-500">תמונה</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="w-16 h-16 bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                                        <span className="text-xs text-gray-400">ריק</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Pair Status */}
                            {pair.id && !pair.id.startsWith('temp-') && (
                              <div className="mt-2 text-xs text-center">
                                <span className="text-green-600">
                                  ✓ זוג שמור - {relationTypes.find(t => t.value === currentRelationType)?.label}
                                </span>
                              </div>
                            )}
                            {(!pair.id || pair.id.startsWith('temp-')) && (
                              <div className="mt-2 text-xs text-center">
                                <span className="text-amber-600">
                                  ⏳ זוג זמני - יישמר כאשר שני הצדדים יוגדרו
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {memoryPairs.length === 0 && !isLoadingPairs && (
                        <div className="text-center p-4 text-gray-500 text-sm">
                          אין זוגות זיכרון. לחץ על "הוסף זוג" ליצירת זוג ראשון.
                        </div>
                      )}
                    </div>

                    {/* Memory Pairs Progress */}
                    {memoryPairs.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-700 font-medium">סטטוס זוגות זיכרון:</span>
                          <div className="flex gap-4">
                            <span className="text-blue-600">
                              זוגות: {memoryPairs.length}
                            </span>
                            <span className="text-blue-600">
                              זוגות שלמים: {memoryPairs.filter(pair => {
                                if (!pair.id || pair.id.startsWith('temp-')) return false;
                                const itemA = pair.items?.find(item => item.role === 'pair_a');
                                const itemB = pair.items?.find(item => item.role === 'pair_b');
                                return itemA?.content_id && itemB?.content_id;
                              }).length}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-2">
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: memoryPairs.length > 0 ? `${Math.min(
                                  100,
                                  (memoryPairs.filter(pair => {
                                    if (!pair.id || pair.id.startsWith('temp-')) return false;
                                    const itemA = pair.items?.find(item => item.role === 'pair_a');
                                    const itemB = pair.items?.find(item => item.role === 'pair_b');
                                    return itemA?.content_id && itemB?.content_id;
                                  }).length / memoryPairs.filter(p => p.id && !p.id.startsWith('temp-')).length) * 100
                                )}%` : '0%'
                              }}
                            />
                          </div>
                          <p className="text-xs text-blue-600 mt-1 text-center">
                            {memoryPairs.filter(pair => {
                              if (!pair.id || pair.id.startsWith('temp-')) return false;
                              const itemA = pair.items?.find(item => item.role === 'pair_a');
                              const itemB = pair.items?.find(item => item.role === 'pair_b');
                              return itemA?.content_id && itemB?.content_id;
                            }).length} / {memoryPairs.filter(p => p.id && !p.id.startsWith('temp-')).length} זוגות מוגדרים
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                לא נטענו הגדרות המשחק. יש לוודא שההגדרות הגלובליות נטענו כראוי.
              </AlertDescription>
            </Alert>
          )}

          {/* Subtle Auto-Save Status */}
          {Object.keys(settingsConfig).length > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {saveStatus === 'saving' && (
                    <div className="flex items-center gap-1 text-blue-500">
                      <div className="w-3 h-3">
                        <LudoraLoadingSpinner size="sm" />
                      </div>
                      <span className="text-xs">שומר</span>
                    </div>
                  )}
                  {saveStatus === 'saved' && lastSaved && (
                    <div className="flex items-center gap-1 text-green-500">
                      <Check className="w-3 h-3" />
                      <span className="text-xs">נשמר {lastSaved.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  {saveStatus === 'error' && (
                    <div className="flex items-center gap-1 text-red-500">
                      <AlertCircle className="w-3 h-3" />
                      <span className="text-xs">שגיאה</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-400">
                  שמירה אוטומטית
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MemoryGameSettingsDigital;