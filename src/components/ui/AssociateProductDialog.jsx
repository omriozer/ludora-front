import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PRODUCT_TYPES, getCatalogConfig } from '@/config/productTypes';
import { Product } from '@/services/apiClient';
import { toast } from '@/components/ui/use-toast';
import { clog, cerror } from '@/lib/utils';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import ProductItemDisplay from '@/components/ui/ProductItemDisplay';
import ProductTypeSelector from '@/components/ui/ProductTypeSelector';
import { getToolCategoryLabel } from '@/config/toolCategories';
import { useUser } from '@/contexts/UserContext';
import {
  Link,
  Search,
  Filter,
  ArrowLeft,
  Package,
  ChevronDown,
  X,
  TrendingUp
} from 'lucide-react';

export default function AssociateProductDialog({
  open,
  onOpenChange,
  item,
  onAssociate,
  loading = false,
  errors = {}
}) {
  const { currentUser, settings } = useUser();

  // Step 1: Product type selection, Step 2: Product selection
  const [step, setStep] = useState(1);
  const [selectedProductType, setSelectedProductType] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Comprehensive filters state
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    grade: 'all',
    subject: 'all',
    audience: 'all',
    gameType: 'all',
    price: 'all',
    publishStatus: 'all',
    skillLevel: 'all',
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedProductType(null);
      setProducts([]);
      setFilteredProducts([]);
      setCategories([]);
      setSelectedProduct(null);
      setShowFilters(false);
      // Reset all filters to default
      setFilters({
        search: '',
        category: 'all',
        grade: 'all',
        subject: 'all',
        audience: 'all',
        gameType: 'all',
        price: 'all',
        publishStatus: 'all',
        skillLevel: 'all',
        sortBy: 'created_at',
        sortOrder: 'DESC'
      });
    }
  }, [open]);


  // Load products when product type is selected
  useEffect(() => {
    if (selectedProductType && step === 2) {
      loadProducts();
    }
  }, [selectedProductType, step]);

  // Comprehensive filtering logic based on catalog system
  useEffect(() => {
    if (!products.length) return;

    let filtered = [...products];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(product =>
        product.title?.toLowerCase().includes(searchTerm) ||
        product.short_description?.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm) ||
        product.subject?.toLowerCase().includes(searchTerm) ||
        product.category?.toLowerCase().includes(searchTerm) ||
        // Also search in type_attributes for extended compatibility
        (product.type_attributes && JSON.stringify(product.type_attributes).toLowerCase().includes(searchTerm))
      );
    }

    // Apply category filter
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(product => product.category === filters.category);
    }

    // Apply grade filter - support both grade_range (catalog format) and type_attributes (current format)
    if (filters.grade && filters.grade !== 'all') {
      const targetGrade = parseInt(filters.grade);
      filtered = filtered.filter(product => {
        // Try catalog format first (grade_range)
        if (product.grade_range) {
          try {
            const gradeRange = typeof product.grade_range === 'string'
              ? JSON.parse(product.grade_range)
              : product.grade_range;
            return targetGrade >= (gradeRange.min || 1) && targetGrade <= (gradeRange.max || 12);
          } catch {
            // Fallback to type_attributes format
          }
        }

        // Fallback to type_attributes format
        if (product.type_attributes) {
          const gradeMin = product.type_attributes.grade_min;
          const gradeMax = product.type_attributes.grade_max;

          if (gradeMin && gradeMax) {
            return targetGrade >= gradeMin && targetGrade <= gradeMax;
          }
          if (gradeMin) {
            return targetGrade >= gradeMin;
          }
          if (gradeMax) {
            return targetGrade <= gradeMax;
          }
        }

        // If no grade info, include in results
        return true;
      });
    }

    // Apply subject filter
    if (filters.subject && filters.subject !== 'all') {
      filtered = filtered.filter(product =>
        product.subject === filters.subject ||
        product.type_attributes?.subject === filters.subject
      );
    }

    // Apply audience filter
    if (filters.audience && filters.audience !== 'all') {
      filtered = filtered.filter(product =>
        product.target_audience === filters.audience ||
        product.type_attributes?.target_audience === filters.audience
      );
    }

    // Apply game type filter (games only)
    if (filters.gameType && filters.gameType !== 'all' && selectedProductType === 'game') {
      filtered = filtered.filter(product =>
        product.game_type === filters.gameType ||
        product.type_attributes?.game_type === filters.gameType
      );
    }

    // Apply price filter
    if (filters.price && filters.price !== 'all') {
      if (filters.price === 'free') {
        filtered = filtered.filter(product => product.price === 0);
      } else if (filters.price === 'paid') {
        filtered = filtered.filter(product => product.price > 0);
      }
    }

    // Apply publish status filter (admin only)
    if (filters.publishStatus && filters.publishStatus !== 'all' &&
        currentUser && (currentUser.role === 'admin' || currentUser.role === 'sysadmin')) {
      if (filters.publishStatus === 'published') {
        filtered = filtered.filter(product => product.is_published);
      } else if (filters.publishStatus === 'unpublished') {
        filtered = filtered.filter(product => !product.is_published);
      }
    }

    // Apply skill level filter
    if (filters.skillLevel && filters.skillLevel !== 'all') {
      filtered = filtered.filter(product =>
        product.skill_level === filters.skillLevel ||
        product.type_attributes?.skill_level === filters.skillLevel
      );
    }

    // Apply sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        let aValue = a[filters.sortBy];
        let bValue = b[filters.sortBy];

        // Handle special cases
        if (filters.sortBy === 'downloads_count') {
          aValue = a.downloads_count || 0;
          bValue = b.downloads_count || 0;
        }

        // Handle string sorting
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue, 'he');
          return filters.sortOrder === 'DESC' ? -comparison : comparison;
        }

        // Handle numeric sorting
        if (filters.sortOrder === 'DESC') {
          return bValue - aValue;
        } else {
          return aValue - bValue;
        }
      });
    }

    setFilteredProducts(filtered);
  }, [products, filters, selectedProductType, currentUser]);

  const loadProducts = async () => {
    setProductLoading(true);
    try {
      let productsData;
      if (selectedProductType === 'all') {
        // Load all products
        productsData = await Product.find();
      } else {
        // Load products of specific type
        productsData = await Product.find({ product_type: selectedProductType });
      }

      setProducts(productsData);

      // Extract categories for filtering
      const uniqueCategories = [...new Set(
        productsData
          .map(product => product.category)
          .filter(Boolean)
      )].map(name => ({ name, id: name }));
      setCategories(uniqueCategories);

      clog('Loaded products for type:', selectedProductType, productsData);
    } catch (error) {
      cerror('Error loading products:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת רשימת המוצרים",
        variant: "destructive"
      });
    }
    setProductLoading(false);
  };

  const handleProductTypeSelect = (type) => {
    setSelectedProductType(type);
    setStep(2);
  };

  const handleBackToTypeSelection = () => {
    setStep(1);
    setSelectedProductType(null);
    setProducts([]);
    setFilteredProducts([]);
    setCategories([]);
    setSelectedProduct(null);
    // Reset all filters to default
    setFilters({
      search: '',
      category: 'all',
      grade: 'all',
      subject: 'all',
      audience: 'all',
      gameType: 'all',
      price: 'all',
      publishStatus: 'all',
      skillLevel: 'all',
      sortBy: 'created_at',
      sortOrder: 'DESC'
    });
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
  };

  const handleConfirmAssociation = async () => {
    if (!selectedProduct) return;

    try {
      await onAssociate({ product_id: selectedProduct.id });
      onOpenChange(false);
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  // Helper functions for filters
  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      grade: 'all',
      subject: 'all',
      audience: 'all',
      gameType: 'all',
      price: 'all',
      publishStatus: 'all',
      skillLevel: 'all',
      sortBy: 'created_at',
      sortOrder: 'DESC'
    });
  };

  const hasActiveFilters = () => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'sortBy' || key === 'sortOrder') return false;
      return value !== '' && value !== 'all';
    });
  };

  // Get enabled filters for current product type
  const getEnabledFilters = () => {
    if (!selectedProductType || selectedProductType === 'all') {
      // For 'all' types, show common filters
      return ['search', 'category', 'grade', 'subject', 'price', 'sort'];
    }

    const catalogConfig = getCatalogConfig(selectedProductType);
    return catalogConfig?.filters || ['search'];
  };

  // Render individual filter components (based on CatalogFilters.jsx)
  const renderFilter = (filterType) => {
    const typeConfig = selectedProductType === 'all'
      ? { key: 'all' }
      : PRODUCT_TYPES[selectedProductType];

    switch (filterType) {
      case 'search':
        return (
          <div key="search" className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="חפש מוצרים..."
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="pr-10 h-9 text-sm border-gray-300 text-right"
              dir="rtl"
            />
          </div>
        );

      case 'category':
        return (
          <Select key="category" value={filters.category} onValueChange={(value) => updateFilters({ category: value })}>
            <SelectTrigger className="h-9 text-sm w-24 border-gray-300 text-right" dir="rtl">
              <SelectValue>
                {filters.category === 'all' ? 'קטגוריה' :
                 typeConfig.key === 'tool' ? getToolCategoryLabel(filters.category) : filters.category}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הקטגוריות</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id || category.name} value={category.name}>
                  {typeConfig.key === 'tool' ? getToolCategoryLabel(category.name) : category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'grade':
        return (
          <Select key="grade" value={filters.grade} onValueChange={(value) => updateFilters({ grade: value })}>
            <SelectTrigger className="h-9 text-sm w-20 border-gray-300 text-right" dir="rtl">
              <SelectValue>
                {filters.grade === 'all' ? 'כיתה' :
                 filters.grade === '1' ? "א" : filters.grade === '2' ? "ב" : filters.grade === '3' ? "ג" :
                 filters.grade === '4' ? "ד" : filters.grade === '5' ? "ה" : filters.grade === '6' ? "ו" :
                 filters.grade === '7' ? "ז" : filters.grade === '8' ? "ח" : filters.grade === '9' ? "ט" :
                 filters.grade === '10' ? "י" : filters.grade === '11' ? "יא" : "יב"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הכיתות</SelectItem>
              {Array.from({length: 12}, (_, i) => i + 1).map((grade) => (
                <SelectItem key={grade} value={String(grade)}>
                  כיתה {grade === 1 ? "א" : grade === 2 ? "ב" : grade === 3 ? "ג" :
                        grade === 4 ? "ד" : grade === 5 ? "ה" : grade === 6 ? "ו" :
                        grade === 7 ? "ז" : grade === 8 ? "ח" : grade === 9 ? "ט" :
                        grade === 10 ? "י" : grade === 11 ? "יא" : "יב"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'subject':
        return (
          <Select key="subject" value={filters.subject} onValueChange={(value) => updateFilters({ subject: value })}>
            <SelectTrigger className="h-9 text-sm w-24 border-gray-300 text-right" dir="rtl">
              <SelectValue>
                {filters.subject === 'all' ? 'מקצוע' : filters.subject}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המקצועות</SelectItem>
              {settings?.study_subjects && Object.entries(settings.study_subjects).map(([key, label]) => (
                <SelectItem key={key} value={label}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'audience':
        return (
          <Select key="audience" value={filters.audience} onValueChange={(value) => updateFilters({ audience: value })}>
            <SelectTrigger className="h-9 text-sm w-24 border-gray-300 text-right" dir="rtl">
              <SelectValue>
                {filters.audience === 'all' ? 'קהל יעד' : filters.audience}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הקהלים</SelectItem>
              {settings?.audiance_targets?.[typeConfig.key]?.map((audience) => (
                <SelectItem key={audience} value={audience}>{audience}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'gameType':
        const GAME_TYPE_NAMES = {
          'sharp_and_smooth': 'חד וחלק',
          'elevator_game': `משחק המעלית`,
          'memory_game': `משחק זיכרון`,
          'scatter_game': 'תפזורת'
        };
        return (
          <Select key="gameType" value={filters.gameType} onValueChange={(value) => updateFilters({ gameType: value })}>
            <SelectTrigger className="h-9 text-sm w-24 border-gray-300 text-right" dir="rtl">
              <SelectValue>
                {filters.gameType === 'all' ? 'סוג משחק' : GAME_TYPE_NAMES[filters.gameType] || filters.gameType}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל סוגי המשחקים</SelectItem>
              {Object.entries(GAME_TYPE_NAMES).map(([key, name]) => (
                <SelectItem key={key} value={key}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'price':
        return (
          <Select key="price" value={filters.price} onValueChange={(value) => updateFilters({ price: value })}>
            <SelectTrigger className="h-9 text-sm w-20 border-gray-300 text-right" dir="rtl">
              <SelectValue>
                {filters.price === 'all' ? 'מחיר' : filters.price === 'free' ? 'חינם' : 'בתשלום'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="free">חינם</SelectItem>
              <SelectItem value="paid">בתשלום</SelectItem>
            </SelectContent>
          </Select>
        );

      case 'publishStatus':
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'sysadmin')) {
          return null;
        }
        return (
          <Select key="publishStatus" value={filters.publishStatus} onValueChange={(value) => updateFilters({ publishStatus: value })}>
            <SelectTrigger className="h-9 text-sm w-32 border-gray-300 text-right" dir="rtl">
              <SelectValue>
                {filters.publishStatus === 'all' ? 'סטטוס פרסום' :
                 filters.publishStatus === 'published' ? 'מפורסמות' : 'לא מפורסמות'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המוצרים</SelectItem>
              <SelectItem value="published">מפורסמות בלבד</SelectItem>
              <SelectItem value="unpublished">לא מפורסמות בלבד</SelectItem>
            </SelectContent>
          </Select>
        );

      case 'skillLevel':
        return (
          <Select key="skillLevel" value={filters.skillLevel} onValueChange={(value) => updateFilters({ skillLevel: value })}>
            <SelectTrigger className="h-9 text-sm w-24 border-gray-300 text-right" dir="rtl">
              <SelectValue>
                {filters.skillLevel === 'all' ? 'רמה' :
                 filters.skillLevel === 'beginner' ? 'מתחילים' :
                 filters.skillLevel === 'intermediate' ? 'בינוני' : 'מתקדמים'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הרמות</SelectItem>
              <SelectItem value="beginner">מתחילים</SelectItem>
              <SelectItem value="intermediate">בינוני</SelectItem>
              <SelectItem value="advanced">מתקדמים</SelectItem>
            </SelectContent>
          </Select>
        );

      case 'sort':
        return (
          <div key="sort" className="flex items-center gap-2">
            {/* Sort Direction Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateFilters({ sortOrder: filters.sortOrder === 'DESC' ? 'ASC' : 'DESC' })}
              className="h-9 px-2 text-xs border-gray-300 hover:bg-gray-50 flex items-center gap-1"
              title={`מיון ${filters.sortOrder === 'DESC' ? 'יורד' : 'עולה'} - לחץ להחלפה`}
            >
              {filters.sortOrder === 'DESC' ? (
                <>
                  <span className="text-xs">יורד</span>
                  <TrendingUp className="w-3 h-3 rotate-180" />
                </>
              ) : (
                <>
                  <span className="text-xs">עולה</span>
                  <TrendingUp className="w-3 h-3" />
                </>
              )}
            </Button>

            {/* Sort Field Select */}
            <Select value={filters.sortBy} onValueChange={(value) => updateFilters({ sortBy: value })}>
              <SelectTrigger className="h-9 text-sm w-20 border-gray-300 text-right" dir="rtl">
                <SelectValue>
                  {filters.sortBy === 'created_at' ? 'חדש' :
                   filters.sortBy === 'updated_at' ? 'עודכן' :
                   filters.sortBy === 'title' ? 'שם' :
                   filters.sortBy === 'price' ? 'מחיר' :
                   filters.sortBy === 'downloads_count' ? 'הורדות' : 'מיון'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">החדשים ביותר</SelectItem>
                <SelectItem value="updated_at">עודכנו לאחרונה</SelectItem>
                <SelectItem value="title">שם</SelectItem>
                <SelectItem value="price">מחיר</SelectItem>
                {typeConfig.key === 'file' && (
                  <SelectItem value="downloads_count">הורדות</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  const renderProductTypeSelection = () => {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">בחר סוג מוצר</h3>
          <p className="text-sm text-gray-600">
            בחר את סוג המוצר שברצונך לקשר לנושא הלימוד
          </p>
        </div>

        <ProductTypeSelector
          includeAllTypes={true}
          onSelect={handleProductTypeSelect}
          selectedType={selectedProductType}
          layout="grid"
          size="md"
          adminOverride={true}
        />
      </div>
    );
  };

  const renderProductSelection = () => {
    const selectedTypeConfig = selectedProductType === 'all'
      ? { singular: 'כל הסוגים', plural: 'כל המוצרים' }
      : PRODUCT_TYPES[selectedProductType];

    return (
      <div className="space-y-4">
        {/* Header with back button */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToTypeSelection}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            חזור
          </Button>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">בחר {selectedTypeConfig.singular.toLowerCase()}</h3>
            <p className="text-sm text-gray-600">
              בחר מוצר לקישור לנושא: {item?.study_topic}
            </p>
          </div>
        </div>

        {/* Comprehensive Filters */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-3" dir="rtl">
              <Filter className="w-5 h-5 text-gray-500 flex-shrink-0" />

              {/* Render enabled filters for current product type */}
              {getEnabledFilters().map((filterType) => (
                renderFilter(filterType)
              ))}

              {/* Clear filters button */}
              {hasActiveFilters() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 px-3 text-xs text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 font-medium"
                >
                  <X className="w-3 h-3 mr-1" />
                  נקה
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Products list - this will be scrollable */}
        {productLoading ? (
          <div className="py-8">
            <LudoraLoadingSpinner text="טוען מוצרים..." />
          </div>
        ) : filteredProducts.length === 0 ? (
          <Alert>
            <Package className="h-4 w-4" />
            <AlertDescription>
              {products.length === 0
                ? `לא נמצאו מוצרים מסוג ${selectedTypeConfig.singular.toLowerCase()}`
                : 'לא נמצאו מוצרים התואמים לחיפוש ולסינון'
              }
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <div key={product.id} className="relative">
                <ProductItemDisplay
                  product={product}
                  mode="select"
                  layout="list"
                  size="sm"
                  showPrice={false}
                  showDescription={true}
                  showGrades={true}
                  showImage={true}
                  showTypeIcon={selectedProductType === 'all'}
                  onSelect={() => handleProductSelect(product)}
                  selected={selectedProduct?.id === product.id}
                  className="hover:shadow-md transition-shadow"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {step === 1 ? 'קשר מוצר לנושא לימוד' : `בחר ${PRODUCT_TYPES[selectedProductType]?.singular.toLowerCase() || 'מוצר'}`}
          </DialogTitle>
        </DialogHeader>

        {/* Main content area - scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {step === 1 ? renderProductTypeSelection() : renderProductSelection()}
        </div>

        {/* Fixed footer for errors and actions */}
        <div className="flex-shrink-0 border-t pt-4">
          {errors.general && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Selection summary and actions - only show in step 2 when product is selected */}
          {step === 2 && selectedProduct && (
            <div className="space-y-3">
              <Alert>
                <Link className="h-4 w-4" />
                <AlertDescription>
                  מוצר נבחר: <strong>{selectedProduct.title}</strong>
                  <br />
                  יקושר לנושא: <strong>{item?.study_topic} - {item?.content_topic}</strong>
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  onClick={handleConfirmAssociation}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <LudoraLoadingSpinner size="sm" />
                      <span className="mr-2">מקשר...</span>
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4 ml-2" />
                      קשר מוצר
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedProduct(null)}
                  disabled={loading}
                >
                  ביטול בחירה
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}