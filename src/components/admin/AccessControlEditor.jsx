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
import { clog, cerror } from '@/lib/utils';
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

      clog('AccessControlEditor: Data loaded', {
        entityType,
        entityId
      });

    } catch (error) {
      cerror('AccessControlEditor: Load error:', error);
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

  const addAccessiblePage = () => {
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

    updateField('accessible_pages', newPages);
    setNewPageInput('');

    toast({
      title: "עמודים נוספו",
      description: `נוספו ${pageNumbers.length} עמודים לרשימת הגישה`,
      variant: "default"
    });
  };

  const removeAccessiblePage = (pageNumber) => {
    const currentPages = getCurrentValue('accessible_pages') || [];
    updateField('accessible_pages', currentPages.filter(p => p !== pageNumber));
  };

  const addAccessibleSlide = () => {
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

    updateField('accessible_slides', newSlides);
    setNewSlideInput('');

    toast({
      title: "שקופיות נוספו",
      description: `נוספו ${slideNumbers.length} שקופיות לרשימת הגישה`,
      variant: "default"
    });
  };

  const removeAccessibleSlide = (slideId) => {
    const currentSlides = getCurrentValue('accessible_slides') || [];
    updateField('accessible_slides', currentSlides.filter(s => s !== slideId));
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

      clog('AccessControlEditor: Settings saved', { entityType, entityId, changes: changesToSave });

    } catch (error) {
      cerror('AccessControlEditor: Save error:', error);
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
  const isLessonPlan = entityType === 'lessonplan';

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">
              בקרת גישה - {isFile ? 'קובץ' : 'מצגת'}
            </CardTitle>
          </div>

          <div className="flex gap-2">
            {hasChanges && (
              <Button onClick={resetChanges} variant="outline" size="sm">
                <X className="w-4 h-4 ml-1" />
                ביטול שינויים
              </Button>
            )}
            <Button
              onClick={saveChanges}
              disabled={!hasChanges || saving}
              size="sm"
            >
              {saving ? (
                <LudoraLoadingSpinner className="w-4 h-4 ml-1" />
              ) : (
                <Save className="w-4 h-4 ml-1" />
              )}
              שמירה
            </Button>
          </div>
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
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-green-600" />
                  <h3 className="font-medium">עמודים נגישים בתצוגה מקדימה</h3>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="עמודים: 1, 3-5, 7 (מספרים בודדים או טווחים)"
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
                  <p className="text-sm text-gray-500 italic">
                    {getCurrentValue('allow_preview')
                      ? 'לא הוגדרו עמודים נגישים - כל הקובץ יהיה זמין'
                      : 'תצוגה מקדימה מבוטלת'
                    }
                  </p>
                )}
              </div>
            )}

            {isLessonPlan && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Image className="w-5 h-5 text-purple-600" />
                  <h3 className="font-medium">שקופיות נגישות בתצוגה מקדימה</h3>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="שקופיות: 1, 3-5, 7 (מספרים בודדים או טווחים)"
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
                  <p className="text-sm text-gray-500 italic">
                    {getCurrentValue('allow_slide_preview')
                      ? 'לא הוגדרו שקופיות נגישות - כל המצגת תהיה זמינה'
                      : 'תצוגה מקדימה מבוטלת'
                    }
                  </p>
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