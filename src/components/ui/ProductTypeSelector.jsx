import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { PRODUCT_TYPES, NAV_ITEM_KEYS } from '@/config/productTypes';
import { useUser } from '@/contexts/UserContext';
import { isStaff } from '@/lib/userUtils';
import FeatureFlagService from '@/services/FeatureFlagService';
import { getProductTypeIconByType } from '@/lib/layoutUtils';
import {
  Package,
  Crown
} from 'lucide-react';

/**
 * ProductTypeSelector - A reusable component for selecting product types
 *
 * @param {boolean} includeAllTypes - Whether to include an "All Types" option
 * @param {function} onSelect - Callback when a type is selected (typeKey) => void
 * @param {string} selectedType - Currently selected type key
 * @param {string} layout - Layout style: 'grid' | 'list' (default: 'grid')
 * @param {string} size - Size variant: 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} adminOverride - If true, admin users see all types regardless of visibility (default: false)
 */
export default function ProductTypeSelector({
  includeAllTypes = false,
  onSelect,
  selectedType = null,
  layout = 'grid',
  size = 'md',
  adminOverride = false
}) {
  const { currentUser, settings: userSettings } = useUser();
  const [visibleTypes, setVisibleTypes] = useState([]);
  const [adminOnlyTypes, setAdminOnlyTypes] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  const isAdmin = currentUser && isStaff(currentUser);
  const isContentCreator = currentUser && !!currentUser.content_creator_agreement_sign_date;

  // Load settings for icon configuration
  useEffect(() => {
    // Use settings directly from UserContext
    if (userSettings) {
      setSettings(userSettings);
    } else if (currentUser) {
      // Still loading or no settings - wait
      setSettings(null);
    } else {
      // No user - use empty settings
      setSettings({});
    }
  }, [currentUser, userSettings]);

  // Load visible product types using the same logic as Products.jsx
  useEffect(() => {
    if (settings === null) return; // Wait for settings to load

    const loadVisibleTypes = async () => {
      setLoading(true);
      try {
        const types = [];

        // Add "All Types" option if requested
        if (includeAllTypes) {
          types.push({
            key: 'all',
            singular: 'כל הסוגים',
            description: 'כל סוגי המוצרים במערכת',
            icon: Package,
            gradient: 'from-gray-500 to-gray-600',
            color: 'from-gray-500 to-gray-600'
          });
        }

        // Use navbar ordering: files, tools, games, workshops, courses, lesson_plans
        // Only include product types, not other nav items like classrooms, account, etc.
        const productTypesToCheck = ['file', 'tool', 'game', 'workshop', 'course', 'lesson_plan'];

        const adminOnlyTypesSet = new Set();

        for (const productType of productTypesToCheck) {
          // Map product type to feature key (same logic as Products.jsx)
          const featureKey = productType === 'file' ? 'files' :
                           productType === 'lesson_plan' ? 'lesson_plans' :
                           `${productType}s`;

          try {
            const visibility = await FeatureFlagService.getFeatureVisibility(settings, featureKey);

            // Product management visibility logic
            // Not hidden AND user has admin or content creator access
            const hasAccess = isAdmin || isContentCreator;

            // Check if this type would normally be hidden but is shown due to admin override
            const normallyVisible = visibility !== 'hidden' && hasAccess;
            const shownByAdminOverride = adminOverride && isAdmin && !normallyVisible;

            // Admin override: if adminOverride is true and user is admin, show all types
            const shouldShow = (adminOverride && isAdmin) ||
                             (visibility !== 'hidden' && hasAccess);

            if (shouldShow && PRODUCT_TYPES[productType]) {
              // Get the navbar icon for this product type
              const IconComponent = getProductTypeIconByType(settings, productType);

              // Create enhanced product type config with navbar icon
              const productTypeConfig = {
                ...PRODUCT_TYPES[productType],
                icon: IconComponent
              };

              types.push(productTypeConfig);

              // Track if this type is only shown because of admin override
              if (shownByAdminOverride) {
                adminOnlyTypesSet.add(productType);
              }
            }
          } catch (error) {
            console.warn(`Error checking visibility for ${productType}:`, error);
            // On error, include the type if user has access (fail-safe)
            if ((adminOverride && isAdmin) || (isAdmin || isContentCreator)) {
              if (PRODUCT_TYPES[productType]) {
                // Get the navbar icon for this product type
                const IconComponent = getProductTypeIconByType(settings, productType);

                // Create enhanced product type config with navbar icon
                const productTypeConfig = {
                  ...PRODUCT_TYPES[productType],
                  icon: IconComponent
                };

                types.push(productTypeConfig);
                // If shown by admin override due to error, consider it admin-only
                if (adminOverride && isAdmin) {
                  adminOnlyTypesSet.add(productType);
                }
              }
            }
          }
        }

        setAdminOnlyTypes(adminOnlyTypesSet);

        setVisibleTypes(types);
      } catch (error) {
        console.error('Error loading visible product types:', error);
        // Fallback: show types based on user access only
        const fallbackTypes = [];
        if (includeAllTypes) {
          fallbackTypes.push({
            key: 'all',
            singular: 'כל הסוגים',
            description: 'כל סוגי המוצרים במערכת',
            icon: Package,
            gradient: 'from-gray-500 to-gray-600',
            color: 'from-gray-500 to-gray-600'
          });
        }
        if (isAdmin || isContentCreator) {
          fallbackTypes.push(...Object.values(PRODUCT_TYPES));
        }
        setVisibleTypes(fallbackTypes);
      }
      setLoading(false);
    };

    loadVisibleTypes();
  }, [currentUser, includeAllTypes, adminOverride, isAdmin, isContentCreator, settings]);

  // Size configuration
  const sizeConfig = {
    sm: {
      iconContainer: 'w-8 h-8',
      icon: 'w-4 h-4',
      padding: 'p-3',
      title: 'text-sm font-medium',
      description: 'text-xs',
      cols: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'
    },
    md: {
      iconContainer: 'w-12 h-12',
      icon: 'w-6 h-6',
      padding: 'p-4',
      title: 'text-base font-medium',
      description: 'text-sm',
      cols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
    },
    lg: {
      iconContainer: 'w-16 h-16',
      icon: 'w-8 h-8',
      padding: 'p-6',
      title: 'text-lg font-semibold',
      description: 'text-base',
      cols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    }
  };

  const config = sizeConfig[size];

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-500">טוען סוגי מוצרים...</p>
      </div>
    );
  }

  if (visibleTypes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>לא נמצאו סוגי מוצרים זמינים</p>
      </div>
    );
  }

  if (layout === 'list') {
    return (
      <div className="space-y-2">
        {visibleTypes.map((type) => {
          const IconComponent = type.key === 'all' ? Package : type.icon;
          const isSelected = selectedType === type.key;
          const isAdminOnly = adminOnlyTypes.has(type.key);

          return (
            <Card
              key={type.key}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:shadow-lg hover:scale-[1.02]'
              }`}
              onClick={() => onSelect?.(type.key)}
            >
              <CardContent className={`${config.padding} flex items-center gap-3`}>
                <div className="relative">
                  <div className={`${config.iconContainer} rounded-xl bg-gradient-to-r ${type.gradient || type.color} flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className={`${config.icon} text-white`} />
                  </div>
                  {isAdminOnly && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                      <Crown className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`${config.title} text-gray-900 truncate flex items-center gap-1`}>
                    {type.singular}
                    {isAdminOnly && (
                      <Crown className="w-3 h-3 text-orange-500 flex-shrink-0" />
                    )}
                  </h4>
                  {type.description && (
                    <p className={`${config.description} text-gray-500 line-clamp-2`}>
                      {type.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Grid layout (default)
  return (
    <div className={`grid ${config.cols} gap-3`}>
      {visibleTypes.map((type) => {
        const IconComponent = type.key === 'all' ? Package : type.icon;
        const isSelected = selectedType === type.key;
        const isAdminOnly = adminOnlyTypes.has(type.key);

        return (
          <Card
            key={type.key}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              isSelected
                ? 'ring-2 ring-blue-500 bg-blue-50'
                : 'hover:shadow-lg hover:scale-105'
            }`}
            onClick={() => onSelect?.(type.key)}
          >
            <CardContent className={`${config.padding} text-center space-y-3`}>
              <div className="relative">
                <div className={`${config.iconContainer} rounded-xl bg-gradient-to-r ${type.gradient || type.color} flex items-center justify-center mx-auto`}>
                  <IconComponent className={`${config.icon} text-white`} />
                </div>
                {isAdminOnly && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <Crown className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h4 className={`${config.title} text-gray-900 flex items-center justify-center gap-1`}>
                  {type.singular}
                  {isAdminOnly && size === 'sm' && (
                    <Crown className="w-3 h-3 text-orange-500" />
                  )}
                </h4>
                {type.description && size !== 'sm' && (
                  <p className={`${config.description} text-gray-500 mt-1 line-clamp-2`}>
                    {type.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}