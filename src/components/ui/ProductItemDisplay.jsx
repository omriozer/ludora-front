import React, { useState, useMemo } from "react";
import { getProductTypeName, formatGradeRange, getProductTypeConfig } from "@/config/productTypes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import ProductImage from "@/components/ui/ProductImage";
import {
  Eye,
  CheckCircle,
  ShoppingCart,
  Plus,
  Edit,
  FileText,
  Play,
  BookOpen,
  Calendar,
  Settings
} from "lucide-react";
import PriceDisplayTag from "@/components/ui/PriceDisplayTag";
import ProductActionBar from "@/components/ui/ProductActionBar";
import { getSubjectColors } from "@/config/subjectColors";
import { getToolCategoryLabel } from "@/config/toolCategories";
import { useProductAccess } from "@/hooks/useProductAccess";
import { extractPlainText } from "@/components/ui/SafeHtmlRenderer";

// Product type icons mapping
const PRODUCT_TYPE_ICONS = {
  file: FileText,
  game: Play,
  course: BookOpen,
  workshop: Calendar,
  tool: Settings,
  lesson_plan: BookOpen
};

// Hebrew grade names
const HEBREW_GRADES = {
  1: 'כיתה א', 2: 'כיתה ב', 3: 'כיתה ג', 4: 'כיתה ד',
  5: 'כיתה ה', 6: 'כיתה ו', 7: 'כיתה ז', 8: 'כיתה ח',
  9: 'כיתה ט', 10: 'כיתה י', 11: 'כיתה יא', 12: 'כיתה יב'
};

/**
 * ProductItemDisplay - Flexible product display component
 *
 * @param {Object} product - Product data
 * @param {string} mode - 'purchase' | 'select' | 'display'
 * @param {string} layout - 'card' | 'list' | 'compact'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} showPrice - Show price information
 * @param {boolean} showDescription - Show product description
 * @param {boolean} showCreator - Show creator information
 * @param {boolean} showGrades - Show grade range
 * @param {boolean} showTags - Show product tags
 * @param {boolean} showImage - Show product image
 * @param {boolean} showTypeIcon - Show product type icon
 * @param {boolean} showActionBar - Show ProductActionBar (default: true)
 * @param {boolean} selected - Selection state (for select mode)
 * @param {function} onSelect - Selection callback
 * @param {function} onPurchase - Purchase callback
 * @param {function} onView - View details callback
 * @param {function} onEdit - Edit callback
 * @param {boolean} purchasable - Whether product can be purchased
 * @param {boolean} disabled - Disable interactions
 * @param {string} className - Additional CSS classes
 */
