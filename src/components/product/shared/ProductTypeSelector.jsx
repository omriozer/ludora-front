import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, BookOpen, Gamepad2, Wrench } from 'lucide-react';
import { getProductTypeName } from '@/config/productTypes';

/**
 * ProductTypeSelector - Allows selection of product type for new products
 */
export const ProductTypeSelector = ({
  onProductTypeSelect,
  enabledProductTypes,
  canCreateProductType
}) => {
  const getProductTypeIcon = (type) => {
    switch (type) {
      case 'file':
        return FileText;
      case 'workshop':
        return Calendar;
      case 'course':
        return BookOpen;
      case 'game':
        return Gamepad2;
      case 'tool':
        return Wrench;
      default:
        return FileText;
    }
  };

  const getProductTypeDescription = (type) => {
    switch (type) {
      case 'file':
        return 'קבצים דיגיטליים לצפייה או הורדה';
      case 'workshop':
        return 'סדנאות מקוונות עם תוכן מובנה';
      case 'course':
        return 'קורסים מלאים עם מודולים';
      case 'game':
        return 'משחקים חינוכיים אינטראקטיביים';
      case 'tool':
        return 'כלים דיגיטליים שימושיים';
      default:
        return 'מוצר דיגיטלי';
    }
  };

  // Get available product types that the user can create
  const getAvailableProductTypes = () => {
    return enabledProductTypes.filter(type => {
      if (type === 'tool') {
        // Tools cannot be created via UI - only edited
        return false;
      }
      return canCreateProductType(type);
    });
  };

  const availableTypes = getAvailableProductTypes();

  if (availableTypes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500 mb-4">אין סוגי מוצרים זמינים ליצירה</p>
          <p className="text-sm text-gray-400">
            אנא פנה למנהל המערכת להפעלת סוגי מוצרים נוספים
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">בחר סוג מוצר</h3>
        <p className="text-gray-600">איזה סוג מוצר תרצה ליצור?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableTypes.map((type) => {
          const Icon = getProductTypeIcon(type);
          return (
            <Card
              key={type}
              className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-blue-300"
              onClick={() => onProductTypeSelect(type)}
            >
              <CardContent className="p-6 text-center">
                <Icon className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                <h4 className="font-semibold text-lg mb-2">
                  {getProductTypeName(type, 'singular')}
                </h4>
                <p className="text-gray-600 text-sm mb-4">
                  {getProductTypeDescription(type)}
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onProductTypeSelect(type);
                  }}
                >
                  בחר {getProductTypeName(type, 'singular')}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center mt-6">
        <p className="text-sm text-gray-500">
          תוכל לשנות את סוג המוצר מאוחר יותר אם נדרש
        </p>
      </div>
    </div>
  );
};

export default ProductTypeSelector;