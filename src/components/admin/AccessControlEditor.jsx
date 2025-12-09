/**
 * Access Control Editor Component
 *
 * Provides interface for configuring selective access control on Files and LessonPlans.
 * Allows setting accessible pages/slides, watermark templates, and preview permissions.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import {
  Shield,
  Eye,
  EyeOff,
  FileText,
  Image,
  Plus,
  X,
  Save,
  AlertTriangle,
  Settings,
  Users,
  Lock
} from 'lucide-react';
import { getApiBase } from '@/utils/api.js';
import { ludlog, luderror } from '@/lib/ludlog';
import { apiRequest } from '@/services/apiClient.js';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import TemplateSelector from '@/components/product/TemplateSelector';

const AccessControlEditor = ({
  entityType,
  entityId,
  onUpdate,
  className = '',
  currentUser = null, // Current user object for email template resolution
  fileEntity = null // File entity object for template filtering and context
}) => {
  const [entity, setEntity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState({});
  const [newPageInput, setNewPageInput] = useState('');
  const [newSlideInput, setNewSlideInput] = useState('');

  // Load entity data
  useEffect(() => {
    loadData();
  }, [entityType, entityId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load entity data using apiRequest
      const entityData = await apiRequest(`/entities/${entityType}/${entityId}`);
      setEntity(entityData);
    } catch (error) {
      luderror.ui('AccessControlEditor: Load error:', error);
      toast({
        title: "שגיאה בטעינת נתונים",
        description: "לא הצלחנו לטעון את נתוני בקרת הגישה",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setChanges(prev => ({ ...prev, [field]: value }));
  };

  const getCurrentValue = (field) => {
    return changes.hasOwnProperty(field) ? changes[field] : entity?.[field];
  };

  const parsePageRanges = (input) => {
    const pageNumbers = [];
    const parts = input.split(',').map(p => p.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        // Handle range like "3-5"
        const [start, end] = part.split('-').map(s => parseInt(s.trim()));
        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
          for (let i = start; i <= end; i++) {
            pageNumbers.push(i);
          }
        }
      } else {
        // Handle single number like "1" or "7"
        const num = parseInt(part);
        if (!isNaN(num) && num > 0) {
          pageNumbers.push(num);
        }
      }
    }

    return pageNumbers;
  };

  const addAccessiblePage = async () => {
    if (!newPageInput.trim()) return;

    const pageNumbers = parsePageRanges(newPageInput);

    if (pageNumbers.length === 0) {
      toast({
        title: "פורמט לא תקין",
        description: "אנא השתמש בפורמט: 1, 3-5, 7 (מספרים בודדים או טווחים)",
        variant: "destructive"
      });
      return;
    }

    const currentPages = getCurrentValue('accessible_pages') || [];
    const newPages = [...new Set([...currentPages, ...pageNumbers])].sort((a, b) => a - b);

    // Immediately save changes to database
    const changeToSave = { accessible_pages: newPages };
    await saveChanges(changeToSave);

    setNewPageInput('');

    toast({
      title: "עמודים נוספו ונשמרו",
      description: `נוספו ${pageNumbers.length} עמודים לרשימת הגישה ונשמרו בבסיס הנתונים`,
      variant: "default"
    });
  };

  const removeAccessiblePage = async (pageNumber) => {
    const currentPages = getCurrentValue('accessible_pages') || [];
    const newPages = currentPages.filter(p => p !== pageNumber);

    // Immediately save changes to database
    const changeToSave = { accessible_pages: newPages };
    await saveChanges(changeToSave);

    toast({
      title: "עמוד הוסר ונשמר",
      description: `עמוד ${pageNumber} הוסר מרשימת הגישה ונשמר בבסיס הנתונים`,
      variant: "default"
    });
  };

  const addAccessibleSlide = async () => {
    if (!newSlideInput.trim()) return;

    const slideNumbers = parsePageRanges(newSlideInput);

    if (slideNumbers.length === 0) {
      toast({
        title: "פורמט לא תקין",
        description: "אנא השתמש בפורמט: 1, 3-5, 7 (מספרים בודדים או טווחים)",
        variant: "destructive"
      });
      return;
    }

    const currentSlides = getCurrentValue('accessible_slides') || [];
    const newSlides = [...new Set([...currentSlides, ...slideNumbers])].sort((a, b) => a - b);

    // Immediately save changes to database
    const changeToSave = { accessible_slides: newSlides };
    await saveChanges(changeToSave);

    setNewSlideInput('');

    toast({
      title: "שקופיות נוספו ונשמרו",
      description: `נוספו ${slideNumbers.length} שקופיות לרשימת הגישה ונשמרו בבסיס הנתונים`,
      variant: "default"
    });
  };

  const removeAccessibleSlide = async (slideId) => {
    const currentSlides = getCurrentValue('accessible_slides') || [];
    const newSlides = currentSlides.filter(s => s !== slideId);

    // Immediately save changes to database
    const changeToSave = { accessible_slides: newSlides };
    await saveChanges(changeToSave);

    toast({
      title: "שקופית הוסרה ונשמרה",
      description: `שקופית ${slideId} הוסרה מרשימת הגישה ונשמרה בבסיס הנתונים`,
      variant: "default"
    });
  };

  const saveChanges = async (specificChanges = null) => {
    const changesToSave = specificChanges || changes;

    if (Object.keys(changesToSave).length === 0) {
      toast({
        title: "אין שינויים לשמירה",
        description: "לא בוצעו שינויים בהגדרות בקרת הגישה",
        variant: "default"
      });
      return;
    }

    try {
      setSaving(true);

      // Save changes using apiRequest
      const updatedEntity = await apiRequest(`/entities/${entityType}/${entityId}`, {
        method: 'PUT',
        body: JSON.stringify(changesToSave)
      });

      setEntity(updatedEntity);

      // Only clear changes if we're saving the current changes, not specific changes
      if (!specificChanges) {
        setChanges({});
      } else {
        // When saving specific changes, update the entity with the new values
        // This ensures the UI reflects the saved state
        const newEntityState = { ...entity, ...changesToSave };
        setEntity(newEntityState);
      }

      toast({
        title: "הגדרות נשמרו",
        description: "הגדרות בקרת הגישה עודכנו בהצלחה",
        variant: "default"
      });

      if (onUpdate) {
        onUpdate(updatedEntity);
      }

      ludlog.ui('AccessControlEditor: Settings saved', { data: { entityType, entityId, changes: changesToSave } });

    } catch (error) {
      luderror.ui('AccessControlEditor: Save error:', error);
      toast({
        title: "שגיאה בשמירה",
        description: "לא הצלחנו לשמור את הגדרות בקרת הגישה",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    setChanges({});
    setNewPageInput('');
    setNewSlideInput('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LudoraLoadingSpinner />
        <span className="mr-2">טוען הגדרות בקרת גישה...</span>
      </div>
    );
  }

  if (!entity) {
    return (
      <Card className={`${className} border-red-200`}>
        <CardContent className="flex items-center justify-center p-8">
          <AlertTriangle className="w-6 h-6 text-red-500 ml-2" />
          <span className="text-red-700">לא הצלחנו לטעון את נתוני הישות</span>
        </CardContent>
      </Card>
    );
  }

  const hasChanges = Object.keys(changes).length > 0;
  const isFile = entityType === 'file';
  const isLessonPlan = entityType === 'lesson_plan';

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-lg">
            בקרת גישה - {isFile ? 'קובץ' : 'מצגת'}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="access" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="access" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              הרשאות גישה
            </TabsTrigger>
            <TabsTrigger value="watermarks" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              סימני מים
            </TabsTrigger>
          </TabsList>

          {/* Access Control Tab */}
          <TabsContent value="access" className="space-y-4">
            {isFile && (
              <div className="space-y-4">
                {/* File Page Count Header */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="font-medium text-blue-900">עמודים נגישים בתצוגה מקדימה</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-blue-700">סה"כ עמודים בקובץ:</span>
                      <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded font-bold">
                        {entity?.page_count || fileEntity?.page_count || entity?.total_pages || fileEntity?.total_pages || 'לא זוהה'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-blue-700 mt-2">
                    📄 בחר אילו עמודים יהיו זמינים לצפייה בתצוגה מקדימה. אם לא נבחר אף עמוד - כל הקובץ יהיה זמין
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder={(() => {
                        const totalPages = entity?.page_count || fileEntity?.page_count || entity?.total_pages || fileEntity?.total_pages;
                        const base = "עמודים: 1, 3-5, 7 (מספרים בודדים או טווחים)";
                        return totalPages ? `${base} - טווח: 1-${totalPages}` : base;
                      })()}
                      value={newPageInput}
                      onChange={(e) => setNewPageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addAccessiblePage()}
                      className="flex-1"
                      disabled={!getCurrentValue('allow_preview')}
                    />
                    <Button
                      onClick={addAccessiblePage}
                      disabled={!newPageInput.trim() || !getCurrentValue('allow_preview')}
                      size="sm"
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      הוסף
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    דוגמאות: <code className="bg-gray-100 px-1 rounded">1</code> (עמוד בודד),
                    <code className="bg-gray-100 px-1 rounded ml-1">3-5</code> (טווח),
                    <code className="bg-gray-100 px-1 rounded ml-1">1, 3-5, 7</code> (שילוב)
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(getCurrentValue('accessible_pages') || []).map(page => (
                    <Badge key={page} variant="secondary" className="flex items-center gap-1">
                      עמוד {page}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-red-500"
                        onClick={() => removeAccessiblePage(page)}
                      />
                    </Badge>
                  ))}
                </div>

                {(!getCurrentValue('accessible_pages') || getCurrentValue('accessible_pages').length === 0) && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <span className="font-medium text-yellow-900">
                        {getCurrentValue('allow_preview')
                          ? 'כל הקובץ זמין לתצוגה מקדימה'
                          : 'תצוגה מקדימה מבוטלת'
                        }
                      </span>
                    </div>
                    {getCurrentValue('allow_preview') && (
                      <p className="text-sm text-yellow-800">
                        🔓 לא הוגדרו עמודים מוגבלים - כל {entity?.page_count || fileEntity?.page_count || entity?.total_pages || fileEntity?.total_pages || ''} העמודים יהיו זמינים לצפייה בתצוגה מקדימה
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {isLessonPlan && (
              <div className="space-y-4">
                {/* Lesson Plan Slide Count Header */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image className="w-5 h-5 text-purple-600" />
                      <h3 className="font-medium text-purple-900">שקופיות נגישות בתצוגה מקדימה</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-purple-700">סה"כ שקופיות במצגת:</span>
                      <span className="bg-purple-200 text-purple-900 px-2 py-1 rounded font-bold">
                        {entity?.total_slides || fileEntity?.total_slides || entity?.slide_count || fileEntity?.slide_count || 'לא זוהה'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-purple-700 mt-2">
                    🎭 בחר אילו שקופיות יהיו זמינות לצפייה בתצוגה מקדימה. אם לא נבחרה אף שקופית - כל המצגת תהיה זמינה
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder={(() => {
                        const totalSlides = entity?.total_slides || fileEntity?.total_slides || entity?.slide_count || fileEntity?.slide_count;
                        const base = "שקופיות: 1, 3-5, 7 (מספרים בודדים או טווחים)";
                        return totalSlides ? `${base} - טווח: 1-${totalSlides}` : base;
                      })()}
                      value={newSlideInput}
                      onChange={(e) => setNewSlideInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addAccessibleSlide()}
                      className="flex-1"
                      disabled={!getCurrentValue('allow_slide_preview')}
                    />
                    <Button
                      onClick={addAccessibleSlide}
                      disabled={!newSlideInput.trim() || !getCurrentValue('allow_slide_preview')}
                      size="sm"
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      הוסף
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    דוגמאות: <code className="bg-gray-100 px-1 rounded">1</code> (שקופית בודדת),
                    <code className="bg-gray-100 px-1 rounded ml-1">3-5</code> (טווח),
                    <code className="bg-gray-100 px-1 rounded ml-1">1, 3-5, 7</code> (שילוב)
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(getCurrentValue('accessible_slides') || []).map(slideNumber => (
                    <Badge key={slideNumber} variant="secondary" className="flex items-center gap-1">
                      שקופית {slideNumber}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-red-500"
                        onClick={() => removeAccessibleSlide(slideNumber)}
                      />
                    </Badge>
                  ))}
                </div>

                {(!getCurrentValue('accessible_slides') || getCurrentValue('accessible_slides').length === 0) && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <span className="font-medium text-yellow-900">
                        {getCurrentValue('allow_slide_preview')
                          ? 'כל המצגת זמינה לתצוגה מקדימה'
                          : 'תצוגה מקדימה מבוטלת'
                        }
                      </span>
                    </div>
                    {getCurrentValue('allow_slide_preview') && (
                      <p className="text-sm text-yellow-800">
                        🔓 לא הוגדרו שקופיות מוגבלות - כל {entity?.total_slides || fileEntity?.total_slides || entity?.slide_count || fileEntity?.slide_count || ''} השקופיות יהיו זמינות לצפייה בתצוגה מקדימה
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Watermarks Tab */}
          <TabsContent value="watermarks" className="space-y-4">
            <div className="space-y-4">
              {/* Use TemplateSelector for consistent interface like branding */}
              <TemplateSelector
                entityType={entityType}
                entityId={entityId}
                templateType="watermark"
                targetFormat={isLessonPlan ? "svg-lessonplan" : (entity?.target_format || "pdf-a4-portrait")}
                currentTemplateId={getCurrentValue('watermark_template_id')}
                customTemplateData={getCurrentValue('watermark_settings')}
                enabled={true} // Always enabled in watermarks tab
                hideToggle={true} // Hide toggle in access control context
                onTemplateChange={(templateId, templateData) => {
                  updateField('watermark_template_id', templateId);
                  // Automatically save watermark template changes
                  const changeToSave = { watermark_template_id: templateId };
                  saveChanges(changeToSave);
                }}
                onCustomTemplateChange={(customData) => {
                  updateField('watermark_settings', customData);
                  // Automatically save custom watermark settings
                  const changeToSave = { watermark_settings: customData };
                  saveChanges(changeToSave);
                }}
                onEnabledChange={() => {}} // No-op since it's automatically managed
                fileExists={true} // Always show when in access control
                userRole="admin" // Assume admin for access control context
                currentUser={currentUser} // Pass current user for email template resolution
                fileEntity={fileEntity} // Pass file entity for template filtering and context
                className="mt-0"
              />

              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-medium text-indigo-900">כיצד פועלים סימני מים</h4>
                </div>
                <ul className="text-sm text-indigo-800 list-disc list-inside space-y-1">
                  <li>סימני מים מופיעים רק בתצוגה מקדימה (למשתמשים ללא גישה מלאה)</li>
                  <li>משתמשים עם גישה מלאה רואים את התוכן המקורי ללא סימני מים</li>
                  <li>סימני מים כולל משתנים דינמיים כמו שם משתמש, תאריך ושם קובץ</li>
                  <li>ניתן להגדיר מיקום, צבע, גודל ושקיפות של סימני המים</li>
                </ul>
              </div>

              {getCurrentValue('watermark_template_id') && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800 font-medium">
                      תבנית סימני מים פעילה - יוחל על תוכן בתצוגה מקדימה
                    </span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AccessControlEditor;