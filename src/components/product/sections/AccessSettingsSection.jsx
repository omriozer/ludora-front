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
  getFieldError
}) => {

  // Helper function to check if access is lifetime
  const isLifetimeAccess = (accessDays) => {
    return !accessDays || accessDays === '' || accessDays === null;
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
                      access_days: checked ? "" : "30"
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">ימי גישה (השאר ריק לברירת מחדל)</Label>
                <Input
                  type="number"
                  value={formData.access_days || ''}
                  onChange={(e) => updateFormData({ access_days: e.target.value })}
                  disabled={isLifetimeAccess(formData.access_days)}
                  placeholder="השאר ריק לברירת מחדל"
                  className={!isFieldValid('access_days') ? 'border-red-500' : ''}
                />
                {!isFieldValid('access_days') && (
                  <p className="text-sm text-red-600">{getFieldError('access_days')}</p>
                )}
                <p className="text-xs text-gray-500">
                  אם לא מוגדר, יתפוס ברירת מחדל מההגדרות הכלליות
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