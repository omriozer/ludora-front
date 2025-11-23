import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { clog, cerror } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { apiRequest } from "@/services/apiClient.js";
import { getTextFontFamily } from "@/utils/hebrewUtils";
import { urls } from '@/config/urls';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import VisualTemplateEditor from "@/components/templates/VisualTemplateEditor";
import LogoDisplay from '@/components/ui/LogoDisplay';
import {
  ArrowRight,
  Save,
  Palette,
  AlertCircle,
  CheckCircle,
  RectangleVertical,
  RectangleHorizontal,
  Monitor
} from "lucide-react";

export default function TemplateEditor() {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const location = useLocation();
  const { currentUser, isLoading: userLoading } = useUser();

  const [template, setTemplate] = useState({
    name: '',
    description: '',
    template_type: 'branding',
    target_format: 'pdf-a4-portrait',
    is_default: false,
    template_data: {}
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showVisualEditor, setShowVisualEditor] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(!templateId);

  // Target format options
  const targetFormats = [
    {
      value: 'pdf-a4-portrait',
      label: 'PDF A4 לאורך',
      icon: <RectangleVertical className="w-4 h-4" />,
      type: 'pdf'
    },
    {
      value: 'pdf-a4-landscape',
      label: 'PDF A4 לרוחב',
      icon: <RectangleHorizontal className="w-4 h-4" />,
      type: 'pdf'
    },
    {
      value: 'svg-lessonplan',
      label: 'SVG מצגת שיעור',
      icon: <Monitor className="w-4 h-4" />,
      type: 'svg'
    }
  ];

  const templateTypes = [
    { value: 'branding', label: 'מיתוג' },
    { value: 'watermark', label: 'סימן מים' }
  ];

  useEffect(() => {
    // Get template type from location state (when navigating from template manager)
    const templateType = location.state?.templateType;
    if (templateType && isCreateMode) {
      setTemplate(prev => ({
        ...prev,
        template_type: templateType,
        target_format: getDefaultTargetFormat(templateType),
        template_data: getDefaultTemplateData(templateType)
      }));
    }
  }, [location.state, isCreateMode]);

  useEffect(() => {
    if (!userLoading) {
      if (templateId) {
        loadTemplate();
      }
    }
  }, [templateId, userLoading]);

  const getDefaultTargetFormat = (templateType) => {
    if (templateType === 'watermark') {
      return 'svg-lessonplan'; // Watermarks are primarily for lesson plans
    } else if (templateType === 'branding') {
      return 'pdf-a4-portrait'; // Branding templates default to portrait PDFs
    }
    return 'pdf-a4-portrait'; // Fallback
  };

  const getAvailableTargetFormats = (templateType) => {
    if (templateType === 'watermark') {
      // Watermarks work on all formats but are primarily for lesson plans
      return targetFormats;
    } else if (templateType === 'branding') {
      // Branding templates work on all formats
      return targetFormats;
    }
    return targetFormats; // All formats available by default
  };

  const getTemplateTypeLabel = (templateType) => {
    const typeObj = templateTypes.find(t => t.value === templateType);
    return typeObj ? typeObj.label : templateType;
  };

  const getDefaultTemplateData = (templateType) => {
    if (templateType === 'watermark') {
      const watermarkContent = 'PREVIEW ONLY';
      return {
        textElements: [
          {
            id: 'watermark-text',
            content: watermarkContent,
            position: { x: 50, y: 50 },
            style: {
              fontSize: 24,
              color: '#FF6B6B',
              opacity: 40,
              rotation: 45,
              fontFamily: getTextFontFamily(watermarkContent, true),
              bold: true
            },
            pattern: 'single',
            visible: true
          }
        ],
        logoElements: [],
        globalSettings: {
          layerBehindContent: false,
          preserveReadability: true
        }
      };
    } else if (templateType === 'branding') {
      return {
        logo: {
          visible: true,
          hidden: false,
          rotation: 0,
          url: logo,
          position: { x: 50, y: 95 },
          style: { size: 80, opacity: 100 }
        },
        text: {
          visible: true,
          hidden: false,
          rotation: 0,
          content: 'Your copyright text here',
          position: { x: 50, y: 90 },
          style: {
            fontSize: 12,
            color: '#000000',
            bold: false,
            italic: false,
            opacity: 80,
            width: 300,
            fontFamily: getTextFontFamily('Your copyright text here', false)
          }
        },
        url: {
          visible: true,
          hidden: false,
          rotation: 0,
          href: urls.external.marketing.main(),
          position: { x: 50, y: 85 },
          style: {
            fontSize: 12,
            color: '#0066cc',
            bold: false,
            italic: false,
            opacity: 100,
            fontFamily: getTextFontFamily(urls.external.marketing.main(), false)
          }
        },
        customElements: {}
      };
    } else {
      // Fallback for any other template types
      return {};
    }
  };

  const loadTemplate = async () => {
    // Validate template ID format before attempting to load
    if (!templateId || typeof templateId !== 'string') {
      clog('Invalid template ID format, redirecting to template manager:', templateId);
      navigate('/template-manager');
      return;
    }

    // Check if ID looks like a valid template ID (not a short code)
    // Template IDs are 6+ characters (system generates 6-char IDs)
    if (templateId.length < 6) {
      clog('Template ID too short, likely invalid, redirecting:', templateId);
      toast({
        title: "מזהה תבנית לא תקין",
        description: "מזהה התבנית שנמצא בכתובת אינו תקין",
        variant: "destructive"
      });
      navigate('/template-manager');
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiRequest(`/system-templates/${templateId}`);
      setTemplate(result.data);
      setIsCreateMode(false);
    } catch (error) {
      cerror("Error loading template:", error);

      // Check if it's a 404 error - template not found
      if (error.status === 404) {
        clog('Template not found, redirecting to template manager:', templateId);
        toast({
          title: "התבנית לא נמצאה",
          description: "התבנית המבוקשת לא קיימת במערכת",
          variant: "destructive"
        });
      } else {
        toast({
          title: "שגיאה בטעינת התבנית",
          description: "לא ניתן לטעון את נתוני התבנית",
          variant: "destructive"
        });
      }
      navigate('/template-manager');
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Convert legacy structure to unified structure before sending to API
      const templateToSave = {
        ...template,
        template_data: convertLegacyToUnifiedStructure(template.template_data)
      };

      let result;
      if (isCreateMode) {
        result = await apiRequest('/system-templates', {
          method: 'POST',
          body: JSON.stringify(templateToSave)
        });

        // Switch to edit mode and update URL
        setIsCreateMode(false);
        setTemplate(result.data);
        navigate(`/template-manager/edit/${result.data.id}`, { replace: true });

        setMessage({ type: 'success', text: 'התבנית נוצרה בהצלחה' });
      } else {
        result = await apiRequest(`/system-templates/${templateId}`, {
          method: 'PUT',
          body: JSON.stringify(templateToSave)
        });

        setTemplate(result.data);
        setMessage({ type: 'success', text: 'התבנית עודכנה בהצלחה' });
      }

      clog('Template saved:', result);
    } catch (error) {
      cerror('Error saving template:', error);
      toast({
        title: isCreateMode ? "שגיאה ביצירת התבנית" : "שגיאה בעדכון התבנית",
        description: error.message,
        variant: "destructive"
      });
    }
    setIsSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleOpenVisualEditor = () => {
    // Visual editor now supports all template types and formats
    const supportedFormats = ['pdf-a4-portrait', 'pdf-a4-landscape', 'svg-lessonplan'];
    const supportedTypes = ['branding', 'watermark'];

    if (!supportedTypes.includes(template.template_type)) {
      toast({
        title: "עורך ויזואלי לא זמין",
        description: "סוג תבנית לא נתמך",
        variant: "destructive"
      });
      return;
    }

    if (!supportedFormats.includes(template.target_format)) {
      toast({
        title: "עורך ויזואלי לא זמין",
        description: "פורמט תבנית לא נתמך",
        variant: "destructive"
      });
      return;
    }

    setShowVisualEditor(true);
  };

  // Convert legacy template structure to unified structure
  const convertLegacyToUnifiedStructure = (legacyConfig) => {
    // If it's already unified structure, return as-is
    if (legacyConfig.elements && typeof legacyConfig.elements === 'object') {
      return legacyConfig;
    }

    const elements = {};

    // Convert built-in elements from legacy structure (branding templates)
    if (legacyConfig.logo) {
      elements.logo = [{
        ...legacyConfig.logo,
        deletable: legacyConfig.logo.deletable ?? true,
        type: 'logo'
      }];
    }

    if (legacyConfig.text) {
      elements['copyright-text'] = [{
        ...legacyConfig.text,
        deletable: legacyConfig.text.deletable ?? true,
        type: 'copyright-text'
      }];
    }

    if (legacyConfig.url) {
      elements.url = [{
        ...legacyConfig.url,
        deletable: legacyConfig.url.deletable ?? true,
        type: 'url'
      }];
    }

    // Convert watermark templates legacy structure
    if (legacyConfig.textElements && Array.isArray(legacyConfig.textElements)) {
      elements['watermark-text'] = legacyConfig.textElements.map(element => ({
        ...element,
        type: 'watermark-text',
        deletable: element.deletable ?? true
      }));
    }

    if (legacyConfig.logoElements && Array.isArray(legacyConfig.logoElements)) {
      elements['watermark-logo'] = legacyConfig.logoElements.map(element => ({
        ...element,
        type: 'watermark-logo',
        deletable: element.deletable ?? true
      }));
    }

    // Convert custom elements from legacy structure
    if (legacyConfig.customElements && typeof legacyConfig.customElements === 'object') {
      Object.entries(legacyConfig.customElements).forEach(([elementId, element]) => {
        if (element && typeof element === 'object') {
          const elementType = element.type || 'free-text';

          if (!elements[elementType]) {
            elements[elementType] = [];
          }

          elements[elementType].push({
            ...element,
            id: element.id || elementId,
            type: elementType,
            deletable: element.deletable ?? true
          });
        }
      });
    }

    return {
      elements,
      globalSettings: legacyConfig.globalSettings || {}
    };
  };

  const handleSaveFromVisualEditor = (templateConfig) => {
    const unifiedConfig = convertLegacyToUnifiedStructure(templateConfig);

    setTemplate(prev => ({
      ...prev,
      template_data: unifiedConfig
    }));
    setShowVisualEditor(false);
    toast({
      title: "העיצוב נשמר",
      description: "העיצוב הויזואלי של התבנית נשמר בהצלחה (מבנה מאוחד)",
      variant: "default"
    });
  };

  const handleCloseVisualEditor = () => {
    setShowVisualEditor(false);
  };

  if (userLoading || isLoading) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתוני תבנית...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => navigate('/template-manager')}
              className="flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              חזור לניהול תבניות
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {isCreateMode
              ? `יצירת תבנית ${getTemplateTypeLabel(template.template_type)}`
              : `תבנית מערכת ${template.is_default ? '⭐' : ''}`
            }
          </h1>
          <p className="text-gray-500">
            {isCreateMode
              ? `צור תבנית ${getTemplateTypeLabel(template.template_type)} חדשה למערכת`
              : `עריכת תבנית: ${template.name}`
            }
          </p>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            {message.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Template Form */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>פרטי התבנית</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Template Name */}
            <div>
              <Label htmlFor="template-name">שם התבנית</Label>
              <Input
                id="template-name"
                value={template.name}
                onChange={(e) => setTemplate(prev => ({...prev, name: e.target.value}))}
                placeholder="הזן שם לתבנית"
                className="mt-1"
              />
            </div>

            {/* Template Type (Display Only) and Target Format */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="template-type">סוג התבנית</Label>
                <div className="w-full px-3 py-2 border rounded-lg mt-1 bg-gray-50 text-gray-700">
                  {getTemplateTypeLabel(template.template_type)}
                </div>
              </div>

              <div>
                <Label htmlFor="target-format">פורמט יעד</Label>
                <select
                  id="target-format"
                  value={template.target_format}
                  onChange={(e) => setTemplate(prev => ({...prev, target_format: e.target.value}))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                >
                  {getAvailableTargetFormats(template.template_type).map(format => (
                    <option key={format.value} value={format.value}>{format.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="template-description">תיאור</Label>
              <Textarea
                id="template-description"
                value={template.description || ''}
                onChange={(e) => setTemplate(prev => ({...prev, description: e.target.value}))}
                placeholder="תיאור התבנית (אופציונלי)"
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Default Checkbox */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_default"
                checked={template.is_default}
                onChange={(e) => setTemplate(prev => ({...prev, is_default: e.target.checked}))}
                className="rounded"
              />
              <Label htmlFor="is_default">ברירת מחדל</Label>
            </div>

            {/* Visual Editor Button */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">עורך ויזואלי</h4>
                  <p className="text-sm text-gray-600">עצב את התבנית באופן ויזואלי עם גרירה ושחרור</p>
                </div>
                <Button
                  onClick={handleOpenVisualEditor}
                  disabled={
                    !(['branding', 'watermark'].includes(template.template_type) &&
                      ['pdf-a4-portrait', 'pdf-a4-landscape', 'svg-lessonplan'].includes(template.target_format))
                  }
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300"
                >
                  <Palette className="w-4 h-4 ml-2" />
                  {(['branding', 'watermark'].includes(template.template_type) &&
                    ['pdf-a4-portrait', 'pdf-a4-landscape', 'svg-lessonplan'].includes(template.target_format))
                    ? 'פתח עורך ויזואלי'
                    : 'לא נתמך'}
                </Button>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving || !template.name.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 ml-2" />
                {isSaving ? 'שומר...' : isCreateMode ? 'צור תבנית' : 'שמור שינויים'}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/template-manager')}
              >
                ביטול
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Visual Editor Modal */}
        {showVisualEditor && (
          <VisualTemplateEditor
            isOpen={showVisualEditor}
            onClose={handleCloseVisualEditor}
            onSave={handleSaveFromVisualEditor}
            fileEntityId={null} // No file - blank canvas mode
            userRole={currentUser?.role}
            currentUser={currentUser} // Pass full user object for email resolution
            initialTemplateConfig={template.template_data}
            targetFormat={template.target_format} // Pass format for correct placeholder
            templateType={template.template_type} // Pass type for correct editor mode
            currentTemplateId={!isCreateMode ? templateId : null} // Pass template ID for auto-apply
          />
        )}
      </div>
    </div>
  );
}