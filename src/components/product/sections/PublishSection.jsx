import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Eye, X, Check, Clock } from 'lucide-react';
import { ludlog } from '@/lib/ludlog';
import { useUser } from '@/contexts/UserContext';

/**
 * PublishSection - Handles publishing settings and final controls
 * Publication toggle, requirements validation, and status display
 */
export const PublishSection = ({
  formData,
  updateFormData,
  canPublish,
  validateForm,
  isAccessible = true,
  accessReason = null,
  editingProduct = null,
  isNewProduct = false,
  currentUser = null,
  hasUploadedFile = false
}) => {
  const { isAdmin } = useUser();

  // Disabled section component
  const DisabledSectionMessage = ({ title, message, icon: Icon }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-gray-400" />
        <Label className="text-sm font-medium text-gray-400">{title}</Label>
      </div>
      <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg text-center">
        <div className="flex flex-col items-center gap-2">
          <Icon className="w-8 h-8 text-gray-300" />
          <p className="text-sm text-gray-500 max-w-md">{message}</p>
        </div>
      </div>
    </div>
  );

  if (!isAccessible) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            פרסום המוצר
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DisabledSectionMessage
            title="פרסום המוצר"
            message={accessReason || "יש לשמור את המוצר תחילה כדי לפרסם אותו"}
            icon={Eye}
          />
        </CardContent>
      </Card>
    );
  }

  const isPublished = formData.is_published;
  const canPublishProduct = canPublish();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          פרסום המוצר
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Publication Status */}
          <div className="space-y-4">
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-3 ${
              canPublishProduct
                ? 'border-blue-200 bg-blue-50'
                : 'border-gray-300 bg-gray-50'
            }`}>
              <div className="flex-1">
                <Label className={`font-bold ${canPublishProduct ? 'text-blue-800' : 'text-gray-600'}`}>
                  מוצר פורסם
                </Label>
                <p className={`text-xs ${canPublishProduct ? 'text-blue-600' : 'text-gray-500'}`}>
                  המוצר יופיע ללקוחות באתר
                </p>
                {!canPublishProduct && (
                  <div className="mt-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <p className="text-xs text-amber-700 font-medium">
                      פרסום לא זמין - יש להשלים את כל הדרישות בסעיף למטה
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Switch
                  checked={isPublished}
                  onCheckedChange={(checked) => updateFormData({ is_published: checked })}
                  disabled={!canPublishProduct}
                />
                {!canPublishProduct && (
                  <span className="text-xs text-gray-500">
                    מושבת
                  </span>
                )}
              </div>
            </div>

            {/* Status Messages */}
            {isPublished ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>המוצר פורסם ופעיל!</strong> לקוחות יכולים לראות ולרכוש את המוצר באתר.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-gray-200 bg-gray-50">
                <AlertCircle className="h-4 w-4 text-gray-600" />
                <AlertDescription className="text-gray-800">
                  <strong>המוצר לא פורסם.</strong> המוצר נמצא במצב טיוטה ולא יופיע ללקוחות.
                </AlertDescription>
              </Alert>
            )}

            {/* Publishing Requirements Checklist */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">דרישות לפרסום</h4>
                {!canPublishProduct && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs text-amber-700 font-medium">דרישות חסרות</span>
                  </div>
                )}
              </div>

              {(() => {
                const validation = validateForm ? validateForm() : { isValid: true, errors: {} };

                const requirements = [
                  {
                    id: 'product_saved',
                    label: 'המוצר נשמר במערכת',
                    status: isNewProduct ? 'failed' : 'passed',
                    description: isNewProduct ? 'יש לשמור את המוצר תחילה' : 'המוצר נשמר בהצלחה'
                  },
                  {
                    id: 'basic_info',
                    label: 'מידע בסיסי הושלם',
                    status: (!validation.errors.title && !validation.errors.description && !validation.errors.price && formData.product_type) ? 'passed' : 'failed',
                    description: (!validation.errors.title && !validation.errors.description && !validation.errors.price && formData.product_type) ?
                      'כותרת, תיאור, מחיר וסוג מוצר מוגדרים' :
                      'חסרים שדות חובה: ' + [
                        validation.errors.title && 'כותרת המוצר',
                        validation.errors.description && 'תיאור',
                        validation.errors.price && 'מחיר',
                        !formData.product_type && 'סוג מוצר'
                      ].filter(Boolean).join(', ')
                  },
                  {
                    id: 'product_content',
                    label: 'תוכן המוצר הוגדר',
                    status: (() => {
                      if (!formData.product_type) return 'pending';

                      // Check if this is a bundle first
                      if (formData.type_attributes?.is_bundle === true) {
                        return (formData.type_attributes?.bundle_items && formData.type_attributes.bundle_items.length >= 2) ? 'passed' : 'failed';
                      }

                      // Regular product type validation
                      switch (formData.product_type) {
                        case 'file':
                          return hasUploadedFile ? 'passed' : 'failed';
                        case 'course':
                          return (formData.course_modules && formData.course_modules.length > 0) ? 'passed' : 'failed';
                        case 'tool':
                          return formData.tool_url ? 'passed' : 'failed';
                        case 'workshop':
                          return formData.total_duration_minutes ? 'passed' : 'failed';
                        default:
                          return 'passed';
                      }
                    })(),
                    description: (() => {
                      if (!formData.product_type) return 'יש לבחור סוג מוצר תחילה';

                      // Check if this is a bundle first
                      if (formData.type_attributes?.is_bundle === true) {
                        return (formData.type_attributes?.bundle_items && formData.type_attributes.bundle_items.length >= 2) ?
                          `קושרו ${formData.type_attributes.bundle_items.length} מוצרים לקיט` : 'יש לקשר לפחות 2 מוצרים לקיט';
                      }

                      // Regular product type descriptions
                      switch (formData.product_type) {
                        case 'file':
                          return hasUploadedFile ? 'קובץ הועלה בהצלחה' : 'יש להעלות קובץ';
                        case 'course':
                          return (formData.course_modules && formData.course_modules.length > 0) ?
                            `הוגדרו ${formData.course_modules.length} מודולים` : 'יש להגדיר לפחות מודול אחד';
                        case 'tool':
                          return formData.tool_url ? 'כתובת הכלי הוגדרה' : 'יש להגדיר כתובת כלי';
                        case 'workshop':
                          return formData.total_duration_minutes ? 'משך הסדנה הוגדר' : 'יש להגדיר משך סדנה';
                        default:
                          return 'תוכן המוצר מוגדר';
                      }
                    })()
                  },
                  {
                    id: 'validation',
                    label: 'כל השדות תקינים',
                    status: validation.isValid ? 'passed' : 'failed',
                    description: validation.isValid ?
                      'כל הנתונים עברו אימות' :
                      'שגיאות אימות: ' + Object.entries(validation.errors).map(([field, error]) => {
                        // Translate field names to Hebrew
                        const fieldNames = {
                          title: 'כותרת',
                          description: 'תיאור',
                          price: 'מחיר',
                          product_type: 'סוג מוצר',
                          access_days: 'ימי גישה',
                          total_duration_minutes: 'משך בדקות',
                          course_modules: 'מודולי קורס',
                          tool_url: 'כתובת כלי',
                          grade_min: 'כיתה מינימלית',
                          grade_max: 'כיתה מקסימלית',
                          subject: 'מקצוע',
                          game_type: 'סוג משחק',
                          digital: 'סוג הגרסה'
                        };
                        const fieldName = fieldNames[field] || field;
                        return `${fieldName}: ${error}`;
                      }).join(', ')
                  }
                ];

                const passedCount = requirements.filter(req => req.status === 'passed').length;
                const totalCount = requirements.length;
                const allPassed = passedCount === totalCount;

                return (
                  <div className="space-y-3">
                    {/* Progress Summary */}
                    <div className={`p-4 rounded-lg border-2 ${allPassed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center gap-3">
                        {allPassed ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-600" />
                        )}
                        <div>
                          <div className="font-semibold">
                            {allPassed ? 'מוכן לפרסום!' : 'דרישות לא הושלמו'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {passedCount} מתוך {totalCount} דרישות הושלמו
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Requirements List */}
                    <div className="space-y-2">
                      {requirements.map((req) => (
                        <div key={req.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                          req.status === 'passed'
                            ? 'bg-green-50 border-green-200'
                            : req.status === 'failed'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex-shrink-0 mt-0.5">
                            {req.status === 'passed' ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : req.status === 'failed' ? (
                              <X className="w-4 h-4 text-red-600" />
                            ) : (
                              <Clock className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium text-sm ${
                              req.status === 'passed'
                                ? 'text-green-800'
                                : req.status === 'failed'
                                ? 'text-red-800'
                                : 'text-gray-700'
                            }`}>
                              {req.label}
                            </div>
                            <div className={`text-xs mt-1 ${
                              req.status === 'passed'
                                ? 'text-green-600'
                                : req.status === 'failed'
                                ? 'text-red-600'
                                : 'text-gray-500'
                            }`}>
                              {req.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Publication Information */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold">מידע פרסום</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded border">
                <Label className="text-sm font-medium text-gray-700">סטטוס נוכחי</Label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isPublished
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {isPublished ? '✓ פורסם' : '○ טיוטה'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded border">
                <Label className="text-sm font-medium text-gray-700">זמין לפרסום</Label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    canPublishProduct
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {canPublishProduct ? '✓ זמין' : '✗ לא זמין'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ludora Creator Toggle - Admin Only */}
          {isAdmin() && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold">הגדרות יוצר</h3>
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-purple-900">מוצר של לודורה (למנהלים בלבד)</Label>
                  <p className="text-xs text-purple-600">
                    כאשר מופעל, המוצר ישויך ללודורה ולא למשתמש הנוכחי. היוצר יוצג כ"Ludora"
                  </p>
                </div>
                <Switch
                  checked={formData.creator_user_id === null}
                  onCheckedChange={(checked) => updateFormData({
                    creator_user_id: checked ? null : currentUser?.uid || null
                  })}
                />
              </div>
            </div>
          )}

          {/* Important Notes */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">חשוב לדעת:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• לאחר פרסום המוצר, לקוחות יוכלו לראות אותו ולרכוש אותו</li>
              <li>• ניתן לבטל פרסום בכל עת על ידי כיבוי המתג</li>
              <li>• שינויים במוצר מפורסם יהיו גלויים מיד ללקוחות</li>
              <li>• מוצרים לא פורסמים נשמרים כטיוטות</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};