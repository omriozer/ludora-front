import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { getApiBase } from "@/utils/api";
import { ludlog, luderror } from '@/lib/ludlog';
import { toast } from "@/components/ui/use-toast";
import { apiRequest } from "@/services/apiClient.js";
import { urls } from '@/config/urls';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import VisualTemplateEditor from "@/components/templates/VisualTemplateEditor";
import LogoDisplay from '@/components/ui/LogoDisplay';
import {
  FileText,
  Plus,
  Edit3,
  Copy,
  Trash2,
  Star,
  Search,
  AlertCircle,
  CheckCircle,
  Palette,
  Monitor,
  Layout,
  RectangleHorizontal,
  RectangleVertical,
  Paintbrush
} from "lucide-react";

export default function TemplateManager() {
  const navigate = useNavigate();
  const { currentUser, isLoading: userLoading, isAdmin } = useUser();

  const [templates, setTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedFormat, setSelectedFormat] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState(null);
  const [showTemplateTypeSelector, setShowTemplateTypeSelector] = useState(false);
  const [showVisualEditor, setShowVisualEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

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
    { value: 'all', label: 'כל הסוגים' },
    { value: 'branding', label: 'מיתוג' },
    { value: 'watermark', label: 'סימני מים' }
  ];

  const templateFormats = [
    { value: 'all', label: 'כל הפורמטים' },
    { value: 'pdf-a4-portrait', label: 'PDF A4 לאורך' },
    { value: 'pdf-a4-landscape', label: 'PDF A4 לרוחב' },
    { value: 'svg-lessonplan', label: 'SVG מצגת שיעור' }
  ];

  useEffect(() => {
    if (!userLoading && currentUser) {
      loadData();
    }
  }, [userLoading, currentUser]);

  // Close template type selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTemplateTypeSelector && !event.target.closest('.template-selector-container')) {
        setShowTemplateTypeSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTemplateTypeSelector]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (isAdmin()) {
        await loadTemplates();
      }
    } catch (error) {
      luderror.validation("Error loading template data:", error);
      toast({
        title: "שגיאה בטעינת הנתונים",
        description: "לא ניתן לטעון את נתוני התבניות",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const loadTemplates = async () => {
    try {
      const result = await apiRequest('/system-templates');
      ludlog.api('Templates loaded:', { data: result });
      setTemplates(result.data || []);
    } catch (error) {
      luderror.validation("Error loading templates:", error);
      throw error;
    }
  };



  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק תבנית זו? פעולה זו לא ניתנת לביטול.')) {
      return;
    }

    setIsUpdating(true);
    try {
      await apiRequest(`/system-templates/${templateId}`, {
        method: 'DELETE'
      });

      setMessage({ type: 'success', text: 'התבנית נמחקה בהצלחה' });
      await loadTemplates();
    } catch (error) {
      luderror.validation('Error deleting template:', error);
      toast({
        title: "שגיאה במחיקת התבנית",
        description: error.message,
        variant: "destructive"
      });
    }
    setIsUpdating(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSetDefault = async (templateId) => {
    setIsUpdating(true);
    try {
      await apiRequest(`/system-templates/${templateId}/set-default`, {
        method: 'POST'
      });

      setMessage({ type: 'success', text: 'התבנית הוגדרה כברירת מחדל' });
      await loadTemplates();
    } catch (error) {
      luderror.validation('Error setting default template:', error);
      toast({
        title: "שגיאה בהגדרת ברירת מחדל",
        description: error.message,
        variant: "destructive"
      });
    }
    setIsUpdating(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDuplicateTemplate = async (templateId, templateName) => {
    const newName = prompt('הזן שם חדש לתבנית המשוכפלת:', `${templateName} - עותק`);
    if (!newName) return;

    setIsUpdating(true);
    try {
      await apiRequest(`/system-templates/${templateId}/duplicate`, {
        method: 'POST',
        body: JSON.stringify({ name: newName })
      });

      setMessage({ type: 'success', text: 'התבנית שוכפלה בהצלחה' });
      await loadTemplates();
    } catch (error) {
      luderror.validation('Error duplicating template:', error);
      toast({
        title: "שגיאה בשכפול התבנית",
        description: error.message,
        variant: "destructive"
      });
    }
    setIsUpdating(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const getDefaultTemplateData = (templateType) => {
    if (templateType === 'watermark') {
      return {
        textElements: [
          {
            id: 'watermark-text',
            content: 'PREVIEW ONLY - {{filename}}',
            position: { x: 50, y: 50 },
            style: {
              fontSize: 24,
              color: '#FF6B6B',
              opacity: 40,
              rotation: 45,
              fontFamily: 'Arial, sans-serif',
              bold: true
            },
            pattern: 'single',
            visible: true
          }
        ],
        logoElements: [
          {
            id: 'watermark-logo',
            source: 'system-logo',
            url: logo,
            position: { x: 85, y: 15 },
            style: {
              size: 60,
              opacity: 30,
              rotation: 0
            },
            pattern: 'single',
            visible: true
          }
        ],
        globalSettings: {
          layerBehindContent: false,
          preserveReadability: true
        }
      };
    } else {
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
            width: 300
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
            opacity: 100
          }
        },
        customElements: {}
      };
    }
  };







  // Handle template type selection
  const handleTemplateTypeSelect = (templateType) => {
    setShowTemplateTypeSelector(false);

    // Navigate to the create page with template type
    navigate('/template-manager/create', {
      state: { templateType }
    });
  };

  // Handle opening visual editor for existing template
  const handleOpenVisualEditor = (template) => {
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

    setEditingTemplate(template);
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

  // Handle saving from visual editor
  const handleSaveFromVisualEditor = async (templateConfig) => {
    if (!editingTemplate) return;

    setIsUpdating(true);
    try {
      const unifiedConfig = convertLegacyToUnifiedStructure(templateConfig);

      const updatedTemplate = {
        ...editingTemplate,
        template_data: unifiedConfig
      };

      const result = await apiRequest(`/system-templates/${editingTemplate.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedTemplate)
      });

      setMessage({ type: 'success', text: 'תבנית עודכנה בהצלחה בעורך הויזואלי (מבנה מאוחד)' });
      await loadTemplates();
      setShowVisualEditor(false);
      setEditingTemplate(null);
    } catch (error) {
      luderror.validation('Error saving template from visual editor:', error);
      toast({
        title: "שגיאה בשמירת התבנית",
        description: error.message,
        variant: "destructive"
      });
    }
    setIsUpdating(false);
    setTimeout(() => setMessage(null), 3000);
  };

  // Handle closing visual editor
  const handleCloseVisualEditor = () => {
    setShowVisualEditor(false);
    setEditingTemplate(null);
  };

  if (userLoading || isLoading) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתוני תבניות...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              אין לך הרשאות גישה לניהול תבניות. רק מנהלים יכולים לגשת לאזור זה.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || template.template_type === selectedType;
    const matchesFormat = selectedFormat === 'all' || template.target_format === selectedFormat;

    return matchesSearch && matchesType && matchesFormat;
  });

  const defaultTemplates = filteredTemplates.filter(template => template.is_default);
  const customTemplates = filteredTemplates.filter(template => !template.is_default);

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">ניהול תבניות מערכת</h1>
          <p className="text-gray-500">נהל תבניות למיתוג וסימני מים</p>
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

        {/* Controls */}
        <div className="mb-8 space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="חפש תבניות..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {templateTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {templateFormats.map(format => (
                <option key={format.value} value={format.value}>{format.label}</option>
              ))}
            </select>
          </div>

          {/* Create Template Section */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">צור תבנית חדשה</h3>
            <div className="relative template-selector-container">
              <Button
                onClick={() => setShowTemplateTypeSelector(!showTemplateTypeSelector)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 ml-2" />
                צור תבנית חדשה
              </Button>

              {/* Template Type Selector Dropdown */}
              {showTemplateTypeSelector && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="p-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">בחר סוג תבנית:</h4>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start hover:bg-blue-50 hover:border-blue-300"
                        onClick={() => handleTemplateTypeSelect('branding')}
                      >
                        <FileText className="w-4 h-4 ml-2 text-blue-600" />
                        תבנית מיתוג
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start hover:bg-purple-50 hover:border-purple-300"
                        onClick={() => handleTemplateTypeSelect('watermark')}
                      >
                        <Palette className="w-4 h-4 ml-2 text-purple-600" />
                        תבנית סימן מים
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>



        {/* Templates Grid */}
        <div className="space-y-6">
          {/* Default Templates */}
          {defaultTemplates.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                תבניות ברירת מחדל ({defaultTemplates.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {defaultTemplates.map((template) => (
                  <Card key={template.id} className="border-none shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-right">{template.name}</CardTitle>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge variant="outline">{template.template_type}</Badge>
                            <Badge variant="secondary" className="text-blue-600 border-blue-300">
                              {targetFormats.find(f => f.value === template.target_format)?.icon}
                              <span className="mr-1">
                                {targetFormats.find(f => f.value === template.target_format)?.label || template.target_format}
                              </span>
                            </Badge>
                            <Badge className="bg-yellow-100 text-yellow-800">ברירת מחדל</Badge>
                            {template.created_by === 'system_migration' && (
                              <Badge className="bg-blue-100 text-blue-800 border border-blue-300">תבנית מערכת</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 mt-2">{template.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/template-manager/edit/${template.id}`)}
                          disabled={isUpdating}
                          className="text-blue-600 hover:bg-blue-50"
                          title="עריכת נתוני התבנית"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenVisualEditor(template)}
                          disabled={isUpdating || !(['branding', 'watermark'].includes(template.template_type) && ['pdf-a4-portrait', 'pdf-a4-landscape', 'svg-lessonplan'].includes(template.target_format))}
                          className="text-purple-600 hover:bg-purple-50 disabled:text-gray-400"
                          title={(['branding', 'watermark'].includes(template.template_type) && ['pdf-a4-portrait', 'pdf-a4-landscape', 'svg-lessonplan'].includes(template.target_format)) ? "עורך ויזואלי" : "עורך ויזואלי לא זמין"}
                        >
                          <Paintbrush className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateTemplate(template.id, template.name)}
                          disabled={isUpdating}
                          className="text-green-600 hover:bg-green-50"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        {!template.is_default && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            disabled={isUpdating}
                            className="text-red-600 hover:bg-red-50"
                            title="מחק תבנית"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Custom Templates */}
          {customTemplates.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                תבניות מותאמות ({customTemplates.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customTemplates.map((template) => (
                  <Card key={template.id} className="border-none shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-right">{template.name}</CardTitle>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge variant="outline">{template.template_type}</Badge>
                            <Badge variant="secondary" className="text-blue-600 border-blue-300">
                              {targetFormats.find(f => f.value === template.target_format)?.icon}
                              <span className="mr-1">
                                {targetFormats.find(f => f.value === template.target_format)?.label || template.target_format}
                              </span>
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 mt-2">{template.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/template-manager/edit/${template.id}`)}
                          disabled={isUpdating}
                          className="text-blue-600 hover:bg-blue-50"
                          title="עריכת נתוני התבנית"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenVisualEditor(template)}
                          disabled={isUpdating || !(['branding', 'watermark'].includes(template.template_type) && ['pdf-a4-portrait', 'pdf-a4-landscape', 'svg-lessonplan'].includes(template.target_format))}
                          className="text-purple-600 hover:bg-purple-50 disabled:text-gray-400"
                          title={(['branding', 'watermark'].includes(template.template_type) && ['pdf-a4-portrait', 'pdf-a4-landscape', 'svg-lessonplan'].includes(template.target_format)) ? "עורך ויזואלי" : "עורך ויזואלי לא זמין"}
                        >
                          <Paintbrush className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(template.id)}
                          disabled={isUpdating}
                          className="text-yellow-600 hover:bg-yellow-50"
                          title="הגדר כברירת מחדל"
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateTemplate(template.id, template.name)}
                          disabled={isUpdating}
                          className="text-green-600 hover:bg-green-50"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        {!template.is_default && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            disabled={isUpdating}
                            className="text-red-600 hover:bg-red-50"
                            title="מחק תבנית"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredTemplates.length === 0 && (
            <Card className="border-none shadow-lg">
              <CardContent className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">לא נמצאו תבניות</h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm || selectedType !== 'all' || selectedFormat !== 'all'
                    ? 'נסה לשנות את הסננים או למחוק את חיפוש'
                    : 'צור תבנית ראשונה כדי להתחיל'
                  }
                </p>
                <Button
                  onClick={() => setShowTemplateTypeSelector(!showTemplateTypeSelector)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  צור תבנית חדשה
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Instructions */}
        <Card className="border-none shadow-lg mt-8">
          <CardHeader>
            <CardTitle>מדריך שימוש</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">תבניות מערכת:</h3>
                <ul className="text-blue-800 space-y-1 text-sm">
                  <li>• תבניות משמשות למיתוג וסימני מים ב-PDF ובקבצים אחרים</li>
                  <li>• כל סוג תבנית (branding/watermark) חייב בברירת מחדל אחת לפחות</li>
                  <li>• תבניות מותאמות ניתנות לעריכה ושכפול</li>
                  <li>• תבניות מערכת (ברירת מחדל) ניתנות לעריכה אך לא למחיקה</li>
                  <li>• נתוני התבנית מוגדרים בפורמט JSON גמיש</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">תכונות מתקדמות:</h3>
                <ul className="text-green-800 space-y-1 text-sm">
                  <li>• תמיכה באלמנטים עם סיבוב (rotation) והסתרה (hidden)</li>
                  <li>• אלמנטים מותאמים כמו קווים וריבועים</li>
                  <li>• מיקום גמיש באחוזים עם היגיון דומה ל-CSS</li>
                  <li>• אפשרות לשמור הגדרות קובץ ספציפי כתבנית חדשה</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visual Editor Modal */}
        {showVisualEditor && editingTemplate && (
          <VisualTemplateEditor
            isOpen={showVisualEditor}
            onClose={handleCloseVisualEditor}
            onSave={handleSaveFromVisualEditor}
            fileEntityId={null} // No file - template mode
            userRole={currentUser?.role}
            currentUser={currentUser} // Pass full user object for email resolution
            initialTemplateConfig={editingTemplate.template_data}
            targetFormat={editingTemplate.target_format}
            templateType={editingTemplate.template_type}
            currentTemplateId={editingTemplate.id} // Pass template ID for auto-application and title context
          />
        )}

      </div>
    </div>
  );
}