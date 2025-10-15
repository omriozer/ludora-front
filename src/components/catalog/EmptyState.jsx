import React from 'react';
import { Button } from '@/components/ui/button';
import { getProductTypeName } from '@/config/productTypes';

/**
 * Empty State Component
 * Displays when no products are found in the catalog
 * Shows appropriate message and actions based on product type and context
 */
export default function EmptyState({
  config,
  typeConfig,
  activeTab,
  onClearFilters
}) {
  // Get appropriate icon based on product type
  const IconComponent = typeConfig.icon;

  // Helper function to safely parse colors
  const parseColorToCSS = (colorString) => {
    if (!colorString) return '#3B82F6'; // fallback blue

    try {
      const parts = colorString.split(' ');
      if (parts.length >= 1) {
        const fromColor = parts[0].replace('from-', '');
        // Basic color mapping
        const colorMap = {
          'blue-500': '#3B82F6',
          'green-500': '#10B981',
          'purple-500': '#8B5CF6',
          'pink-500': '#EC4899'
        };
        return colorMap[fromColor] || '#3B82F6';
      }
    } catch (error) {
      console.warn('Error parsing color:', colorString);
    }
    return '#3B82F6';
  };

  const parseGradient = (colorString) => {
    if (!colorString) return 'linear-gradient(to right, #3B82F6, #2563EB)';

    try {
      const parts = colorString.split(' ');
      if (parts.length >= 3) {
        const fromColor = parts[0].replace('from-', '');
        const toColor = parts[2].replace('to-', '');
        const colorMap = {
          'blue-500': '#3B82F6', 'blue-600': '#2563EB',
          'green-500': '#10B981', 'green-600': '#059669',
          'purple-500': '#8B5CF6', 'purple-600': '#7C3AED',
          'pink-500': '#EC4899', 'red-600': '#DC2626'
        };
        const from = colorMap[fromColor] || '#3B82F6';
        const to = colorMap[toColor] || '#2563EB';
        return `linear-gradient(to right, ${from}, ${to})`;
      }
    } catch (error) {
      console.warn('Error parsing gradient:', colorString);
    }
    return 'linear-gradient(to right, #3B82F6, #2563EB)';
  };

  // Get message based on product type and tab
  const getMessage = () => {
    const productName = getProductTypeName(typeConfig.key, 'plural');

    if (activeTab === 'my') {
      return {
        title: `אין לך ${productName} עדיין`,
        description: `טרם רכשת ${productName}. עיין בקטלוג לרכישת ${productName} חדשים.`
      };
    } else if (activeTab === 'free') {
      return {
        title: `אין ${productName} חינמיים`,
        description: `לא נמצאו ${productName} חינמיים התואמים לפילטרים שלך.`
      };
    } else if (activeTab === 'featured') {
      return {
        title: `אין ${productName} מומלצים`,
        description: `טרם הוגדרו ${productName} מומלצים. בדוק שוב מאוחר יותר.`
      };
    } else {
      return {
        title: `לא נמצאו ${productName}`,
        description: `נסה לשנות את הפילטרים או חפש ${productName} אחרים.`
      };
    }
  };

  const { title, description } = getMessage();

  return (
    <div className="text-center py-16">
      <div
        className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{
          backgroundColor: parseColorToCSS(typeConfig.color) + '20'
        }}
      >
        <IconComponent className="w-10 h-10" style={{ color: parseColorToCSS(typeConfig.color) }} />
      </div>

      <h3 className="text-xl font-semibold text-gray-700 mb-2">
        {title}
      </h3>

      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        {description}
      </p>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        {/* Clear filters button - always show for main tabs */}
        {(activeTab === 'all' || !activeTab) && (
          <Button
            onClick={onClearFilters}
            variant="outline"
            className="border-gray-300 hover:bg-gray-50"
          >
            נקה פילטרים
          </Button>
        )}

        {/* Browse all products for "my" tab */}
        {activeTab === 'my' && (
          <Button
            onClick={() => window.location.hash = '#all'}
            className="text-white"
            style={{
              background: parseGradient(typeConfig.color)
            }}
          >
            עיין בכל ה{getProductTypeName(typeConfig.key, 'plural')}
          </Button>
        )}

        {/* Browse paid products for "free" tab */}
        {activeTab === 'free' && (
          <Button
            onClick={() => window.location.hash = '#all'}
            className="text-white"
            style={{
              background: parseGradient(typeConfig.color)
            }}
          >
            עיין בכל ה{getProductTypeName(typeConfig.key, 'plural')}
          </Button>
        )}
      </div>
    </div>
  );
}