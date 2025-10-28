import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Info, Plus, X, AlertCircle } from 'lucide-react';
import { Category } from '@/services/entities';
import { getProductTypeName } from '@/config/productTypes';
import ProductTypeSelector from '../shared/ProductTypeSelector';

/**
 * BasicInfoSection - Handles core product information
 * Includes name, description, pricing, category, and tags
 */
export const BasicInfoSection = ({
  formData,
  updateFormData,
  addTag,
  removeTag,
  isNewProduct,
  enabledProductTypes,
  canCreateProductType,
  onStepChange,
  isFieldValid,
  getFieldError,
  globalSettings
}) => {
  const [categories, setCategories] = useState([]);
  const [tagsInputValue, setTagsInputValue] = useState('');

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await Category.find({}, "name");
        setCategories(categoriesData || []);
      } catch (error) {
        console.error('Failed to load categories:', error);
        setCategories([]);
      }
    };

    loadCategories();
  }, []);

  // Handle product type selection
  const handleProductTypeSelect = (productType) => {
    updateFormData({ product_type: productType });
    if (onStepChange) {
      onStepChange('form');
    }
  };

  // Handle tag input
  const handleTagInput = (e) => {
    if (e.key === 'Enter' && tagsInputValue.trim()) {
      e.preventDefault();
      addTag(tagsInputValue.trim());
      setTagsInputValue('');
    }
  };

  const handleAddTag = () => {
    if (tagsInputValue.trim()) {
      addTag(tagsInputValue.trim());
      setTagsInputValue('');
    }
  };

  // If this is a new product and no type is selected, show type selector
  if (isNewProduct && !formData.product_type) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            בחירת סוג מוצר
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProductTypeSelector
            onProductTypeSelect={handleProductTypeSelect}
            enabledProductTypes={enabledProductTypes}
            canCreateProductType={canCreateProductType}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          מידע בסיסי - {getProductTypeName(formData.product_type, 'singular')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Product Title */}
          <div>
            <Label className="text-sm font-medium">כותרת המוצר</Label>
            <Input
              value={formData.title || ''}
              onChange={(e) => updateFormData({ title: e.target.value })}
              placeholder="כותרת המוצר שתופיע ללקוחות"
              className={`mt-1 ${!isFieldValid('title') ? 'border-red-500' : ''}`}
            />
            {!isFieldValid('title') && (
              <p className="text-sm text-red-600 mt-1">{getFieldError('title')}</p>
            )}
          </div>

          {/* Short Description */}
          <div>
            <Label className="text-sm font-medium">תיאור קצר</Label>
            <Textarea
              value={formData.short_description || ''}
              onChange={(e) => updateFormData({ short_description: e.target.value })}
              placeholder="תיאור קצר שיופיע בקטלוג המוצרים - עד 150 תווים"
              rows={2}
              className={`mt-1 ${!isFieldValid('short_description') ? 'border-red-500' : ''}`}
              maxLength={150}
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">
                {(formData.short_description || '').length}/150 תווים
              </span>
              {!isFieldValid('short_description') && (
                <p className="text-sm text-red-600">{getFieldError('short_description')}</p>
              )}
            </div>
          </div>

          {/* Full Description */}
          <div>
            <Label className="text-sm font-medium">תיאור מפורט</Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => updateFormData({ description: e.target.value })}
              placeholder="תיאור מפורט של המוצר שיופיע בדף המוצר"
              rows={4}
              className={`mt-1 ${!isFieldValid('description') ? 'border-red-500' : ''}`}
            />
            {!isFieldValid('description') && (
              <p className="text-sm text-red-600 mt-1">{getFieldError('description')}</p>
            )}
          </div>

          {/* Pricing */}
          <div>
            <Label className="text-sm font-medium">מחיר (₪)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.price || ''}
              onChange={(e) => updateFormData({ price: e.target.value })}
              placeholder="0.00"
              className={`mt-1 ${!isFieldValid('price') ? 'border-red-500' : ''}`}
            />
            {!isFieldValid('price') && (
              <p className="text-sm text-red-600 mt-1">{getFieldError('price')}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <Label className="text-sm font-medium">קטגוריה</Label>
            <Select
              value={formData.category || ''}
              onValueChange={(value) => updateFormData({ category: value })}
            >
              <SelectTrigger className={`mt-1 ${!isFieldValid('category') ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="בחר קטגוריה" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isFieldValid('category') && (
              <p className="text-sm text-red-600 mt-1">{getFieldError('category')}</p>
            )}
          </div>



          {/* Target Audience */}
          <div>
            <Label className="text-sm font-medium">קהל יעד</Label>
            <Select
              value={formData.target_audience || ''}
              onValueChange={(value) => updateFormData({ target_audience: value })}
            >
              <SelectTrigger className={`mt-1 ${!isFieldValid('target_audience') ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="בחר קהל יעד" />
              </SelectTrigger>
              <SelectContent>
                {globalSettings?.audiance_targets?.[formData.product_type]?.map((audience) => (
                  <SelectItem key={audience} value={audience}>
                    {audience}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isFieldValid('target_audience') && (
              <p className="text-sm text-red-600 mt-1">{getFieldError('target_audience')}</p>
            )}
          </div>


          {/* Tags */}
          <div>
            <Label className="text-sm font-medium">תגיות</Label>
            <div className="mt-1 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={tagsInputValue}
                  onChange={(e) => setTagsInputValue(e.target.value)}
                  onKeyDown={handleTagInput}
                  placeholder="הקלד תגית ולחץ Enter"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                  disabled={!tagsInputValue.trim()}
                  className={`${!tagsInputValue.trim() ? 'opacity-50' : ''}`}
                  title={!tagsInputValue.trim() ? "יש להקליד תגית כדי להוסיף" : "הוסף תגית"}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                {!tagsInputValue.trim() && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      יש להקליד תגית
                    </span>
                  </div>
                )}
              </div>

              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              תגיות עוזרות ללקוחות למצוא את המוצר
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};