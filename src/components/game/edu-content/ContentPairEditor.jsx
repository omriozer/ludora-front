/**
 * ContentPairEditor - Modal for creating/editing content pairs
 *
 * Allows selecting two EduContent items to create an EduContentUse pair
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, AlertTriangle, ArrowLeftRight, Image, Type, Layers, Settings } from 'lucide-react';
import { GameContent } from '@/services/apiClient';
import { showSuccess, showError } from '@/utils/messaging';
import ContentSelector from './ContentSelector';
import ContentDisplay from './ContentDisplay';
import CompositeCardDisplay from './CompositeCardDisplay';
import CompositeCardStylesEditor, { DEFAULT_STYLES } from './CompositeCardStylesEditor';

// Helper functions for pair type detection
const isData = (content) => content?.element_type === 'data';
const isBg = (content) => content?.element_type === 'playing_card_bg';
const isComplete = (content) => content?.element_type === 'playing_card_complete';


const getPairType = (contentA, contentB) => {
  if (!contentA || !contentB) return null;

  if ((isBg(contentA) && isData(contentB)) || (isData(contentA) && isBg(contentB))) {
    return 'composite_card';
  }
  if (isData(contentA) && isData(contentB)) {
    return 'text_pair';
  }
  if (isComplete(contentA) && isComplete(contentB)) {
    return 'image_pair';
  }
  return 'mixed_pair';
};

const getPairTypeInfo = (pairType) => {
  const typeInfo = {
    composite_card: {
      label: 'קלף משולב',
      description: 'רקע תמונה עם טקסט - יופיע כקלף אחד במשחק',
      icon: Layers,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    text_pair: {
      label: 'זוג טקסט',
      description: 'שני קלפי טקסט להתאמה במשחק הזיכרון',
      icon: Type,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    image_pair: {
      label: 'זוג תמונות',
      description: 'שני קלפי תמונה להתאמה במשחק הזיכרון',
      icon: Image,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    mixed_pair: {
      label: 'זוג מעורב',
      description: 'שני קלפים שונים להתאמה במשחק הזיכרון',
      icon: ArrowLeftRight,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
  };

  return typeInfo[pairType] || null;
};

const ContentPairEditor = ({
  isOpen,
  onClose,
  onSave,
  gameId,
  contentUse = null, // For editing existing pairs
  mode = 'create' // 'create' or 'edit'
}) => {
  const [contentA, setContentA] = useState(null);
  const [contentB, setContentB] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Sub-pair creation states
  const [pendingBgA, setPendingBgA] = useState(null); // Pending bg for Card A
  const [pendingBgB, setPendingBgB] = useState(null); // Pending bg for Card B
  const [pendingDataA, setPendingDataA] = useState(null); // Pending data for Card A
  const [pendingDataB, setPendingDataB] = useState(null); // Pending data for Card B
  const [showDataSelectorA, setShowDataSelectorA] = useState(false);
  const [showDataSelectorB, setShowDataSelectorB] = useState(false);
  const [showBgSelectorA, setShowBgSelectorA] = useState(false);
  const [showBgSelectorB, setShowBgSelectorB] = useState(false);
  const [createdSubPairs, setCreatedSubPairs] = useState([]); // Track created sub-pairs for cleanup

  // Styles editor states
  const [showStylesEditor, setShowStylesEditor] = useState(false);
  const [editingCard, setEditingCard] = useState(null); // 'A' or 'B'
  const [cardAStyles, setCardAStyles] = useState(null);
  const [cardBStyles, setCardBStyles] = useState(null);

  // Direct content selector triggers
  const [showContentSelectorA, setShowContentSelectorA] = useState(false);
  const [showContentSelectorB, setShowContentSelectorB] = useState(false);

  // Calculate current pair type
  const pairType = getPairType(contentA, contentB);
  const pairTypeInfo = getPairTypeInfo(pairType);

  // Load existing content when editing
  useEffect(() => {
    if (mode === 'edit' && contentUse && contentUse.contentItems) {
      const items = contentUse.contentItems;
      if (items.length === 2) {
        // Check if items are sub-pairs and convert them to the proper format
        const processItem = (item, index) => {
          // If item has _source = 'eduContentUse', it's a sub-pair
          if (item._source === 'eduContentUse' && item.contentItems) {
            // This is a sub-pair, extract its components
            const subItems = item.contentItems;
            if (subItems.length === 2) {
              const bgContent = subItems.find(subItem => subItem.element_type === 'playing_card_bg');
              const dataContent = subItems.find(subItem => subItem.element_type === 'data');

              if (bgContent && dataContent) {
                // Extract textStyles from usage_metadata
                const textStyles = item.usage_metadata?.textStyles;

                // Set the styles for the appropriate card
                if (index === 0 && textStyles) {
                  setCardAStyles(textStyles);
                } else if (index === 1 && textStyles) {
                  setCardBStyles(textStyles);
                }

                return {
                  id: item.id,
                  isSubPair: true,
                  element_type: 'composite_card',
                  content: `${bgContent.content} + ${dataContent.content}`,
                  bgContent: bgContent,
                  dataContent: dataContent,
                  textStyles: textStyles, // Include the styles in the content object
                  _source: 'eduContentUse'
                };
              }
            }
          }

          // Regular content item
          return item;
        };

        setContentA(processItem(items[0], 0));
        setContentB(processItem(items[1], 1));
      }
    } else if (mode === 'create') {
      setContentA(null);
      setContentB(null);
    }
  }, [mode, contentUse]);

  const handleClose = async () => {
    if (!isSaving) {
      // Clean up any created sub-pairs before closing
      await cleanupSubPairs();
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    if (mode === 'create') {
      setContentA(null);
      setContentB(null);
    }
    setError('');

    // Clean up any pending states
    setPendingBgA(null);
    setPendingBgB(null);
    setPendingDataA(null);
    setPendingDataB(null);
    setShowDataSelectorA(false);
    setShowDataSelectorB(false);
    setShowBgSelectorA(false);
    setShowBgSelectorB(false);

    // Clean up direct content selector states
    setShowContentSelectorA(false);
    setShowContentSelectorB(false);
  };

  // Handle Card A selection with bg auto-pairing and data auto-pairing
  const handleContentAChange = async (content) => {
    if (!content) {
      setContentA(null);
      setPendingBgA(null);
      setPendingDataA(null);
      setShowDataSelectorA(false);
      setShowBgSelectorA(false);
      return;
    }

    if (isBg(content)) {
      // Selected bg - force data selection to create sub-pair
      setPendingBgA(content);
      setShowDataSelectorA(true);
      setShowBgSelectorA(false);
      setPendingDataA(null);
      setContentA(null); // Don't set it yet, wait for complete sub-pair
    } else if (isData(content)) {
      // Selected data - force bg selection to create sub-pair
      setPendingDataA(content);
      setShowBgSelectorA(true);
      setShowDataSelectorA(false);
      setPendingBgA(null);
      setContentA(null); // Don't set it yet, wait for complete sub-pair
    } else {
      // Selected regular content (complete cards)
      setContentA(content);
      setPendingBgA(null);
      setPendingDataA(null);
      setShowDataSelectorA(false);
      setShowBgSelectorA(false);
    }
  };

  // Handle Card B selection with bg auto-pairing and data auto-pairing
  const handleContentBChange = async (content) => {
    if (!content) {
      setContentB(null);
      setPendingBgB(null);
      setPendingDataB(null);
      setShowDataSelectorB(false);
      setShowBgSelectorB(false);
      return;
    }

    if (isBg(content)) {
      // Selected bg - force data selection to create sub-pair
      setPendingBgB(content);
      setShowDataSelectorB(true);
      setShowBgSelectorB(false);
      setPendingDataB(null);
      setContentB(null); // Don't set it yet, wait for complete sub-pair
    } else if (isData(content)) {
      // Selected data - force bg selection to create sub-pair
      setPendingDataB(content);
      setShowBgSelectorB(true);
      setShowDataSelectorB(false);
      setPendingBgB(null);
      setContentB(null); // Don't set it yet, wait for complete sub-pair
    } else {
      // Selected regular content (complete cards)
      setContentB(content);
      setPendingBgB(null);
      setPendingDataB(null);
      setShowDataSelectorB(false);
      setShowBgSelectorB(false);
    }
  };

  // Handle data selection for Card A sub-pair
  const handleDataForA = async (dataContent) => {
    if (!dataContent || !pendingBgA) return;

    // Validate element types before API call
    if (pendingBgA.element_type !== 'playing_card_bg') {
      const errorMsg = 'רקע הקלף חייב להיות מסוג "רקע קלף" (playing_card_bg)';
      setError(errorMsg);
      showError('שגיאת אימות', errorMsg);
      return;
    }

    if (dataContent.element_type !== 'data') {
      const errorMsg = 'התוכן חייב להיות מסוג "טקסט" (data)';
      setError(errorMsg);
      showError('שגיאת אימות', errorMsg);
      return;
    }

    // Validate that background has a file
    if (!pendingBgA.fileUrl && !pendingBgA.content_metadata?.file_info?.s3_key) {
      const errorMsg = 'רקע התמונה חייב לכלול קובץ תמונה';
      setError(errorMsg);
      showError('שגיאת אימות', errorMsg);
      return;
    }

    try {
      setIsSaving(true);

      // Create sub-pair automatically using new object format
      const subPair = await GameContent.createContentUse(gameId, {
        use_type: 'mixed_edu_contents',
        contents: [
          { id: pendingBgA.id, source: 'eduContent' },
          { id: dataContent.id, source: 'eduContent' }
        ],
        usage_metadata: {
          textStyles: DEFAULT_STYLES
        }
      });

      // Track sub-pair for cleanup
      setCreatedSubPairs(prev => [...prev, subPair.id]);

      // Set the sub-pair as Card A
      setContentA({
        id: subPair.id,
        isSubPair: true,
        element_type: 'composite_card',
        content: `${pendingBgA.content} + ${dataContent.content}`,
        bgContent: pendingBgA,
        dataContent: dataContent
      });

      // Clean up pending state
      setPendingBgA(null);
      setShowDataSelectorA(false);

    } catch (error) {
      console.error('Error creating sub-pair for Card A:', error);
      const errorMsg = error.message || 'שגיאה לא ידועה';
      setError(`שגיאה ביצירת קלף משולב עבור קלף א': ${errorMsg}`);
      showError('שגיאה', `לא הצלחנו ליצור קלף משולב: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle bg selection for Card A sub-pair (when data was selected first)
  const handleBgForA = async (bgContent) => {
    if (!bgContent || !pendingDataA) return;

    // Validate element types before API call
    if (bgContent.element_type !== 'playing_card_bg') {
      const errorMsg = 'רקע הקלף חייב להיות מסוג "רקע קלף" (playing_card_bg)';
      setError(errorMsg);
      showError('שגיאת אימות', errorMsg);
      return;
    }

    if (pendingDataA.element_type !== 'data') {
      const errorMsg = 'התוכן חייב להיות מסוג "טקסט" (data)';
      setError(errorMsg);
      showError('שגיאת אימות', errorMsg);
      return;
    }

    // Validate that background has a file
    if (!bgContent.fileUrl && !bgContent.content_metadata?.file_info?.s3_key) {
      const errorMsg = 'רקע התמונה חייב לכלול קובץ תמונה';
      setError(errorMsg);
      showError('שגיאת אימות', errorMsg);
      return;
    }

    try {
      setIsSaving(true);

      // Create sub-pair automatically using new object format
      const subPair = await GameContent.createContentUse(gameId, {
        use_type: 'mixed_edu_contents',
        contents: [
          { id: bgContent.id, source: 'eduContent' },
          { id: pendingDataA.id, source: 'eduContent' }
        ],
        usage_metadata: {
          textStyles: DEFAULT_STYLES
        }
      });

      // Track sub-pair for cleanup
      setCreatedSubPairs(prev => [...prev, subPair.id]);

      // Set the sub-pair as Card A
      setContentA({
        id: subPair.id,
        isSubPair: true,
        element_type: 'composite_card',
        content: `${bgContent.content} + ${pendingDataA.content}`,
        bgContent: bgContent,
        dataContent: pendingDataA
      });

      // Clean up pending state
      setPendingDataA(null);
      setShowBgSelectorA(false);

    } catch (error) {
      console.error('Error creating sub-pair for Card A:', error);
      const errorMsg = error.message || 'שגיאה לא ידועה';
      setError(`שגיאה ביצירת קלף משולב עבור קלף א': ${errorMsg}`);
      showError('שגיאה', `לא הצלחנו ליצור קלף משולב: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle bg selection for Card B sub-pair (when data was selected first)
  const handleBgForB = async (bgContent) => {
    if (!bgContent || !pendingDataB) return;

    // Validate element types before API call
    if (bgContent.element_type !== 'playing_card_bg') {
      const errorMsg = 'רקע הקלף חייב להיות מסוג "רקע קלף" (playing_card_bg)';
      setError(errorMsg);
      showError('שגיאת אימות', errorMsg);
      return;
    }

    if (pendingDataB.element_type !== 'data') {
      const errorMsg = 'התוכן חייב להיות מסוג "טקסט" (data)';
      setError(errorMsg);
      showError('שגיאת אימות', errorMsg);
      return;
    }

    // Validate that background has a file
    if (!bgContent.fileUrl && !bgContent.content_metadata?.file_info?.s3_key) {
      const errorMsg = 'רקע התמונה חייב לכלול קובץ תמונה';
      setError(errorMsg);
      showError('שגיאת אימות', errorMsg);
      return;
    }

    try {
      setIsSaving(true);

      // Create sub-pair automatically using new object format
      const subPair = await GameContent.createContentUse(gameId, {
        use_type: 'mixed_edu_contents',
        contents: [
          { id: bgContent.id, source: 'eduContent' },
          { id: pendingDataB.id, source: 'eduContent' }
        ],
        usage_metadata: {
          textStyles: DEFAULT_STYLES
        }
      });

      // Track sub-pair for cleanup
      setCreatedSubPairs(prev => [...prev, subPair.id]);

      // Set the sub-pair as Card B
      setContentB({
        id: subPair.id,
        isSubPair: true,
        element_type: 'composite_card',
        content: `${bgContent.content} + ${pendingDataB.content}`,
        bgContent: bgContent,
        dataContent: pendingDataB
      });

      // Clean up pending state
      setPendingDataB(null);
      setShowBgSelectorB(false);

    } catch (error) {
      console.error('Error creating sub-pair for Card B:', error);
      const errorMsg = error.message || 'שגיאה לא ידועה';
      setError(`שגיאה ביצירת קלף משולב עבור קלף ב': ${errorMsg}`);
      showError('שגיאה', `לא הצלחנו ליצור קלף משולב: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle data selection for Card B sub-pair
  const handleDataForB = async (dataContent) => {
    if (!dataContent || !pendingBgB) return;

    // Validate element types before API call
    if (pendingBgB.element_type !== 'playing_card_bg') {
      const errorMsg = 'רקע הקלף חייב להיות מסוג "רקע קלף" (playing_card_bg)';
      setError(errorMsg);
      showError('שגיאת אימות', errorMsg);
      return;
    }

    if (dataContent.element_type !== 'data') {
      const errorMsg = 'התוכן חייב להיות מסוג "טקסט" (data)';
      setError(errorMsg);
      showError('שגיאת אימות', errorMsg);
      return;
    }

    // Validate that background has a file
    if (!pendingBgB.fileUrl && !pendingBgB.content_metadata?.file_info?.s3_key) {
      const errorMsg = 'רקע התמונה חייב לכלול קובץ תמונה';
      setError(errorMsg);
      showError('שגיאת אימות', errorMsg);
      return;
    }

    try {
      setIsSaving(true);

      // Create sub-pair automatically using new object format
      const subPair = await GameContent.createContentUse(gameId, {
        use_type: 'mixed_edu_contents',
        contents: [
          { id: pendingBgB.id, source: 'eduContent' },
          { id: dataContent.id, source: 'eduContent' }
        ],
        usage_metadata: {
          textStyles: DEFAULT_STYLES
        }
      });

      // Track sub-pair for cleanup
      setCreatedSubPairs(prev => [...prev, subPair.id]);

      // Set the sub-pair as Card B
      setContentB({
        id: subPair.id,
        isSubPair: true,
        element_type: 'composite_card',
        content: `${pendingBgB.content} + ${dataContent.content}`,
        bgContent: pendingBgB,
        dataContent: dataContent
      });

      // Clean up pending state
      setPendingBgB(null);
      setShowDataSelectorB(false);

    } catch (error) {
      console.error('Error creating sub-pair for Card B:', error);
      const errorMsg = error.message || 'שגיאה לא ידועה';
      setError(`שגיאה ביצירת קלף משולב עבור קלף ב': ${errorMsg}`);
      showError('שגיאה', `לא הצלחנו ליצור קלף משולב: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle opening styles editor for a card
  const handleOpenStylesEditor = (cardLetter) => {
    setEditingCard(cardLetter);
    setShowStylesEditor(true);
  };

  // Handle saving styles for a card
  const handleSaveStyles = async (newStyles) => {
    if (!editingCard) return;

    try {
      const isCardA = editingCard === 'A';
      const targetCard = isCardA ? contentA : contentB;

      if (targetCard?.isSubPair) {
        // Reconstruct the contents array from bgContent and dataContent
        const contents = [
          { id: targetCard.bgContent.id, source: 'eduContent' },
          { id: targetCard.dataContent.id, source: 'eduContent' }
        ];

        // Update the sub-pair with both contents and usage_metadata (backend requires both)
        await GameContent.updateContentUse(gameId, targetCard.id, {
          contents: contents,
          usage_metadata: {
            textStyles: newStyles
          }
        });

        // Update local state
        if (isCardA) {
          setCardAStyles(newStyles);
          // Update the contentA object to include the new styles
          setContentA(prev => ({
            ...prev,
            textStyles: newStyles
          }));
        } else {
          setCardBStyles(newStyles);
          // Update the contentB object to include the new styles
          setContentB(prev => ({
            ...prev,
            textStyles: newStyles
          }));
        }

        showSuccess('נשמר בהצלחה', 'עיצוב הטקסט נשמר בהצלחה');
      } else {
        console.warn('⚠️ Target card is not a sub-pair, cannot save styles');
        showError('שגיאה', 'ניתן לערוך עיצוב רק עבור קלפים משולבים');
      }
    } catch (error) {
      console.error('❌ Error saving styles:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        stack: error.stack
      });

      // Show more specific error message
      const errorMessage = error.message || 'שגיאה לא ידועה';
      showError('שגיאה בשמירת עיצוב', `לא הצלחנו לשמור את עיצוב הטקסט: ${errorMessage}`);
    }
  };

  // Clean up created sub-pairs if user cancels
  const cleanupSubPairs = async () => {
    for (const subPairId of createdSubPairs) {
      try {
        await GameContent.deleteContentUse(gameId, subPairId);
      } catch (error) {
        console.error('Error cleaning up sub-pair:', error);
      }
    }
    setCreatedSubPairs([]);
  };

  const validatePair = () => {
    if (!contentA) {
      setError('יש לבחור תוכן עבור קלף א\'');
      return false;
    }

    if (!contentB) {
      setError('יש לבחור תוכן עבור קלף ב\'');
      return false;
    }

    // Allow identical pairs - removed restriction

    return true;
  };

  const handleSave = async () => {
    if (!validatePair()) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      let savedContentUse;

      // Determine content objects with proper sources
      const contentAObj = {
        id: contentA.id,
        source: contentA.isSubPair ? 'eduContentUse' : 'eduContent'
      };
      const contentBObj = {
        id: contentB.id,
        source: contentB.isSubPair ? 'eduContentUse' : 'eduContent'
      };

      if (mode === 'create') {
        // Create new content pair using new object format
        savedContentUse = await GameContent.createContentUse(gameId, {
          use_type: 'pair',
          contents: [contentAObj, contentBObj]
        });

        showSuccess('נוצר בהצלחה', 'זוג תוכן נוצר בהצלחה');
      } else {
        // Update existing content pair using new object format
        savedContentUse = await GameContent.updateContentUse(gameId, contentUse.id, {
          contents: [contentAObj, contentBObj]
        });

        showSuccess('עודכן בהצלחה', 'זוג התוכן עודכן בהצלחה');
      }

      // Clear created sub-pairs tracking since they're now saved
      setCreatedSubPairs([]);

      if (onSave) {
        onSave(savedContentUse);
      }

      resetForm();
      onClose();

    } catch (error) {
      console.error('Error saving content pair:', error);
      setError(error.message || 'שגיאה בשמירת זוג התוכן');
      showError('שגיאה', error.message || 'לא הצלחנו לשמור את זוג התוכן');
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = contentA && contentB && !isSaving;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {mode === 'create' ? (
              <>
                <Plus className="w-5 h-5" />
                {pairTypeInfo ? `יצירת ${pairTypeInfo.label}` : 'יצירת זוג תוכן חדש'}
              </>
            ) : (
              <>
                <Edit className="w-5 h-5" />
                {pairTypeInfo ? `עריכת ${pairTypeInfo.label}` : 'עריכת זוג תוכן'}
              </>
            )}

            {/* Show mini composite preview in title for composite cards */}
            {(contentA?.isSubPair || contentB?.isSubPair) && (
              <div className="flex items-center gap-2 mr-auto">
                {contentA?.isSubPair && (
                  <CompositeCardDisplay
                    bgContent={contentA.bgContent}
                    dataContent={contentA.dataContent}
                    size="sm"
                    className="w-8 h-8"
                    customStyles={cardAStyles || contentA.textStyles}
                  />
                )}
                {contentB?.isSubPair && (
                  <CompositeCardDisplay
                    bgContent={contentB.bgContent}
                    dataContent={contentB.dataContent}
                    size="sm"
                    className="w-8 h-8"
                    customStyles={cardBStyles || contentB.textStyles}
                  />
                )}
              </div>
            )}
          </DialogTitle>

          <DialogDescription className="flex items-center gap-3">
            <div>
              {mode === 'create' ? (
                pairTypeInfo ? pairTypeInfo.description : 'בחר שני פריטי תוכן ליצירת זוג למשחק הזיכרון'
              ) : (
                pairTypeInfo ? `ערוך את ${pairTypeInfo.label.toLowerCase()}` : 'ערוך את פריטי התוכן בזוג'
              )}
            </div>

            {/* Show composite description with mini preview */}
            {(contentA?.isSubPair || contentB?.isSubPair) && (
              <div className="flex items-center gap-2 text-xs text-purple-600">
                {contentA?.isSubPair && (
                  <span>{contentA.bgContent?.content} + {contentA.dataContent?.content}</span>
                )}
                {contentA?.isSubPair && contentB?.isSubPair && <span>•</span>}
                {contentB?.isSubPair && (
                  <span>{contentB.bgContent?.content} + {contentB.dataContent?.content}</span>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Content Selection Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Content A Selector */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">קלף א'</div>
              {!showDataSelectorA && !showBgSelectorA ? (
                <ContentSelector
                  value={contentA}
                  onChange={handleContentAChange}
                  placeholder="בחר תוכן לקלף א'"
                  excludeIds={[]}
                  label=""
                />
              ) : showDataSelectorA ? (
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="text-sm font-medium text-purple-800">
                      נבחר רקע תמונה: {pendingBgA?.content}
                    </div>
                    <div className="text-sm text-purple-600 mt-1">
                      כעת בחר תוכן טקסט להשלמת הקלף המשולב
                    </div>
                  </div>
                  <ContentSelector
                    value={null}
                    onChange={handleDataForA}
                    placeholder="בחר תוכן טקסט לקלף המשולב"
                    excludeIds={[]}
                    elementTypes={['data']}
                    label="תוכן טקסט נדרש"
                  />
                  <Button
                    onClick={() => {
                      setPendingBgA(null);
                      setShowDataSelectorA(false);
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    ביטול יצירת קלף משולב
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="text-sm font-medium text-purple-800">
                      נבחר תוכן טקסט: {pendingDataA?.content}
                    </div>
                    <div className="text-sm text-purple-600 mt-1">
                      כעת בחר רקע תמונה להשלמת הקלף המשולב
                    </div>
                  </div>
                  <ContentSelector
                    value={null}
                    onChange={handleBgForA}
                    placeholder="בחר רקע תמונה לקלף המשולב"
                    excludeIds={[]}
                    elementTypes={['playing_card_bg']}
                    label="רקע תמונה נדרש"
                  />
                  <Button
                    onClick={() => {
                      setPendingDataA(null);
                      setShowBgSelectorA(false);
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    ביטול יצירת קלף משולב
                  </Button>
                </div>
              )}
            </div>

            {/* Visual Separator & Pair Type Indicator */}
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                {pairTypeInfo ? (
                  <div className={`p-3 rounded-full ${pairTypeInfo.bgColor} ${pairTypeInfo.borderColor} border-2`}>
                    <pairTypeInfo.icon className={`w-6 h-6 ${pairTypeInfo.color}`} />
                  </div>
                ) : (
                  <ArrowLeftRight className="w-8 h-8 text-gray-400" />
                )}

                <div className="text-center">
                  {pairTypeInfo ? (
                    <>
                      <div className={`text-sm font-semibold ${pairTypeInfo.color}`}>
                        {pairTypeInfo.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 max-w-24 leading-tight">
                        {pairType === 'composite_card' ? 'קלף אחד' :
                         pairType === 'text_pair' ? 'שני קלפי טקסט' :
                         pairType === 'image_pair' ? 'שני קלפי תמונה' : 'שני קלפים'}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-500 font-medium">זוג</div>
                  )}
                </div>
              </div>
            </div>

            {/* Content B Selector */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">קלף ב'</div>
              {!showDataSelectorB && !showBgSelectorB ? (
                <ContentSelector
                  value={contentB}
                  onChange={handleContentBChange}
                  placeholder="בחר תוכן לקלף ב'"
                  excludeIds={[]}
                  label=""
                />
              ) : showDataSelectorB ? (
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="text-sm font-medium text-purple-800">
                      נבחר רקע תמונה: {pendingBgB?.content}
                    </div>
                    <div className="text-sm text-purple-600 mt-1">
                      כעת בחר תוכן טקסט להשלמת הקלף המשולב
                    </div>
                  </div>
                  <ContentSelector
                    value={null}
                    onChange={handleDataForB}
                    placeholder="בחר תוכן טקסט לקלף המשולב"
                    excludeIds={[]}
                    elementTypes={['data']}
                    label="תוכן טקסט נדרש"
                  />
                  <Button
                    onClick={() => {
                      setPendingBgB(null);
                      setShowDataSelectorB(false);
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    ביטול יצירת קלף משולב
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="text-sm font-medium text-purple-800">
                      נבחר תוכן טקסט: {pendingDataB?.content}
                    </div>
                    <div className="text-sm text-purple-600 mt-1">
                      כעת בחר רקע תמונה להשלמת הקלף המשולב
                    </div>
                  </div>
                  <ContentSelector
                    value={null}
                    onChange={handleBgForB}
                    placeholder="בחר רקע תמונה לקלף המשולב"
                    excludeIds={[]}
                    elementTypes={['playing_card_bg']}
                    label="רקע תמונה נדרש"
                  />
                  <Button
                    onClick={() => {
                      setPendingDataB(null);
                      setShowBgSelectorB(false);
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    ביטול יצירת קלף משולב
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Sub-pair Status Display */}
          {(showDataSelectorA || showDataSelectorB || showBgSelectorA || showBgSelectorB) && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-sm font-medium text-purple-800 mb-2">🔧 יצירת קלף משולב</div>
              <div className="text-sm text-purple-700">
                {showDataSelectorA && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                    ממתין לבחירת תוכן טקסט לקלף א'...
                  </div>
                )}
                {showBgSelectorA && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                    ממתין לבחירת רקע תמונה לקלף א'...
                  </div>
                )}
                {showDataSelectorB && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                    ממתין לבחירת תוכן טקסט לקלף ב'...
                  </div>
                )}
                {showBgSelectorB && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                    ממתין לבחירת רקע תמונה לקלף ב'...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview Area */}
          {(contentA || contentB) && (
            <div className="border-t pt-6">
              <div className="text-sm font-medium text-gray-700 mb-3">
                תצוגה מקדימה
                {pairTypeInfo && (
                  <span className={`mr-2 text-xs ${pairTypeInfo.color}`}>
                    ({pairTypeInfo.label})
                  </span>
                )}
              </div>

              {/* Preview Cards */}
              <div className="flex items-center gap-6 justify-center">
                {/* Preview A */}
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-2">קלף א'</div>
                  {contentA ? (
                    contentA.isSubPair ? (
                      /* Sub-pair composite card preview */
                      <CompositeCardDisplay
                        bgContent={contentA.bgContent}
                        dataContent={contentA.dataContent}
                        size="lg"
                        className="mx-auto"
                        customStyles={cardAStyles || contentA.textStyles}
                      />
                    ) : (
                      /* Regular content preview */
                      <ContentDisplay
                        content={contentA}
                        size="lg"
                        className="mx-auto"
                      />
                    )
                  ) : (
                    <div
                      className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
                      onClick={() => {
                        // Trigger the content selector for Card A
                        setShowContentSelectorA(true);
                      }}
                      title="לחץ כאן כדי לבחור תוכן לקלף א'"
                    >
                      <div className="text-center">
                        <div className="text-gray-400 mb-2 group-hover:text-blue-500">
                          <Plus className="w-6 h-6 mx-auto" />
                        </div>
                        <span className="text-gray-500 text-xs group-hover:text-blue-600 font-medium">לחץ לבחירת תוכן</span>
                        <div className="text-xs text-gray-400 mt-1 group-hover:text-blue-500">עבור קלף א'</div>
                      </div>
                    </div>
                  )}
                  {contentA?.isSubPair && (
                    <div className="text-xs text-purple-600 mt-1 font-medium">
                      קלף משולב
                    </div>
                  )}
                  {contentA?.isSubPair && (
                    <Button
                      onClick={() => handleOpenStylesEditor('A')}
                      variant="outline"
                      size="sm"
                      className="mt-2 text-xs h-7 px-2"
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      עיצוב טקסט
                    </Button>
                  )}
                </div>

                {/* Arrow or Match Indicator */}
                <div className="flex flex-col items-center mt-6">
                  {pairTypeInfo ? (
                    <pairTypeInfo.icon className={`w-6 h-6 ${pairTypeInfo.color}`} />
                  ) : (
                    <ArrowLeftRight className="w-6 h-6 text-gray-400" />
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {pairType === 'composite_card' ? 'קלף אחד' :
                     pairType === 'text_pair' ? 'להתאמה' :
                     pairType === 'image_pair' ? 'להתאמה' :
                     pairType === 'mixed_pair' ? 'להתאמה' : 'זוג'}
                  </div>
                </div>

                {/* Preview B */}
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-2">קלף ב'</div>
                  {contentB ? (
                    contentB.isSubPair ? (
                      /* Sub-pair composite card preview */
                      <CompositeCardDisplay
                        bgContent={contentB.bgContent}
                        dataContent={contentB.dataContent}
                        size="lg"
                        className="mx-auto"
                        customStyles={cardBStyles || contentB.textStyles}
                      />
                    ) : (
                      /* Regular content preview */
                      <ContentDisplay
                        content={contentB}
                        size="lg"
                        className="mx-auto"
                      />
                    )
                  ) : (
                    <div
                      className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
                      onClick={() => {
                        // Trigger the content selector for Card B
                        setShowContentSelectorB(true);
                      }}
                      title="לחץ כאן כדי לבחור תוכן לקלף ב'"
                    >
                      <div className="text-center">
                        <div className="text-gray-400 mb-2 group-hover:text-blue-500">
                          <Plus className="w-6 h-6 mx-auto" />
                        </div>
                        <span className="text-gray-500 text-xs group-hover:text-blue-600 font-medium">לחץ לבחירת תוכן</span>
                        <div className="text-xs text-gray-400 mt-1 group-hover:text-blue-500">עבור קלף ב'</div>
                      </div>
                    </div>
                  )}
                  {contentB?.isSubPair && (
                    <div className="text-xs text-purple-600 mt-1 font-medium">
                      קלף משולב
                    </div>
                  )}
                  {contentB?.isSubPair && (
                    <Button
                      onClick={() => handleOpenStylesEditor('B')}
                      variant="outline"
                      size="sm"
                      className="mt-2 text-xs h-7 px-2"
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      עיצוב טקסט
                    </Button>
                  )}
                </div>
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

        {/* Composite Card Styles Editor */}
        {showStylesEditor && editingCard && (
          <CompositeCardStylesEditor
            isOpen={showStylesEditor}
            onClose={() => {
              setShowStylesEditor(false);
              setEditingCard(null);
            }}
            onSave={handleSaveStyles}
            bgContent={editingCard === 'A' ? contentA?.bgContent : contentB?.bgContent}
            dataContent={editingCard === 'A' ? contentA?.dataContent : contentB?.dataContent}
            initialStyles={editingCard === 'A' ? cardAStyles : cardBStyles}
          />
        )}

        {/* Direct Content Selector Modals */}
        {showContentSelectorA && (
          <Dialog open={showContentSelectorA} onOpenChange={setShowContentSelectorA}>
            <DialogContent className="sm:max-w-2xl" dir="rtl">
              <DialogHeader>
                <DialogTitle>בחר תוכן עבור קלף א'</DialogTitle>
                <DialogDescription>
                  בחר פריט תוכן שיוצג בקלף א' במשחק הזיכרון
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <ContentSelector
                  value={null}
                  onChange={(content) => {
                    if (content) {
                      handleContentAChange(content);
                      setShowContentSelectorA(false);
                    }
                  }}
                  placeholder="בחר תוכן לקלף א'"
                  excludeIds={contentB ? [contentB.id] : []}
                  label=""
                  autoOpen={true}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showContentSelectorB && (
          <Dialog open={showContentSelectorB} onOpenChange={setShowContentSelectorB}>
            <DialogContent className="sm:max-w-2xl" dir="rtl">
              <DialogHeader>
                <DialogTitle>בחר תוכן עבור קלף ב'</DialogTitle>
                <DialogDescription>
                  בחר פריט תוכן שיוצג בקלף ב' במשחק הזיכרון
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <ContentSelector
                  value={null}
                  onChange={(content) => {
                    if (content) {
                      handleContentBChange(content);
                      setShowContentSelectorB(false);
                    }
                  }}
                  placeholder="בחר תוכן לקלף ב'"
                  excludeIds={contentA ? [contentA.id] : []}
                  label=""
                  autoOpen={true}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        <DialogFooter className="flex gap-2">
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={isSaving}
          >
            ביטול
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className="min-w-24"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {mode === 'create' ? 'יוצר...' : 'שומר...'}
              </div>
            ) : (
              mode === 'create' ? 'צור זוג' : 'שמור שינויים'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContentPairEditor;