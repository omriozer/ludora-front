import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, X, TrendingUp } from 'lucide-react';
import { getProductTypeName } from '@/config/productTypes';
import { getToolCategoryLabel } from '@/config/toolCategories';

/**
 * Unified Catalog Filters Component
 * Handles all filtering options based on product type configuration
 */
export default function CatalogFilters({
  config,
  typeConfig,
  filters,
  categories,
  settings,
  onFiltersChange,
  onClearFilters,
  currentUser
}) {
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'sortBy' || key === 'sortOrder') return false;
    return value !== '' && value !== 'all';
  });

  const renderFilter = (filterType) => {
    switch (filterType) {
      case 'search':
        return (
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={config.searchPlaceholder}
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              className="pr-10 h-9 text-sm border-gray-300 text-right"
              dir="rtl"
            />
          </div>
        );

      case 'category':
        return (
          <Select value={filters.category} onValueChange={(value) => onFiltersChange({ category: value })}>
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
          <Select value={filters.grade} onValueChange={(value) => onFiltersChange({ grade: value })}>
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
          <Select value={filters.subject} onValueChange={(value) => onFiltersChange({ subject: value })}>
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
          <Select value={filters.audience} onValueChange={(value) => onFiltersChange({ audience: value })}>
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
          <Select value={filters.gameType} onValueChange={(value) => onFiltersChange({ gameType: value })}>
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
          <Select value={filters.price} onValueChange={(value) => onFiltersChange({ price: value })}>
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
          <Select value={filters.publishStatus} onValueChange={(value) => onFiltersChange({ publishStatus: value })}>
            <SelectTrigger className="h-9 text-sm w-32 border-gray-300 text-right" dir="rtl">
              <SelectValue>
                {filters.publishStatus === 'all' ? 'סטטוס פרסום' :
                 filters.publishStatus === 'published' ? 'מפורסמות' : 'לא מפורסמות'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל ה{getProductTypeName(typeConfig.key, 'plural')}</SelectItem>
              <SelectItem value="published">מפורסמות בלבד</SelectItem>
              <SelectItem value="unpublished">לא מפורסמות בלבד</SelectItem>
            </SelectContent>
          </Select>
        );

      case 'skillLevel':
        return (
          <Select value={filters.skillLevel} onValueChange={(value) => onFiltersChange({ skillLevel: value })}>
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
          <div className="flex items-center gap-2">
            {/* Sort Direction Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFiltersChange({ sortOrder: filters.sortOrder === 'DESC' ? 'ASC' : 'DESC' })}
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
            <Select value={filters.sortBy} onValueChange={(value) => onFiltersChange({ sortBy: value })}>
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

  return (
    <Card className="mb-8 border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-3" dir="rtl">
          <Filter className="w-5 h-5 text-gray-500 flex-shrink-0" />

          {/* Render enabled filters */}
          {config.filters.map((filterType) => (
            <React.Fragment key={filterType}>
              {renderFilter(filterType)}
            </React.Fragment>
          ))}

          {/* Clear filters button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="h-9 px-3 text-xs text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 font-medium"
            >
              <X className="w-3 h-3 mr-1" />
              נקה
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}