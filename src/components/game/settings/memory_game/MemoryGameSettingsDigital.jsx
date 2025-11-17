import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Monitor, Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { GameContent } from '@/services/apiClient';
import { showSuccess, showError } from '@/utils/messaging';
import ContentPairDisplay from '@/components/game/edu-content/ContentPairDisplay';
import ContentPairEditor from '@/components/game/edu-content/ContentPairEditor';

const MemoryGameSettingsDigital = ({
  gameProduct,
  gameEntity,
  onSettingsChange,
  isUpdating = false
}) => {
  const [contentPairs, setContentPairs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPairEditor, setShowPairEditor] = useState(false);
  const [editingPair, setEditingPair] = useState(null);
  const [deletingPairId, setDeletingPairId] = useState(null);

  // Load content pairs on mount
  useEffect(() => {
    if (gameEntity?.id) {
      loadContentPairs();
    }
  }, [gameEntity?.id]);

  const loadContentPairs = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await GameContent.getGameContents(gameEntity.id, 'pair');
      setContentPairs(response.data || []);
    } catch (error) {
      console.error('Error loading content pairs:', error);
      setError('שגיאה בטעינת זוגות התוכן');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewPair = () => {
    setEditingPair(null);
    setShowPairEditor(true);
  };

  const handleEditPair = (contentUse) => {
    setEditingPair(contentUse);
    setShowPairEditor(true);
  };

  const handlePairSaved = (savedPair) => {
    if (editingPair) {
      // Update existing pair
      setContentPairs(prev =>
        prev.map(pair => pair.id === savedPair.id ? savedPair : pair)
      );
    } else {
      // Add new pair
      setContentPairs(prev => [savedPair, ...prev]);
    }

    // Trigger settings change callback to parent if needed
    if (onSettingsChange) {
      onSettingsChange({
        content_pairs_count: contentPairs.length + (editingPair ? 0 : 1)
      });
    }
  };

  const handleDeletePair = async (pairId) => {
    setDeletingPairId(pairId);

    try {
      await GameContent.deleteContentUse(gameEntity.id, pairId);
      setContentPairs(prev => prev.filter(pair => pair.id !== pairId));
      showSuccess('נמחק בהצלחה', 'זוג התוכן נמחק בהצלחה');

      // Trigger settings change callback to parent if needed
      if (onSettingsChange) {
        onSettingsChange({
          content_pairs_count: contentPairs.length - 1
        });
      }
    } catch (error) {
      console.error('Error deleting content pair:', error);
      showError('שגיאה', error.message || 'לא הצלחנו למחוק את זוג התוכן');
    } finally {
      setDeletingPairId(null);
    }
  };

  const handleRefresh = () => {
    loadContentPairs();
  };

  return (
    <Card className="border-blue-200">
      <CardHeader className="bg-blue-50 border-b border-blue-200">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-800">
            <Monitor className="w-5 h-5" />
            הגדרות משחק זיכרון דיגיטלי
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isLoading || isUpdating}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={handleAddNewPair}
              variant="default"
              size="sm"
              disabled={isLoading || isUpdating}
            >
              <Plus className="w-4 h-4 ml-1" />
              הוסף זוג חדש
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>טוען זוגות תוכן...</span>
            </div>
          </div>
        )}

        {/* Content Pairs List */}
        {!isLoading && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <h3 className="font-semibold text-blue-800">זוגות תוכן במשחק</h3>
                <p className="text-sm text-blue-600">
                  {contentPairs.length === 0 ? 'אין זוגות תוכן' :
                   contentPairs.length === 1 ? 'זוג אחד' :
                   `${contentPairs.length} זוגות`}
                </p>
              </div>
              <div className="text-2xl text-blue-600 font-bold">
                {contentPairs.length}
              </div>
            </div>

            {/* Pairs Grid */}
            {contentPairs.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  אין זוגות תוכן במשחק
                </h3>
                <p className="text-gray-500 mb-4">
                  התחל ביצירת זוגות תוכן למשחק הזיכרון
                </p>
                <Button
                  onClick={handleAddNewPair}
                  variant="default"
                  className="mx-auto"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  הוסף זוג ראשון
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {contentPairs.map(contentUse => (
                  <ContentPairDisplay
                    key={contentUse.id}
                    contentUse={contentUse}
                    onEdit={handleEditPair}
                    onDelete={handleDeletePair}
                    isDeleting={deletingPairId === contentUse.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Content Pair Editor Modal */}
      <ContentPairEditor
        isOpen={showPairEditor}
        onClose={() => setShowPairEditor(false)}
        onSave={handlePairSaved}
        gameId={gameEntity?.id}
        contentUse={editingPair}
        mode={editingPair ? 'edit' : 'create'}
      />
    </Card>
  );
};

export default MemoryGameSettingsDigital;