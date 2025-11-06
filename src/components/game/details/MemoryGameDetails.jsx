import React from 'react';
import { Badge } from '@/components/ui/badge';

/**
 * MemoryGameDetails - Display component for memory game specific information
 * Shows pair count, content types, and content type combinations in Hebrew
 */
const MemoryGameDetails = ({ gameDetails }) => {
  if (!gameDetails || !gameDetails.details) {
    return null;
  }

  const { details } = gameDetails;

  // Helper function to get Hebrew labels for content types
  const getContentTypeLabel = (semanticType) => {
    const labels = {
      word: 'מילים',
      question: 'שאלות',
      answer: 'תשובות',
      name: 'שמות',
      place: 'מקומות',
      text: 'טקסט',
      image: 'תמונות',
      audio: 'קול',
      video: 'וידאו'
    };

    return labels[semanticType] || semanticType;
  };

  // Helper function to get combination description
  const getCombinationDescription = (typeA, typeB, count) => {
    const labelA = getContentTypeLabel(typeA);
    const labelB = getContentTypeLabel(typeB);

    if (typeA === typeB) {
      return `${count} זוגות ${labelA}`;
    }

    return `${count} זוגות ${labelA} - ${labelB}`;
  };

  return (
    <div className="game-details-section bg-gray-50 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">פרטי המשחק</h3>

      {/* Main Game Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* Pairs Count */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-center text-center">
            <div className="text-3xl font-bold text-blue-600 ml-2">
              {details.pair_count}
            </div>
            <div className="text-gray-600 font-medium">
              זוגות
            </div>
          </div>
          <div className="text-xs text-gray-500 text-center mt-1">
            סה"כ פריטי תוכן: {details.total_content_items || (details.pair_count * 2)}
          </div>
        </div>

        {/* Content Types */}
        {details.content_types && details.content_types.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-3">
              סוגי תוכן במשחק:
            </div>
            <div className="flex flex-wrap gap-2">
              {details.content_types.map((type, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                >
                  {getContentTypeLabel(type)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content Type Combinations */}
      {details.content_type_combinations && details.content_type_combinations.length > 0 && (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-3">
            סוגי הזוגות:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {details.content_type_combinations.map((combination, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md border"
              >
                <span className="text-sm text-gray-700">
                  {getCombinationDescription(combination.type_a, combination.type_b, combination.count)}
                </span>
                <Badge variant="outline" className="text-xs">
                  {combination.count}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {details.pair_count === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-lg mb-2">😔</div>
          <div className="text-sm">עדיין לא הוגדרו זוגות למשחק זה</div>
          <div className="text-xs text-gray-400 mt-1">
            ניתן להוסיף זוגות בעמוד הגדרות המשחק
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryGameDetails;