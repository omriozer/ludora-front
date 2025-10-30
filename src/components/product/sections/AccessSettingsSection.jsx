import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings } from 'lucide-react';

/**
 * AccessSettingsSection - Handles access and pricing settings
 * Access days, lifetime access, pricing configuration
 */
export const AccessSettingsSection = ({
  formData,
  updateFormData,
  isFieldValid,
  getFieldError,
  globalSettings = {},
  isNewProduct = false
}) => {

  // Helper function to get default access days based on product type
  const getDefaultAccessDays = () => {
    switch (formData.product_type) {
      case 'file':
        return globalSettings.default_file_access_days || 365;
      case 'course':
        return globalSettings.default_course_access_days || 365;
      case 'workshop':
        return globalSettings.default_workshop_access_days || 365;
      case 'game':
        return globalSettings.default_game_access_days || 365;
      case 'tool':
        return globalSettings.default_tool_access_days || 365;
      case 'lesson_plan':
        return globalSettings.default_lesson_plan_access_days || 365;
      default:
        return 365;
    }
  };

  // Helper function to check if lifetime access is enabled by default for this product type
  const getDefaultLifetimeAccess = () => {
    switch (formData.product_type) {
      case 'file':
        return globalSettings.file_lifetime_access || false;
      case 'course':
        return globalSettings.course_lifetime_access || false;
      case 'workshop':
        return globalSettings.workshop_lifetime_access || false;
      case 'game':
        return globalSettings.game_lifetime_access || false;
      case 'tool':
        return globalSettings.tool_lifetime_access || false;
      case 'lesson_plan':
        return globalSettings.lesson_plan_lifetime_access || false;
      default:
        return false;
    }
  };

  // Helper function to check if access is lifetime
  const isLifetimeAccess = (accessDays) => {
    // For NEW products: check if we should default to lifetime access based on global settings
    if (isNewProduct) {
      // If access_days is explicitly set, use that value
      if (accessDays !== null && accessDays !== undefined && accessDays !== '') {
        return false; // Has explicit days value
      }

      // If not set, check global default for this product type
      return getDefaultLifetimeAccess();
    }

    // For EXISTING products: empty/null means lifetime access
    return !accessDays || accessDays === '' || accessDays === null || accessDays === undefined;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          הגדרות גישה
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Access Settings Section */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold">הגדרות גישה</h3>
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <Label className="font-medium">גישה לכל החיים</Label>
                <Switch
                  checked={isLifetimeAccess(formData.access_days)}
                  onCheckedChange={(checked) => {
                    updateFormData({
                      access_days: checked ? null : getDefaultAccessDays()
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">ימי גישה (השאר ריק לברירת מחדל)</Label>
                <Input
                  type="number"
                  value={formData.access_days && !isNaN(formData.access_days) ? formData.access_days : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateFormData({
                      access_days: value === '' ? null : (isNaN(parseInt(value)) ? null : parseInt(value))
                    });
                  }}
                  disabled={isLifetimeAccess(formData.access_days)}
                  placeholder={
                    isNewProduct && !formData.access_days ?
                      (getDefaultLifetimeAccess() ? 'ברירת מחדל: גישה לכל החיים' : `ברירת מחדל: ${getDefaultAccessDays()} ימים`) :
                      `ברירת מחדל: ${getDefaultAccessDays()} ימים`
                  }
                  className={!isFieldValid('access_days') ? 'border-red-500' : ''}
                />
                {!isFieldValid('access_days') && (
                  <p className="text-sm text-red-600">{getFieldError('access_days')}</p>
                )}
                <p className="text-xs text-gray-500">
                  {getDefaultLifetimeAccess()
                    ? 'ברירת המחדל הכללית: גישה לכל החיים'
                    : `ברירת המחדל הכללית: ${getDefaultAccessDays()} ימים`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Display Section */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold">מידע תמחור</h3>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Label className="text-sm font-medium text-blue-800">מחיר נוכחי</Label>
              <div className="mt-1">
                <span className="text-2xl font-bold text-blue-900">
                  ₪{formData.price || '0'}
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                המחיר שהלקוחות יראו
              </p>
            </div>

            {/* Access Information Display */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <Label className="text-sm font-medium text-gray-800">מידע גישה</Label>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">סוג גישה:</span>
                  <span className="text-sm font-medium">
                    {isLifetimeAccess(formData.access_days) ? 'גישה לכל החיים' : `${formData.access_days} ימים`}
                  </span>
                </div>

                {!isLifetimeAccess(formData.access_days) && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">מחיר ליום:</span>
                    <span className="text-sm font-medium">
                      ₪{formData.price && formData.access_days ?
                        (parseFloat(formData.price) / parseInt(formData.access_days)).toFixed(2) :
                        '0.00'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Purchase Information */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold">מידע רכישה</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded border text-center">
                <Label className="text-xs font-medium text-gray-600">סה"כ רכישות</Label>
                <div className="text-lg font-bold text-gray-800">
                  {formData.purchases_count || 0}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded border text-center">
                <Label className="text-xs font-medium text-gray-600">סה"כ הורדות</Label>
                <div className="text-lg font-bold text-gray-800">
                  {formData.downloads_count || 0}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded border text-center">
                <Label className="text-xs font-medium text-gray-600">צפיות</Label>
                <div className="text-lg font-bold text-gray-800">
                  {formData.views_count || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};