export default function ProductItemDisplay({
  product,
  mode = 'display', // 'purchase' | 'select' | 'display'
  layout = 'card', // 'card' | 'list' | 'compact'
  size = 'md', // 'sm' | 'md' | 'lg'
  showPrice = true,
  showDescription = true,
  showCreator = false,
  showGrades = true,
  showTags = true,
  showImage = true,
  showTypeIcon = true,
  showActionBar = true,
  selected = false,
  onSelect = null,
  onPurchase = null,
  onView = null,
  onEdit = null,
  onFileAccess = null,
  onPdfPreview = null,
  purchasable = true,
  disabled = false,
  className = "",
  userPurchases = []
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Use centralized product access logic
  const { hasAccess, isInCart, purchase } = useProductAccess(product, userPurchases);

  // Get product type configuration
  const productTypeConfig = getProductTypeConfig(product.product_type);
  const ProductTypeIcon = PRODUCT_TYPE_ICONS[product.product_type] || FileText;

  // Handle successful purchase for ProductActionBar
  const handlePurchaseSuccess = (newPurchase) => {
    if (onPurchase) onPurchase(newPurchase);
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      imageHeight: 'h-24',
      cardPadding: 'p-3',
      titleSize: 'text-sm',
      descriptionSize: 'text-xs',
      badgeSize: 'text-xs',
      iconSize: 'w-3 h-3',
      buttonSize: 'sm'
    },
    md: {
      imageHeight: 'h-32',
      cardPadding: 'p-4',
      titleSize: 'text-base',
      descriptionSize: 'text-sm',
      badgeSize: 'text-xs',
      iconSize: 'w-4 h-4',
      buttonSize: 'sm'
    },
    lg: {
      imageHeight: 'h-40',
      cardPadding: 'p-6',
      titleSize: 'text-lg',
      descriptionSize: 'text-base',
      badgeSize: 'text-sm',
      iconSize: 'w-5 h-5',
      buttonSize: 'default'
    }
  };

  const config = sizeConfig[size];

  // Get smart context display per product type
  const getSmartContext = () => {
    switch (product.product_type) {
      case 'file':
        const fileType = product.file_type || 'קובץ';
        const subject = product.type_attributes?.subject;
        const gradeRange = formatGradeRange(
          product.type_attributes?.grade_min,
          product.type_attributes?.grade_max
        );

        const fileParts = [fileType.toUpperCase()];
        if (subject) fileParts.push(subject);
        if (gradeRange) fileParts.push(gradeRange);

        return fileParts.join(' • ');

      case 'game':
        const gameType = product.type_attributes?.game_type;
        const minAge = product.type_attributes?.min_age;
        const maxAge = product.type_attributes?.max_age;

        const gameParts = [];
        if (minAge && maxAge) {
          gameParts.push(`גילאי ${minAge}-${maxAge}`);
        } else if (minAge) {
          gameParts.push(`מגיל ${minAge}`);
        }
        if (gameType) gameParts.push(gameType);

        return gameParts.join(' • ') || 'משחק חינוכי';

      case 'course':
        const modules = product.course?.course_modules?.length || product.course_modules?.length || 0;
        const skillLevel = product.type_attributes?.skill_level;

        const courseParts = [];
        if (modules > 0) courseParts.push(`${modules} מודולים`);
        if (skillLevel) courseParts.push(`רמת ${skillLevel === 'beginner' ? 'מתחילים' : skillLevel === 'intermediate' ? 'בינוני' : 'מתקדמים'}`);

        return courseParts.join(' • ') || 'קורס מקוון';

      case 'workshop':
        const workshopType = product.type_attributes?.workshop_type;
        const duration = product.type_attributes?.duration_minutes;

        const workshopParts = [];
        if (workshopType) {
          workshopParts.push(workshopType === 'live' ? 'הדרכה חיה' : workshopType === 'recorded' ? 'הקלטה' : 'הדרכה');
        }
        if (duration) workshopParts.push(`${duration} דקות`);

        return workshopParts.join(' • ') || 'הדרכה מקצועית';

      case 'tool':
        return 'כלי דיגיטלי';

      case 'lesson_plan':
        const context = product.type_attributes?.context;
        const estimatedDuration = product.type_attributes?.estimated_duration;

        const lessonParts = [];
        if (context) lessonParts.push(context);
        if (estimatedDuration) lessonParts.push(`${estimatedDuration} דקות`);

        return lessonParts.join(' • ') || 'מערך שיעור';

      default:
        return getProductTypeName(product.product_type);
    }
  };

  // Get subject from type_attributes
  const getStudyClass = () => {
    if (product.product_type === 'tool' && product.category) {
      return getToolCategoryLabel(product.category);
    }
    return product.type_attributes?.subject || product.category || '';
  };

  // Get grade range for display
  const getGradeRange = () => {
    if (!product.type_attributes) return '';
    const { grade_min, grade_max } = product.type_attributes;
    if (!grade_min && !grade_max) return '';

    if (grade_min && grade_max) {
      if (grade_min === grade_max) {
        return HEBREW_GRADES[grade_min] || `כיתה ${grade_min}`;
      }
      const minName = HEBREW_GRADES[grade_min] || grade_min;
      const maxName = HEBREW_GRADES[grade_max] || grade_max;
      return `כיתות ${minName.replace('כיתה ', '')}-${maxName.replace('כיתה ', '')}`;
    }

    if (grade_min) {
      const minName = HEBREW_GRADES[grade_min] || `כיתה ${grade_min}`;
      return `מ${minName}`;
    }

    if (grade_max) {
      const maxName = HEBREW_GRADES[grade_max] || `כיתה ${grade_max}`;
      return `עד ${maxName}`;
    }

    return '';
  };

  // Get truncated description - prioritize short_description, then extract plain text from description
  const getTruncatedDescription = () => {
    // Prefer short_description as it's designed to be brief
    if (product.short_description && product.short_description.trim()) {
      return product.short_description;
    }

    // For description, extract plain text first, then truncate
    const desc = product.description || '';
    if (!desc.trim()) return '';

    // Extract plain text from HTML content
    const plainText = extractPlainText(desc);
    const maxLength = size === 'sm' ? 80 : size === 'md' ? 120 : 160;
    return plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText;
  };


  // Handle click events
  const handleClick = (e) => {
    if (disabled) return;

    if (mode === 'select' && onSelect) {
      onSelect(product, !selected);
    } else if (onView) {
      onView(product);
    }
  };

  const handleSelectChange = (checked) => {
    if (disabled) return;
    if (onSelect) onSelect(product, checked);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (onEdit) onEdit(product);
  };

  const handleViewClick = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (onView) onView(product);
  };

  // Render based on layout
  if (layout === 'list') {
    return (
      <div
        className={`flex items-center gap-4 p-4 border rounded-lg hover:shadow-sm transition-all duration-200 cursor-pointer ${
          selected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        onClick={handleClick}
      >
        {/* Selection checkbox for select mode */}
        {mode === 'select' && (
          <Checkbox
            checked={selected}
            onCheckedChange={handleSelectChange}
            disabled={disabled}
            className="mr-2"
          />
        )}

        {/* Product image */}
        {showImage && (
          <div className={`flex-shrink-0 ${config.imageHeight} w-20 rounded-lg overflow-hidden`}>
            <ProductImage
              product={product}
              className="w-full h-full object-cover"
              iconClassName={`${config.iconSize} text-gray-400`}
              containerClassName="w-full h-full"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Title and type icon */}
              <div className="flex items-center gap-2 mb-1">
                {showTypeIcon && (
                  <ProductTypeIcon className={`${config.iconSize} text-gray-500 flex-shrink-0`} />
                )}
                <h3 className={`font-semibold ${config.titleSize} text-gray-900 line-clamp-1`}>
                  {product.title}
                </h3>
              </div>

              {/* Context/Description */}
              {showDescription && (
                <p className={`${config.descriptionSize} text-gray-600 line-clamp-1 mb-2`}>
                  {getTruncatedDescription() || getSmartContext()}
                </p>
              )}

              {/* Tags and grades in one line */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Study subject */}
                {getStudyClass() && (
                  <Badge
                    variant="outline"
                    className={`${config.badgeSize} ${getSubjectColors(getStudyClass()).bg} ${getSubjectColors(getStudyClass()).text} border ${getSubjectColors(getStudyClass()).border}`}
                  >
                    {getStudyClass()}
                  </Badge>
                )}

                {/* Grade range */}
                {showGrades && getGradeRange() && (
                  <Badge variant="secondary" className={`${config.badgeSize}`}>
                    {getGradeRange()}
                  </Badge>
                )}

                {/* Tags */}
                {showTags && product.tags && product.tags.length > 0 && (
                  <Badge variant="outline" className={`${config.badgeSize}`}>
                    {product.tags.filter(tag => tag && tag.trim()).slice(0, 1)[0]}
                  </Badge>
                )}
              </div>
            </div>

            {/* Price and actions */}
            <div className="flex items-center gap-2 mr-4">
              {/* Price */}
              {showPrice && (
                <div className="text-left">
                  <PriceDisplayTag
                    originalPrice={product.price}
                    discount={product.discount || 0}
                    variant="simple"
                    size="xs"
                    showDiscount={true}
                  />
                </div>
              )}

              {/* Action buttons */}
              {mode === 'purchase' && showActionBar ? (
                <ProductActionBar
                  product={{...product, purchase: purchase}}
                  size={config.buttonSize}
                  showCartButton={true}
                  onPurchaseSuccess={handlePurchaseSuccess}
                  onFileAccess={onFileAccess}
                  onPdfPreview={onPdfPreview}
                  compact={true}
                />
              ) : (
                <div className="flex items-center gap-1">
                  {onView && (
                    <Button
                      size={config.buttonSize}
                      variant="outline"
                      onClick={handleViewClick}
                      disabled={disabled}
                    >
                      <Eye className={config.iconSize} />
                    </Button>
                  )}

                  {onEdit && (
                    <Button
                      size={config.buttonSize}
                      variant="outline"
                      onClick={handleEditClick}
                      disabled={disabled}
                    >
                      <Edit className={config.iconSize} />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'compact') {
    return (
      <div
        className={`border rounded-lg ${config.cardPadding} hover:shadow-sm transition-all duration-200 cursor-pointer ${
          selected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        onClick={handleClick}
      >
        {/* Selection checkbox for select mode */}
        {mode === 'select' && (
          <div className="flex items-center justify-between mb-2">
            <Checkbox
              checked={selected}
              onCheckedChange={handleSelectChange}
              disabled={disabled}
            />
            {showPrice && (
              <PriceDisplayTag
                originalPrice={product.price}
                discount={product.discount || 0}
                variant="simple"
                size="xs"
                showDiscount={true}
              />
            )}
          </div>
        )}

        {/* Title and type */}
        <div className="flex items-center gap-2 mb-2">
          {showTypeIcon && (
            <ProductTypeIcon className={`${config.iconSize} text-gray-500 flex-shrink-0`} />
          )}
          <h3 className={`font-semibold ${config.titleSize} text-gray-900 line-clamp-2`}>
            {product.title}
          </h3>
        </div>

        {/* Context */}
        <p className={`${config.descriptionSize} text-gray-600 line-clamp-2 mb-3`}>
          {showDescription ? (getTruncatedDescription() || getSmartContext()) : getSmartContext()}
        </p>

        {/* Price display for purchase mode */}
        {mode === 'purchase' && showPrice && (
          <div className="mb-3">
            <PriceDisplayTag
              originalPrice={product.price}
              discount={product.discount || 0}
              variant="simple"
              size="sm"
              showDiscount={true}
            />
          </div>
        )}

        {/* Bottom section */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {/* Study subject */}
            {getStudyClass() && (
              <Badge
                variant="outline"
                className={`${config.badgeSize} ${getSubjectColors(getStudyClass()).bg} ${getSubjectColors(getStudyClass()).text}`}
              >
                {getStudyClass()}
              </Badge>
            )}

            {/* Grade range */}
            {showGrades && getGradeRange() && (
              <Badge variant="secondary" className={`${config.badgeSize}`}>
                {getGradeRange()}
              </Badge>
            )}
          </div>

          {/* Actions */}
          {mode === 'purchase' && showActionBar ? (
            <ProductActionBar
              product={{...product, purchase: purchase}}
              size={config.buttonSize}
              showCartButton={true}
              onPurchaseSuccess={handlePurchaseSuccess}
              onFileAccess={onFileAccess}
              onPdfPreview={onPdfPreview}
              compact={true}
            />
          ) : (
            <div className="flex items-center gap-1">
              {onView && (
                <Button
                  size={config.buttonSize}
                  variant="outline"
                  onClick={handleViewClick}
                  disabled={disabled}
                >
                  <Eye className={config.iconSize} />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default: card layout
  return (
    <div
      className={`group transition-all duration-300 hover:scale-[1.02] cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <Card className={`overflow-hidden ${selected ? 'ring-2 ring-blue-500' : ''}`}>
        {/* Image section */}
        {showImage && (
          <div className={`relative ${config.imageHeight} overflow-hidden`}>
            <ProductImage
              product={product}
              className="w-full h-full object-cover"
              iconClassName="w-8 h-8 text-gray-400"
              containerClassName="w-full h-full"
            />

            {/* Overlay elements */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            {/* Selection checkbox for select mode */}
            {mode === 'select' && (
              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  checked={selected}
                  onCheckedChange={handleSelectChange}
                  disabled={disabled}
                  className="bg-white/90 border-white/90"
                />
              </div>
            )}

            {/* Type icon */}
            {showTypeIcon && (
              <div className="absolute top-2 right-2 z-10">
                <div className="bg-white/90 backdrop-blur-sm rounded-full p-1">
                  <ProductTypeIcon className={`${config.iconSize} text-gray-700`} />
                </div>
              </div>
            )}

            {/* Price */}
            {showPrice && (
              <div className="absolute bottom-2 right-2 z-10">
                <div className="bg-white/95 backdrop-blur-sm rounded-full px-2 py-1">
                  <PriceDisplayTag
                    originalPrice={product.price}
                    discount={product.discount || 0}
                    variant="simple"
                    size="xs"
                    showDiscount={true}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content section */}
        <CardContent className={config.cardPadding}>
          {/* Title */}
          <h3 className={`font-semibold ${config.titleSize} text-gray-900 line-clamp-2 mb-2`}>
            {product.title}
          </h3>

          {/* Description */}
          {showDescription && (
            <p className={`${config.descriptionSize} text-gray-600 line-clamp-2 mb-3`}>
              {getTruncatedDescription() || getSmartContext()}
            </p>
          )}

          {/* Creator */}
          {showCreator && product.creator && (
            <p className={`${config.descriptionSize} text-gray-500 mb-2`}>
              {product.creator.full_name}
            </p>
          )}

          {/* Tags and grades */}
          <div className="flex flex-wrap gap-1 mb-3">
            {/* Study subject */}
            {getStudyClass() && (
              <Badge
                variant="outline"
                className={`${config.badgeSize} ${getSubjectColors(getStudyClass()).bg} ${getSubjectColors(getStudyClass()).text} border ${getSubjectColors(getStudyClass()).border}`}
              >
                {getStudyClass()}
              </Badge>
            )}

            {/* Grade range */}
            {showGrades && getGradeRange() && (
              <Badge variant="secondary" className={`${config.badgeSize}`}>
                {getGradeRange()}
              </Badge>
            )}

            {/* Tags */}
            {showTags && product.tags && product.tags.length > 0 && (
              product.tags.filter(tag => tag && tag.trim()).slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="outline" className={`${config.badgeSize}`}>
                  {tag}
                </Badge>
              ))
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            {mode === 'purchase' && showActionBar ? (
              <ProductActionBar
                product={{...product, purchase: purchase}}
                size={config.buttonSize}
                showCartButton={true}
                onPurchaseSuccess={handlePurchaseSuccess}
                onFileAccess={onFileAccess}
                onPdfPreview={onPdfPreview}
                className="flex-1"
              />
            ) : (
              <div className="flex items-center gap-2 flex-1">
                {onView && (
                  <Button
                    size={config.buttonSize}
                    variant="outline"
                    onClick={handleViewClick}
                    disabled={disabled}
                  >
                    <Eye className={`${config.iconSize} ml-1`} />
                    צפייה
                  </Button>
                )}
              </div>
            )}

            {onEdit && (
              <Button
                size={config.buttonSize}
                variant="ghost"
                onClick={handleEditClick}
                disabled={disabled}
              >
                <Edit className={config.iconSize} />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}