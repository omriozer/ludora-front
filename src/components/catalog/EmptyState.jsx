import { Button } from '@/components/ui/button';
import { getProductTypeName } from '@/config/productTypes';

/**
 * Empty State Component
 * Displays when no products are found in the catalog
 * Shows appropriate message and actions based on product type and context
 */
export default function EmptyState({
  typeConfig,
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


  // Get generic message based on product type
  const getMessage = () => {
    const productName = getProductTypeName(typeConfig.key, 'plural');
    return {
      title: `לא נמצאו ${productName}`,
      description: `נסה לשנות את הפילטרים או חפש ${productName} אחרים.`
    };
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

      {/* Action button */}
      <div className="flex justify-center">
        <Button
          onClick={onClearFilters}
          variant="outline"
          className="border-gray-300 hover:bg-gray-50"
        >
          נקה פילטרים
        </Button>
      </div>
    </div>
  );
}