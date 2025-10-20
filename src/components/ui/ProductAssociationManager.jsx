import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Package, Plus, ExternalLink } from "lucide-react";
import EntitySelector from "@/components/ui/EntitySelector";
import { Product } from "@/services/entities";
import { getApiBase } from "@/utils/api";
import { toast } from "@/components/ui/use-toast";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";

/**
 * ProductAssociationManager - Reusable component for managing product associations
 * Can be used for curriculum items, categories, or any entity that associates with products
 *
 * @param {Object} props
 * @param {string} props.entityId - ID of the entity (e.g., curriculum item ID)
 * @param {string} props.entityType - Type of entity ('curriculum_item', 'category', etc.)
 * @param {Array} props.associatedProducts - Current associated products
 * @param {Function} props.onAssociationsChange - Callback when associations change
 * @param {boolean} props.disabled - Disable editing
 * @param {boolean} props.showTitle - Show the card title
 * @param {string} props.title - Custom title for the card
 * @param {string} props.description - Custom description
 */
export default function ProductAssociationManager({
  entityId,
  entityType = 'curriculum_item',
  associatedProducts = [],
  onAssociationsChange,
  disabled = false,
  showTitle = true,
  title = "מוצרים משויכים",
  description = "נהל את המוצרים המשויכים לפריט זה"
}) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setProducts(associatedProducts);
  }, [associatedProducts]);

  const loadProducts = async () => {
    try {
      const productsData = await Product.list();
      return productsData.filter(product => product.is_published);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת רשימת המוצרים",
        variant: "destructive"
      });
      return [];
    }
  };

  const filterProducts = (products, searchTerm) => {
    const searchLower = searchTerm.toLowerCase();
    return products.filter(product =>
      product.title?.toLowerCase().includes(searchLower) ||
      product.description?.toLowerCase().includes(searchLower) ||
      product.category?.toLowerCase().includes(searchLower) ||
      product.product_type?.toLowerCase().includes(searchLower)
    );
  };

  const renderProduct = (product, isSelected, onSelect) => {
    const getProductTypeLabel = (type) => {
      const types = {
        'game': 'משחק',
        'course': 'קורס',
        'workshop': 'סדנה',
        'file': 'קובץ',
        'tool': 'כלי'
      };
      return types[type] || type;
    };

    return (
      <div
        key={product.id}
        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
          isSelected
            ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
            : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
        }`}
        onClick={() => onSelect(product)}
      >
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Package className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">
            {product.title}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {getProductTypeLabel(product.product_type)}
            </Badge>
            {product.category && (
              <Badge variant="secondary" className="text-xs">
                {product.category}
              </Badge>
            )}
            {product.price && (
              <span className="text-xs text-gray-500">₪{product.price}</span>
            )}
          </div>
          {product.short_description && (
            <div className="text-sm text-gray-500 truncate mt-1">
              {product.short_description}
            </div>
          )}
        </div>
        {isSelected && (
          <Badge className="bg-blue-100 text-blue-800">משויך</Badge>
        )}
      </div>
    );
  };

  const renderSelectedProducts = (selectedProducts) => {
    if (selectedProducts.length === 0) {
      return (
        <Alert>
          <Package className="h-4 w-4" />
          <AlertDescription>
            לא משויכים מוצרים לפריט זה
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-2">
        {selectedProducts.map(product => (
          <Card key={product.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded flex items-center justify-center">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {product.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {product.product_type}
                      </Badge>
                      {product.category && (
                        <Badge variant="secondary" className="text-xs">
                          {product.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/product-details?id=${product.id}`, '_blank')}
                    title="צפה במוצר"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  {!disabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveProduct(product.id)}
                      disabled={isSubmitting}
                      title="הסר שיוך"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const handleProductsChange = async (selectedProductIds) => {
    if (disabled) return;

    setIsSubmitting(true);
    try {
      // Update associations via API
      const response = await fetch(`${getApiBase()}/entities/${entityType}/${entityId}/products`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          product_ids: selectedProductIds
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update product associations');
      }

      const updatedProducts = await Product.list();
      const newAssociatedProducts = updatedProducts.filter(p => selectedProductIds.includes(p.id));

      setProducts(newAssociatedProducts);
      onAssociationsChange?.(newAssociatedProducts);

      toast({
        title: "עודכן בהצלחה",
        description: "שיוכי המוצרים עודכנו בהצלחה"
      });
    } catch (error) {
      console.error('Error updating product associations:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בעדכון שיוכי המוצרים",
        variant: "destructive"
      });
    }
    setIsSubmitting(false);
  };

  const handleRemoveProduct = async (productId) => {
    const currentIds = products.map(p => p.id);
    const newIds = currentIds.filter(id => id !== productId);
    await handleProductsChange(newIds);
  };

  const entityServiceMock = {
    list: loadProducts
  };

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {title}
          </CardTitle>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {/* Current Associations */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">מוצרים משויכים כעת</h4>
          {renderSelectedProducts(products)}
        </div>

        {/* Add/Manage Products */}
        {!disabled && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">נהל שיוכי מוצרים</h4>
            <EntitySelector
              value={products.map(p => p.id)}
              onValueChange={handleProductsChange}
              entityService={entityServiceMock}
              renderEntity={renderProduct}
              renderSelected={() => null} // We handle this above
              filterEntities={filterProducts}
              placeholder="הוסף מוצרים"
              title="בחר מוצרים לשיוך"
              searchPlaceholder="חפש מוצרים לפי שם, קטגוריה או סוג..."
              multiple={true}
              disabled={isSubmitting}
              emptyMessage="לא נמצאו מוצרים זמינים"
              icon={Plus}
            />
          </div>
        )}

        {isSubmitting && (
          <div className="flex items-center justify-center py-4">
            <LudoraLoadingSpinner size="sm" />
            <span className="mr-2 text-gray-500">מעדכן שיוכים...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}