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
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';

const AccessControlEditor = ({
  entityType,
  entityId,
  onUpdate,
  className = ''
}) => {
  const [entity, setEntity] = useState(null);
  const [watermarkTemplates, setWatermarkTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState({});
  const [newPageInput, setNewPageInput] = useState('');
  const [newSlideInput, setNewSlideInput] = useState('');

  // Load entity data and watermark templates
  useEffect(() => {
    loadData();
  }, [entityType, entityId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Load entity data
      const entityResponse = await fetch(`${getApiBase()}/entities/${entityType}/${entityId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!entityResponse.ok) {
        throw new Error('Failed to load entity data');
      }

      const entityData = await entityResponse.json();
      setEntity(entityData);

      // Load watermark templates
      const templatesResponse = await fetch(`${getApiBase()}/system-templates?type=watermark`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setWatermarkTemplates(templatesData.data || []);
      }

      clog('AccessControlEditor: Data loaded', {
        entityType,
        entityId,
        templatesCount: watermarkTemplates.length
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

  const addAccessiblePage = () => {
    if (!newPageInput.trim()) return;

    const pageNumbers = newPageInput.split(',').map(p => {
      const num = parseInt(p.trim());
      return isNaN(num) ? null : num;
    }).filter(p => p !== null && p > 0);

    if (pageNumbers.length === 0) {
      toast({
        title: "מספר עמוד לא תקין",
        description: "אנא הכנס מספרי עמודים תקינים (1, 2, 3...)",
        variant: "destructive"
      });
      return;
    }

    const currentPages = getCurrentValue('accessible_pages') || [];
    const newPages = [...new Set([...currentPages, ...pageNumbers])].sort((a, b) => a - b);

    updateField('accessible_pages', newPages);
    setNewPageInput('');
  };

  const removeAccessiblePage = (pageNumber) => {
    const currentPages = getCurrentValue('accessible_pages') || [];
    updateField('accessible_pages', currentPages.filter(p => p !== pageNumber));
  };

  const addAccessibleSlide = () => {
    if (!newSlideInput.trim()) return;

    const slideIds = newSlideInput.split(',').map(s => s.trim()).filter(s => s.length > 0);

    if (slideIds.length === 0) return;

    const currentSlides = getCurrentValue('accessible_slides') || [];
    const newSlides = [...new Set([...currentSlides, ...slideIds])];

    updateField('accessible_slides', newSlides);
    setNewSlideInput('');
  };

  const removeAccessibleSlide = (slideId) => {
    const currentSlides = getCurrentValue('accessible_slides') || [];
    updateField('accessible_slides', currentSlides.filter(s => s !== slideId));
  };

  const saveChanges = async () => {
    if (Object.keys(changes).length === 0) {
      toast({
        title: "אין שינויים לשמירה",
        description: "לא בוצעו שינויים בהגדרות בקרת הגישה",
        variant: "default"
      });
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${getApiBase()}/entities/${entityType}/${entityId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(changes)
      });

      if (!response.ok) {
        throw new Error('Failed to save access control settings');
      }

      const updatedEntity = await response.json();
      setEntity(updatedEntity);
      setChanges({});

      toast({
        title: "הגדרות נשמרו",
        description: "הגדרות בקרת הגישה עודכנו בהצלחה",
        variant: "default"
      });

      if (onUpdate) {
        onUpdate(updatedEntity);
      }

      clog('AccessControlEditor: Settings saved', { entityType, entityId, changes });

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
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              תצוגה מקדימה
            </TabsTrigger>
            <TabsTrigger value="access" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              הרשאות גישה
            </TabsTrigger>
            <TabsTrigger value="watermarks" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              סימני מים
            </TabsTrigger>
          </TabsList>

          {/* Preview Settings Tab */}
          <TabsContent value="preview" className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-blue-900">
                      {isFile ? 'אפשר תצוגה מקדימה' : 'אפשר תצוגת שקופיות'}
                    </h3>
                    <p className="text-sm text-blue-700">
                      {isFile
                        ? 'משתמשים ללא גישה יוכלו לצפות בחלק מהקובץ'
                        : 'משתמשים ללא גישה יוכלו לצפות בחלק מהשקופיות'
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={getCurrentValue(isFile ? 'allow_preview' : 'allow_slide_preview') || false}
                  onCheckedChange={(checked) =>
                    updateField(isFile ? 'allow_preview' : 'allow_slide_preview', checked)
                  }
                />
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <h4 className="font-medium text-yellow-900">שימו לב</h4>
              </div>
              <p className="text-sm text-yellow-800">
                כאשר תצוגה מקדימה מופעלת, משתמשים ללא גישה יוכלו לצפות ב{isFile ? 'עמודים' : 'שקופיות'} שנבחרו בלבד.
                תוכן שמוגבל יוחלף בעמוד/שקופית החלפה המציינת שהתוכן מוגבל.
              </p>
            </div>
          </TabsContent>

          {/* Access Control Tab */}
          <TabsContent value="access" className="space-y-4">
            {isFile && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-green-600" />
                  <h3 className="font-medium">עמודים נגישים בתצוגה מקדימה</h3>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="מספרי עמודים (1,2,3...)"
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

                <div className="flex gap-2">
                  <Input
                    placeholder="מזהי שקופיות (slide_001,slide_002...)"
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

                <div className="flex flex-wrap gap-2">
                  {(getCurrentValue('accessible_slides') || []).map(slideId => (
                    <Badge key={slideId} variant="secondary" className="flex items-center gap-1">
                      {slideId}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-red-500"
                        onClick={() => removeAccessibleSlide(slideId)}
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
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-5 h-5 text-indigo-600" />
                <h3 className="font-medium">תבנית סימני מים</h3>
              </div>

              <Select
                value={getCurrentValue('watermark_template_id')?.toString() || ''}
                onValueChange={(value) => updateField('watermark_template_id', value ? parseInt(value) : null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="בחר תבנית סימני מים (אופציונלי)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">ללא סימני מים</SelectItem>
                  {watermarkTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name} - {template.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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