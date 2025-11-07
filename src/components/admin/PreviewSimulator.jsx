/**
 * Preview Simulator Component
 *
 * Allows admins to simulate and test different preview modes and access control scenarios.
 * Tests selective access control, watermarking, and placeholder behavior.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import {
  PlayCircle,
  Users,
  FileText,
  Image,
  Settings,
  Eye,
  EyeOff,
  Shield,
  TestTube,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap
} from 'lucide-react';
import { getApiBase } from '@/utils/api.js';
import { clog, cerror } from '@/lib/utils';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';

const PreviewSimulator = ({ className = '' }) => {
  const [files, setFiles] = useState([]);
  const [lessonPlans, setLessonPlans] = useState([]);
  const [watermarkTemplates, setWatermarkTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState(null);

  // Simulation settings
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entityType, setEntityType] = useState('file');
  const [simulatedUserType, setSimulatedUserType] = useState('guest');
  const [testScenario, setTestScenario] = useState('basic');

  const userTypes = [
    { value: 'guest', label: 'אורח (ללא הרשאות)', description: 'משתמש לא מחובר' },
    { value: 'user', label: 'משתמש רגיל', description: 'משתמש מחובר ללא רכישות' },
    { value: 'owner', label: 'בעלים', description: 'יוצר הקובץ/מצגת' },
    { value: 'purchaser', label: 'רוכש', description: 'משתמש שרכש גישה' }
  ];

  const testScenarios = [
    { value: 'basic', label: 'בדיקה בסיסית', description: 'בדיקת גישה והרשאות בסיסיות' },
    { value: 'selective_access', label: 'גישה סלקטיבית', description: 'בדיקת עמודים/שקופיות נגישים' },
    { value: 'watermarks', label: 'סימני מים', description: 'בדיקת הפעלת סימני מים' },
    { value: 'placeholders', label: 'תחליפים', description: 'בדיקת תחליפי תוכן מוגבל' },
    { value: 'full_flow', label: 'תהליך מלא', description: 'סימולציה מקיפה של כל המערכת' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Load files, lesson plans, and watermark templates
      const [filesRes, lessonPlansRes, templatesRes] = await Promise.all([
        fetch(`${getApiBase()}/entities/file?limit=20`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${getApiBase()}/entities/lessonplan?limit=20`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${getApiBase()}/system-templates?type=watermark`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const [filesData, lessonPlansData, templatesData] = await Promise.all([
        filesRes.json(),
        lessonPlansRes.json(),
        templatesRes.json()
      ]);

      setFiles(filesData.data || []);
      setLessonPlans(lessonPlansData.data || []);
      setWatermarkTemplates(templatesData.data || []);

      clog('PreviewSimulator: Data loaded', {
        files: filesData.data?.length,
        lessonPlans: lessonPlansData.data?.length,
        templates: templatesData.data?.length
      });

    } catch (error) {
      cerror('PreviewSimulator: Load error:', error);
      toast({
        title: "שגיאה בטעינת נתונים",
        description: "לא הצלחנו לטעון את הנתונים לסימולטור",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async () => {
    if (!selectedEntity) {
      toast({
        title: "בחר ישות לבדיקה",
        description: "אנא בחר קובץ או מצגת לסימולציה",
        variant: "destructive"
      });
      return;
    }

    try {
      setSimulating(true);
      setSimulationResults(null);

      const token = localStorage.getItem('token');
      const simulationPayload = {
        entity_type: entityType,
        entity_id: selectedEntity.id,
        user_type: simulatedUserType,
        test_scenario: testScenario,
        timestamp: new Date().toISOString()
      };

      clog('Running preview simulation:', simulationPayload);

      // Simulate access control check
      const accessCheckResult = await simulateAccessControl(simulationPayload);

      // Simulate content serving
      const contentResult = await simulateContentServing(simulationPayload, accessCheckResult);

      // Simulate watermark application
      const watermarkResult = await simulateWatermarkApplication(simulationPayload, accessCheckResult);

      const results = {
        ...simulationPayload,
        access_control: accessCheckResult,
        content_serving: contentResult,
        watermark_application: watermarkResult,
        summary: generateSimulationSummary(accessCheckResult, contentResult, watermarkResult)
      };

      setSimulationResults(results);

      toast({
        title: "סימולציה הושלמה",
        description: "תוצאות הסימולציה מוכנות לצפייה",
        variant: "default"
      });

    } catch (error) {
      cerror('Simulation error:', error);
      toast({
        title: "שגיאה בסימולציה",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSimulating(false);
    }
  };

  const simulateAccessControl = async (payload) => {
    // Simulate access control logic
    const hasFullAccess = payload.user_type === 'owner' || payload.user_type === 'purchaser';
    const allowPreview = payload.entity_type === 'file'
      ? selectedEntity.allow_preview
      : selectedEntity.allow_slide_preview;

    const accessibleContent = payload.entity_type === 'file'
      ? selectedEntity.accessible_pages
      : selectedEntity.accessible_slides;

    return {
      has_full_access: hasFullAccess,
      allow_preview: allowPreview,
      accessible_content: accessibleContent,
      access_type: hasFullAccess ? 'full' : (allowPreview ? 'preview' : 'denied'),
      restrictions: !hasFullAccess && allowPreview ? {
        restricted_content: true,
        accessible_items: accessibleContent || [],
        watermark_required: true
      } : null
    };
  };

  const simulateContentServing = async (payload, accessResult) => {
    if (accessResult.access_type === 'denied') {
      return {
        content_type: 'access_denied',
        served_content: [],
        placeholders_used: [],
        status: 'denied'
      };
    }

    if (accessResult.access_type === 'full') {
      return {
        content_type: 'full_access',
        served_content: ['all_content'],
        placeholders_used: [],
        status: 'success'
      };
    }

    // Preview mode simulation
    const accessibleItems = accessResult.accessible_content || [];
    const totalItems = payload.entity_type === 'file' ? 10 : 15; // Simulated totals
    const restrictedItems = [];

    for (let i = 1; i <= totalItems; i++) {
      if (!accessibleItems.includes(i) && !accessibleItems.includes(`slide_${i}`)) {
        restrictedItems.push(i);
      }
    }

    return {
      content_type: 'preview',
      served_content: accessibleItems,
      placeholders_used: restrictedItems,
      status: 'partial',
      content_ratio: `${accessibleItems.length}/${totalItems}`,
      replacement_count: restrictedItems.length
    };
  };

  const simulateWatermarkApplication = async (payload, accessResult) => {
    if (accessResult.access_type === 'full' || accessResult.access_type === 'denied') {
      return {
        watermarks_applied: false,
        template_used: null,
        elements_count: 0,
        status: 'skipped'
      };
    }

    const watermarkTemplateId = payload.entity_type === 'file'
      ? selectedEntity.watermark_template_id
      : selectedEntity.watermark_template_id;

    if (!watermarkTemplateId) {
      return {
        watermarks_applied: false,
        template_used: null,
        elements_count: 0,
        status: 'no_template'
      };
    }

    const template = watermarkTemplates.find(t => t.id === watermarkTemplateId);
    if (!template) {
      return {
        watermarks_applied: false,
        template_used: null,
        elements_count: 0,
        status: 'template_not_found'
      };
    }

    const textElements = template.template_data?.textElements?.length || 0;
    const logoElements = template.template_data?.logoElements?.length || 0;

    return {
      watermarks_applied: true,
      template_used: template.name,
      template_id: template.id,
      elements_count: textElements + logoElements,
      text_elements: textElements,
      logo_elements: logoElements,
      variables_substituted: ['filename', 'user', 'date', 'time'],
      status: 'success'
    };
  };

  const generateSimulationSummary = (accessResult, contentResult, watermarkResult) => {
    const issues = [];
    const successes = [];

    if (accessResult.access_type === 'denied') {
      issues.push('גישה נדחתה - המשתמש לא יוכל לצפות בתוכן');
    } else if (accessResult.access_type === 'full') {
      successes.push('גישה מלאה - המשתמש רואה את התוכן המלא');
    } else {
      successes.push('תצוגה מקדימה פעילה - משתמש רואה תוכן חלקי');
    }

    if (contentResult.content_type === 'preview' && contentResult.replacement_count > 0) {
      successes.push(`${contentResult.replacement_count} תחליפים יוצגו למשתמש`);
    }

    if (watermarkResult.watermarks_applied) {
      successes.push(`סימני מים הופעלו עם ${watermarkResult.elements_count} אלמנטים`);
    } else if (watermarkResult.status === 'no_template') {
      issues.push('לא הוגדרה תבנית סימני מים');
    }

    return {
      overall_status: issues.length === 0 ? 'success' : (successes.length > 0 ? 'partial' : 'error'),
      issues,
      successes,
      recommendations: generateRecommendations(accessResult, contentResult, watermarkResult)
    };
  };

  const generateRecommendations = (accessResult, contentResult, watermarkResult) => {
    const recommendations = [];

    if (!accessResult.allow_preview && accessResult.access_type !== 'full') {
      recommendations.push('שקול להפעיל תצוגה מקדימה כדי לאפשר למשתמשים לראות חלק מהתוכן');
    }

    if (accessResult.allow_preview && (!accessResult.accessible_content || accessResult.accessible_content.length === 0)) {
      recommendations.push('הגדר איזה עמודים/שקופיות יהיו זמינים בתצוגה מקדימה');
    }

    if (accessResult.allow_preview && !watermarkResult.watermarks_applied) {
      recommendations.push('הגדר תבנית סימני מים כדי להגן על התוכן בתצוגה מקדימה');
    }

    if (watermarkResult.status === 'template_not_found') {
      recommendations.push('תבנית סימני המים שהוגדרה לא קיימת - בדוק את ההגדרות');
    }

    return recommendations;
  };

  const downloadSimulationReport = () => {
    if (!simulationResults) return;

    const report = {
      simulation_metadata: {
        timestamp: new Date().toISOString(),
        entity_type: entityType,
        entity_id: selectedEntity.id,
        entity_name: selectedEntity.title || selectedEntity.name,
        user_type: simulatedUserType,
        test_scenario: testScenario
      },
      results: simulationResults
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preview-simulation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "דוח הורד",
      description: "דוח הסימולציה נשמר בהצלחה",
      variant: "default"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LudoraLoadingSpinner />
        <span className="mr-2">טוען נתוני סימולטור...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TestTube className="w-6 h-6 text-blue-600" />
              <CardTitle className="text-xl">סימולטור תצוגה מקדימה</CardTitle>
            </div>
            <Badge variant="outline" className="text-blue-700">
              <Zap className="w-4 h-4 ml-1" />
              כלי בדיקה מתקדם
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Simulation Configuration */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                הגדרות סימולציה
              </h3>

              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">סוג ישות</Label>
                  <Select value={entityType} onValueChange={setEntityType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="file">קבצים</SelectItem>
                      <SelectItem value="lessonplan">מצגות לימוד</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    {entityType === 'file' ? 'קובץ לבדיקה' : 'מצגת לבדיקה'}
                  </Label>
                  <Select
                    value={selectedEntity?.id?.toString() || ''}
                    onValueChange={(value) => {
                      const entities = entityType === 'file' ? files : lessonPlans;
                      setSelectedEntity(entities.find(e => e.id.toString() === value));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`בחר ${entityType === 'file' ? 'קובץ' : 'מצגת'}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(entityType === 'file' ? files : lessonPlans).map(entity => (
                        <SelectItem key={entity.id} value={entity.id.toString()}>
                          {entity.title || entity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">סוג משתמש מדומה</Label>
                  <Select value={simulatedUserType} onValueChange={setSimulatedUserType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {userTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-gray-500">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">תרחיש בדיקה</Label>
                  <Select value={testScenario} onValueChange={setTestScenario}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {testScenarios.map(scenario => (
                        <SelectItem key={scenario.value} value={scenario.value}>
                          <div>
                            <div className="font-medium">{scenario.label}</div>
                            <div className="text-xs text-gray-500">{scenario.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={runSimulation}
                  disabled={!selectedEntity || simulating}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {simulating ? (
                    <>
                      <LudoraLoadingSpinner className="w-4 h-4 ml-2" />
                      מריץ סימולציה...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4 ml-2" />
                      הרץ סימולציה
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Entity Details */}
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                {entityType === 'file' ? (
                  <FileText className="w-5 h-5 text-green-600" />
                ) : (
                  <Image className="w-5 h-5 text-purple-600" />
                )}
                פרטי הישות הנבחרת
              </h3>

              {selectedEntity ? (
                <Card className="p-4 border-gray-200">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-500">שם</Label>
                      <p className="font-medium">{selectedEntity.title || selectedEntity.name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">תצוגה מקדימה</Label>
                        <div className="flex items-center gap-1">
                          {(entityType === 'file' ? selectedEntity.allow_preview : selectedEntity.allow_slide_preview) ? (
                            <>
                              <Eye className="w-4 h-4 text-green-500" />
                              <span className="text-green-700 text-sm">מופעלת</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-4 h-4 text-red-500" />
                              <span className="text-red-700 text-sm">מבוטלת</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-gray-500">תבנית סימני מים</Label>
                        <div className="text-sm">
                          {selectedEntity.watermark_template_id ? (
                            <span className="text-purple-700">הוגדרה</span>
                          ) : (
                            <span className="text-gray-500">לא הוגדרה</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500">
                        {entityType === 'file' ? 'עמודים נגישים' : 'שקופיות נגישות'}
                      </Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(entityType === 'file' ? selectedEntity.accessible_pages : selectedEntity.accessible_slides)?.map(item => (
                          <Badge key={item} variant="secondary" className="text-xs">
                            {item}
                          </Badge>
                        )) || <span className="text-xs text-gray-500">כל התוכן נגיש</span>}
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-4 border-dashed border-gray-300">
                  <div className="text-center text-gray-500">
                    <Shield className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">בחר ישות להצגת פרטים</p>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Simulation Results */}
          {simulationResults && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <TestTube className="w-5 h-5 text-indigo-600" />
                  תוצאות הסימולציה
                </h3>
                <Button
                  onClick={downloadSimulationReport}
                  variant="outline"
                  size="sm"
                  className="text-indigo-600 hover:bg-indigo-50"
                >
                  <Download className="w-4 h-4 ml-1" />
                  הורד דוח
                </Button>
              </div>

              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="summary">סיכום</TabsTrigger>
                  <TabsTrigger value="access">בקרת גישה</TabsTrigger>
                  <TabsTrigger value="content">הגשת תוכן</TabsTrigger>
                  <TabsTrigger value="watermarks">סימני מים</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      {simulationResults.summary.overall_status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : simulationResults.summary.overall_status === 'partial' ? (
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <h4 className="font-medium">
                        סטטוס כללי: {simulationResults.summary.overall_status === 'success' ? 'הצלחה' :
                                      simulationResults.summary.overall_status === 'partial' ? 'חלקי' : 'כשל'}
                      </h4>
                    </div>

                    {simulationResults.summary.successes.length > 0 && (
                      <div className="mb-3">
                        <h5 className="font-medium text-green-800 mb-2">הצלחות:</h5>
                        <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                          {simulationResults.summary.successes.map((success, index) => (
                            <li key={index}>{success}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {simulationResults.summary.issues.length > 0 && (
                      <div className="mb-3">
                        <h5 className="font-medium text-red-800 mb-2">בעיות:</h5>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                          {simulationResults.summary.issues.map((issue, index) => (
                            <li key={index}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {simulationResults.summary.recommendations.length > 0 && (
                      <div>
                        <h5 className="font-medium text-blue-800 mb-2">המלצות:</h5>
                        <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                          {simulationResults.summary.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                </TabsContent>

                <TabsContent value="access" className="space-y-4">
                  <Card className="p-4">
                    <h4 className="font-medium mb-3">תוצאות בקרת גישה</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">סוג גישה</Label>
                        <p className="font-medium">{simulationResults.access_control.access_type}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">גישה מלאה</Label>
                        <p className={simulationResults.access_control.has_full_access ? 'text-green-700' : 'text-red-700'}>
                          {simulationResults.access_control.has_full_access ? 'כן' : 'לא'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">תצוגה מקדימה מותרת</Label>
                        <p className={simulationResults.access_control.allow_preview ? 'text-green-700' : 'text-red-700'}>
                          {simulationResults.access_control.allow_preview ? 'כן' : 'לא'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">תוכן נגיש</Label>
                        <p>{simulationResults.access_control.accessible_content?.length || 0} פריטים</p>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="content" className="space-y-4">
                  <Card className="p-4">
                    <h4 className="font-medium mb-3">הגשת תוכן</h4>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-500">סוג תוכן מוגש</Label>
                        <p className="font-medium">{simulationResults.content_serving.content_type}</p>
                      </div>

                      {simulationResults.content_serving.content_ratio && (
                        <div>
                          <Label className="text-xs text-gray-500">יחס תוכן</Label>
                          <p>{simulationResults.content_serving.content_ratio}</p>
                        </div>
                      )}

                      {simulationResults.content_serving.replacement_count > 0 && (
                        <div>
                          <Label className="text-xs text-gray-500">תחליפים שהוצגו</Label>
                          <p className="text-orange-700">{simulationResults.content_serving.replacement_count} תחליפי תוכן מוגבל</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="watermarks" className="space-y-4">
                  <Card className="p-4">
                    <h4 className="font-medium mb-3">סימני מים</h4>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-500">סימני מים הופעלו</Label>
                        <p className={simulationResults.watermark_application.watermarks_applied ? 'text-green-700' : 'text-red-700'}>
                          {simulationResults.watermark_application.watermarks_applied ? 'כן' : 'לא'}
                        </p>
                      </div>

                      {simulationResults.watermark_application.template_used && (
                        <>
                          <div>
                            <Label className="text-xs text-gray-500">תבנית בשימוש</Label>
                            <p className="font-medium">{simulationResults.watermark_application.template_used}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">מספר אלמנטים</Label>
                            <p>{simulationResults.watermark_application.elements_count}
                               ({simulationResults.watermark_application.text_elements} טקסט, {simulationResults.watermark_application.logo_elements} לוגו)
                            </p>
                          </div>
                        </>
                      )}

                      <div>
                        <Label className="text-xs text-gray-500">סטטוס</Label>
                        <p>{simulationResults.watermark_application.status}</p>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PreviewSimulator;