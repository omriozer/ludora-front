import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { getApiBase } from "@/utils/api";
import { clog, cerror } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  Plus,
  Edit3,
  Copy,
  Trash2,
  Star,
  StarOff,
  Search,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  RotateCw,
  Settings,
  Save,
  Palette,
  Type,
  Image,
  TestTube,
  Download,
  Upload,
  Layers,
  Grid,
  Shuffle,
  MousePointer
} from "lucide-react";

export default function TemplateManager() {
  const navigate = useNavigate();
  const { currentUser, isLoading: userLoading } = useUser();

  const [templates, setTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showWatermarkDesigner, setShowWatermarkDesigner] = useState(false);
  const [designingTemplate, setDesigningTemplate] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [testVariables, setTestVariables] = useState({});
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    template_type: 'footer',
    category: 'custom',
    is_default: false,
    template_data: {
      logo: {
        visible: true,
        hidden: false,
        rotation: 0,
        url: '/api/assets/image/settings/logo.png',
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
        href: 'https://ludora.app',
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
    }
  });

  const templateTypes = [
    { value: 'all', label: 'כל הסוגים' },
    { value: 'footer', label: 'תחתיות עמוד' },
    { value: 'header', label: 'ראשי עמוד' },
    { value: 'watermark', label: 'סימני מים' }
  ];

  const templateCategories = [
    { value: 'all', label: 'כל הקטגוריות' },
    { value: 'landscape', label: 'לרוחב' },
    { value: 'portrait', label: 'לאורך' },
    { value: 'minimal', label: 'מינימלי' },
    { value: 'logo-only', label: 'לוגו בלבד' },
    { value: 'text-only', label: 'טקסט בלבד' },
    { value: 'custom', label: 'מותאם אישית' }
  ];

  useEffect(() => {
    if (!userLoading && currentUser) {
      loadData();
    }
  }, [userLoading, currentUser]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      setIsAdmin(currentUser.role === 'admin' || currentUser.role === 'sysadmin');

      if (currentUser.role === 'admin' || currentUser.role === 'sysadmin') {
        await loadTemplates();
      }
    } catch (error) {
      cerror("Error loading template data:", error);
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
      const response = await fetch(`${getApiBase()}/system-templates`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch templates');

      const result = await response.json();
      clog('Templates loaded:', result);
      setTemplates(result.data || []);
    } catch (error) {
      cerror("Error loading templates:", error);
      throw error;
    }
  };

  const handleCreateTemplate = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`${getApiBase()}/system-templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTemplate)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create template');
      }

      const result = await response.json();
      clog('Template created:', result);

      setMessage({ type: 'success', text: 'התבנית נוצרה בהצלחה' });
      setShowCreateForm(false);
      resetNewTemplate();
      await loadTemplates();
    } catch (error) {
      cerror('Error creating template:', error);
      toast({
        title: "שגיאה ביצירת התבנית",
        description: error.message,
        variant: "destructive"
      });
    }
    setIsUpdating(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`${getApiBase()}/system-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingTemplate)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update template');
      }

      const result = await response.json();
      clog('Template updated:', result);

      setMessage({ type: 'success', text: 'התבנית עודכנה בהצלחה' });
      setEditingTemplate(null);
      await loadTemplates();
    } catch (error) {
      cerror('Error updating template:', error);
      toast({
        title: "שגיאה בעדכון התבנית",
        description: error.message,
        variant: "destructive"
      });
    }
    setIsUpdating(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק תבנית זו? פעולה זו לא ניתנת לביטול.')) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`${getApiBase()}/system-templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete template');
      }

      setMessage({ type: 'success', text: 'התבנית נמחקה בהצלחה' });
      await loadTemplates();
    } catch (error) {
      cerror('Error deleting template:', error);
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
      const response = await fetch(`${getApiBase()}/system-templates/${templateId}/set-default`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to set default template');
      }

      setMessage({ type: 'success', text: 'התבנית הוגדרה כברירת מחדל' });
      await loadTemplates();
    } catch (error) {
      cerror('Error setting default template:', error);
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
      const response = await fetch(`${getApiBase()}/system-templates/${templateId}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to duplicate template');
      }

      setMessage({ type: 'success', text: 'התבנית שוכפלה בהצלחה' });
      await loadTemplates();
    } catch (error) {
      cerror('Error duplicating template:', error);
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
            url: '/api/assets/image/settings/logo.png',
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
          url: '/api/assets/image/settings/logo.png',
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
          href: 'https://ludora.app',
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

  const resetNewTemplate = () => {
    setNewTemplate({
      name: '',
      description: '',
      template_type: 'footer',
      category: 'custom',
      is_default: false,
      template_data: getDefaultTemplateData('footer')
    });
  };

  // Watermark designer functions
  const openWatermarkDesigner = (template) => {
    setDesigningTemplate(template || {
      name: 'תבנית סימני מים חדשה',
      description: '',
      template_type: 'watermark',
      category: 'custom',
      is_default: false,
      template_data: getDefaultTemplateData('watermark')
    });
    setShowWatermarkDesigner(true);
    setTestVariables({
      filename: 'document-example.pdf',
      user: currentUser?.email || 'user@example.com',
      date: new Date().toLocaleDateString('he-IL'),
      time: new Date().toLocaleTimeString('he-IL')
    });
  };

  const updateWatermarkElement = (elementType, elementId, field, value) => {
    if (!designingTemplate) return;

    const updatedData = { ...designingTemplate.template_data };
    const elements = updatedData[elementType] || [];
    const elementIndex = elements.findIndex(el => el.id === elementId);

    if (elementIndex >= 0) {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        elements[elementIndex][parent][child] = value;
      } else {
        elements[elementIndex][field] = value;
      }
    }

    setDesigningTemplate({
      ...designingTemplate,
      template_data: updatedData
    });
  };

  const addWatermarkElement = (elementType) => {
    if (!designingTemplate) return;

    const updatedData = { ...designingTemplate.template_data };
    if (!updatedData[elementType]) updatedData[elementType] = [];

    const newElement = elementType === 'textElements' ? {
      id: `text-${Date.now()}`,
      content: 'New Text Element',
      position: { x: 50, y: 50 },
      style: {
        fontSize: 16,
        color: '#000000',
        opacity: 50,
        rotation: 0,
        fontFamily: 'Arial, sans-serif'
      },
      pattern: 'single',
      visible: true
    } : {
      id: `logo-${Date.now()}`,
      source: 'system-logo',
      url: '/api/assets/image/settings/logo.png',
      position: { x: 50, y: 50 },
      style: {
        size: 50,
        opacity: 50,
        rotation: 0
      },
      pattern: 'single',
      visible: true
    };

    updatedData[elementType].push(newElement);
    setDesigningTemplate({
      ...designingTemplate,
      template_data: updatedData
    });
  };

  const removeWatermarkElement = (elementType, elementId) => {
    if (!designingTemplate) return;

    const updatedData = { ...designingTemplate.template_data };
    updatedData[elementType] = updatedData[elementType].filter(el => el.id !== elementId);

    setDesigningTemplate({
      ...designingTemplate,
      template_data: updatedData
    });
  };

  const testWatermarkPreview = async () => {
    try {
      const response = await fetch(`${getApiBase()}/system-templates/test-variables`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_data: designingTemplate.template_data,
          variables: testVariables
        })
      });

      if (!response.ok) throw new Error('Preview test failed');

      const result = await response.json();
      setPreviewContent(JSON.stringify(result.data.processed_template, null, 2));

      toast({
        title: "תצוגה מקדימה הוכנה",
        description: "ניתן לראות את התוצאה בחלונית התצוגה המקדימה",
        variant: "default"
      });
    } catch (error) {
      cerror('Preview test error:', error);
      toast({
        title: "שגיאה בתצוגה מקדימה",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const exportWatermarkTemplate = async (templateId) => {
    try {
      const response = await fetch(`${getApiBase()}/system-templates/${templateId}/export`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `watermark-template.json`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "תבנית יוצאה",
        description: "קובץ התבנית הורד בהצלחה",
        variant: "default"
      });
    } catch (error) {
      cerror('Export error:', error);
      toast({
        title: "שגיאה בייצוא",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const saveWatermarkTemplate = async () => {
    if (!designingTemplate) return;

    setIsUpdating(true);
    try {
      const url = designingTemplate.id
        ? `${getApiBase()}/system-templates/${designingTemplate.id}`
        : `${getApiBase()}/system-templates`;

      const method = designingTemplate.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(designingTemplate)
      });

      if (!response.ok) throw new Error('Failed to save watermark template');

      const result = await response.json();

      toast({
        title: "תבנית נשמרה",
        description: "תבנית סימני המים נשמרה בהצלחה",
        variant: "default"
      });

      setShowWatermarkDesigner(false);
      setDesigningTemplate(null);
      await loadTemplates();
    } catch (error) {
      cerror('Save watermark template error:', error);
      toast({
        title: "שגיאה בשמירה",
        description: error.message,
        variant: "destructive"
      });
    }
    setIsUpdating(false);
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

  if (!isAdmin) {
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
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;

    return matchesSearch && matchesType && matchesCategory;
  });

  const defaultTemplates = filteredTemplates.filter(template => template.is_default);
  const customTemplates = filteredTemplates.filter(template => !template.is_default);

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">ניהול תבניות מערכת</h1>
          <p className="text-gray-500">נהל תבניות לתחתיות עמוד, ראשי עמוד וסימני מים</p>
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
        <div className="mb-6 space-y-4">
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
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {templateCategories.map(category => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 ml-2" />
              תבנית חדשה
            </Button>
            <Button
              onClick={() => openWatermarkDesigner()}
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Palette className="w-4 h-4 ml-2" />
              מעצב סימני מים
            </Button>
          </div>
        </div>

        {/* Create/Edit Form */}
        {(showCreateForm || editingTemplate) && (
          <Card className="border-none shadow-lg mb-6">
            <CardHeader>
              <CardTitle>
                {editingTemplate ? 'עריכת תבנית' : 'יצירת תבנית חדשה'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>שם התבנית</Label>
                  <Input
                    value={editingTemplate ? editingTemplate.name : newTemplate.name}
                    onChange={(e) => editingTemplate
                      ? setEditingTemplate({...editingTemplate, name: e.target.value})
                      : setNewTemplate({...newTemplate, name: e.target.value})
                    }
                    placeholder="הזן שם לתבנית"
                  />
                </div>
                <div>
                  <Label>סוג התבנית</Label>
                  <select
                    value={editingTemplate ? editingTemplate.template_type : newTemplate.template_type}
                    onChange={(e) => editingTemplate
                      ? setEditingTemplate({...editingTemplate, template_type: e.target.value})
                      : setNewTemplate({...newTemplate, template_type: e.target.value})
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="footer">תחתית עמוד</option>
                    <option value="header">ראש עמוד</option>
                    <option value="watermark">סימן מים</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>קטגוריה</Label>
                  <select
                    value={editingTemplate ? editingTemplate.category : newTemplate.category}
                    onChange={(e) => editingTemplate
                      ? setEditingTemplate({...editingTemplate, category: e.target.value})
                      : setNewTemplate({...newTemplate, category: e.target.value})
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="landscape">לרוחב</option>
                    <option value="portrait">לאורך</option>
                    <option value="minimal">מינימלי</option>
                    <option value="logo-only">לוגו בלבד</option>
                    <option value="text-only">טקסט בלבד</option>
                    <option value="custom">מותאם אישית</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={editingTemplate ? editingTemplate.is_default : newTemplate.is_default}
                    onChange={(e) => editingTemplate
                      ? setEditingTemplate({...editingTemplate, is_default: e.target.checked})
                      : setNewTemplate({...newTemplate, is_default: e.target.checked})
                    }
                    className="rounded"
                  />
                  <Label htmlFor="is_default">ברירת מחדל</Label>
                </div>
              </div>

              <div>
                <Label>תיאור</Label>
                <Textarea
                  value={editingTemplate ? editingTemplate.description || '' : newTemplate.description}
                  onChange={(e) => editingTemplate
                    ? setEditingTemplate({...editingTemplate, description: e.target.value})
                    : setNewTemplate({...newTemplate, description: e.target.value})
                  }
                  placeholder="תיאור התבנית (אופציונלי)"
                  rows={3}
                />
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm text-gray-600 mb-2 block">
                  נתוני התבנית (JSON) - אפשר לערוך ידנית או להשתמש בעורך הויזואלי
                </Label>
                <Textarea
                  value={JSON.stringify(
                    editingTemplate ? editingTemplate.template_data : newTemplate.template_data,
                    null, 2
                  )}
                  onChange={(e) => {
                    try {
                      const data = JSON.parse(e.target.value);
                      if (editingTemplate) {
                        setEditingTemplate({...editingTemplate, template_data: data});
                      } else {
                        setNewTemplate({...newTemplate, template_data: data});
                      }
                    } catch (error) {
                      // Invalid JSON - don't update
                    }
                  }}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 ml-2" />
                  {editingTemplate ? 'עדכן תבנית' : 'צור תבנית'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingTemplate(null);
                    resetNewTemplate();
                  }}
                >
                  ביטול
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Watermark Designer */}
        {showWatermarkDesigner && (
          <Card className="border-purple-200 shadow-xl mb-6 max-w-full">
            <CardHeader className="bg-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="w-6 h-6 text-purple-600" />
                  <CardTitle className="text-xl text-purple-900">
                    מעצב סימני מים - {designingTemplate?.name || 'תבנית חדשה'}
                  </CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={testWatermarkPreview}
                    variant="outline"
                    size="sm"
                    className="text-blue-600 hover:bg-blue-50"
                  >
                    <TestTube className="w-4 h-4 ml-1" />
                    בדיקה
                  </Button>
                  <Button
                    onClick={saveWatermarkTemplate}
                    disabled={isUpdating}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Save className="w-4 h-4 ml-1" />
                    שמירה
                  </Button>
                  <Button
                    onClick={() => {
                      setShowWatermarkDesigner(false);
                      setDesigningTemplate(null);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Template Info */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div>
                  <Label className="text-sm font-medium">שם התבנית</Label>
                  <Input
                    value={designingTemplate?.name || ''}
                    onChange={(e) => setDesigningTemplate({
                      ...designingTemplate,
                      name: e.target.value
                    })}
                    placeholder="הזן שם לתבנית"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">קטגוריה</Label>
                  <select
                    value={designingTemplate?.category || 'custom'}
                    onChange={(e) => setDesigningTemplate({
                      ...designingTemplate,
                      category: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  >
                    <option value="preview">תצוגה מקדימה</option>
                    <option value="security">אבטחה</option>
                    <option value="branding">מיתוג</option>
                    <option value="custom">מותאם אישית</option>
                  </select>
                </div>
                <div>
                  <Label className="text-sm font-medium">תיאור</Label>
                  <Input
                    value={designingTemplate?.description || ''}
                    onChange={(e) => setDesigningTemplate({
                      ...designingTemplate,
                      description: e.target.value
                    })}
                    placeholder="תיאור התבנית"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Elements Designer */}
                <div className="space-y-6">
                  {/* Text Elements */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Type className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-900">אלמנטי טקסט</h3>
                      </div>
                      <Button
                        onClick={() => addWatermarkElement('textElements')}
                        size="sm"
                        variant="outline"
                        className="text-blue-600 hover:bg-blue-50"
                      >
                        <Plus className="w-4 h-4 ml-1" />
                        הוסף טקסט
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {(designingTemplate?.template_data?.textElements || []).map((element, index) => (
                        <Card key={element.id} className="p-4 border-blue-200">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">תוכן</Label>
                              <Button
                                onClick={() => removeWatermarkElement('textElements', element.id)}
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>

                            <Input
                              value={element.content}
                              onChange={(e) => updateWatermarkElement('textElements', element.id, 'content', e.target.value)}
                              placeholder="טקסט סימן המים (השתמש ב{{משתנה}} למשתנים)"
                            />

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">מיקום X (%)</Label>
                                <Input
                                  type="number"
                                  value={element.position.x}
                                  onChange={(e) => updateWatermarkElement('textElements', element.id, 'position.x', parseInt(e.target.value))}
                                  min="0"
                                  max="100"
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">מיקום Y (%)</Label>
                                <Input
                                  type="number"
                                  value={element.position.y}
                                  onChange={(e) => updateWatermarkElement('textElements', element.id, 'position.y', parseInt(e.target.value))}
                                  min="0"
                                  max="100"
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">גודל פונט</Label>
                                <Input
                                  type="number"
                                  value={element.style.fontSize}
                                  onChange={(e) => updateWatermarkElement('textElements', element.id, 'style.fontSize', parseInt(e.target.value))}
                                  min="8"
                                  max="72"
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">שקיפות (%)</Label>
                                <Input
                                  type="number"
                                  value={element.style.opacity}
                                  onChange={(e) => updateWatermarkElement('textElements', element.id, 'style.opacity', parseInt(e.target.value))}
                                  min="0"
                                  max="100"
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">צבע</Label>
                                <Input
                                  type="color"
                                  value={element.style.color}
                                  onChange={(e) => updateWatermarkElement('textElements', element.id, 'style.color', e.target.value)}
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">דפוס</Label>
                                <select
                                  value={element.pattern}
                                  onChange={(e) => updateWatermarkElement('textElements', element.id, 'pattern', e.target.value)}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                >
                                  <option value="single">יחיד</option>
                                  <option value="grid">רשת</option>
                                  <option value="scattered">מפוזר</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Logo Elements */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Image className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-green-900">אלמנטי לוגו</h3>
                      </div>
                      <Button
                        onClick={() => addWatermarkElement('logoElements')}
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:bg-green-50"
                      >
                        <Plus className="w-4 h-4 ml-1" />
                        הוסף לוגו
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {(designingTemplate?.template_data?.logoElements || []).map((element, index) => (
                        <Card key={element.id} className="p-4 border-green-200">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">לוגו</Label>
                              <Button
                                onClick={() => removeWatermarkElement('logoElements', element.id)}
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">מיקום X (%)</Label>
                                <Input
                                  type="number"
                                  value={element.position.x}
                                  onChange={(e) => updateWatermarkElement('logoElements', element.id, 'position.x', parseInt(e.target.value))}
                                  min="0"
                                  max="100"
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">מיקום Y (%)</Label>
                                <Input
                                  type="number"
                                  value={element.position.y}
                                  onChange={(e) => updateWatermarkElement('logoElements', element.id, 'position.y', parseInt(e.target.value))}
                                  min="0"
                                  max="100"
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">גודל</Label>
                                <Input
                                  type="number"
                                  value={element.style.size}
                                  onChange={(e) => updateWatermarkElement('logoElements', element.id, 'style.size', parseInt(e.target.value))}
                                  min="10"
                                  max="200"
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">שקיפות (%)</Label>
                                <Input
                                  type="number"
                                  value={element.style.opacity}
                                  onChange={(e) => updateWatermarkElement('logoElements', element.id, 'style.opacity', parseInt(e.target.value))}
                                  min="0"
                                  max="100"
                                  className="text-sm"
                                />
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs">דפוס</Label>
                              <select
                                value={element.pattern}
                                onChange={(e) => updateWatermarkElement('logoElements', element.id, 'pattern', e.target.value)}
                                className="w-full px-2 py-1 border rounded text-sm"
                              >
                                <option value="single">יחיד</option>
                                <option value="grid">רשת</option>
                                <option value="scattered">מפוזר</option>
                              </select>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Variable Tester */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Settings className="w-5 h-5 text-orange-600" />
                      <h3 className="font-semibold text-orange-900">בודק משתנים</h3>
                    </div>
                    <Card className="p-4 border-orange-200">
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">שם קובץ</Label>
                            <Input
                              value={testVariables.filename || ''}
                              onChange={(e) => setTestVariables({
                                ...testVariables,
                                filename: e.target.value
                              })}
                              placeholder="document.pdf"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">משתמש</Label>
                            <Input
                              value={testVariables.user || ''}
                              onChange={(e) => setTestVariables({
                                ...testVariables,
                                user: e.target.value
                              })}
                              placeholder="user@example.com"
                              className="text-sm"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-600">
                          משתנים זמינים: {"{filename}"}, {"{user}"}, {"{date}"}, {"{time}"}, {"{slideId}"}, {"{lessonPlan}"}
                        </p>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Preview Panel */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-semibold text-indigo-900">תצוגה מקדימה</h3>
                  </div>

                  <Card className="p-4 border-indigo-200 h-96">
                    {previewContent ? (
                      <div className="h-full overflow-auto">
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {previewContent}
                        </pre>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <TestTube className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">לחץ על "בדיקה" לראות תצוגה מקדימה</p>
                          <p className="text-xs text-gray-400 mt-1">
                            התצוגה המקדימה תראה כיצד המשתנים מוחלפים
                          </p>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Global Settings */}
                  <Card className="mt-4 p-4 border-gray-200">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      הגדרות כלליות
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">שכבה מאחורי תוכן</Label>
                        <input
                          type="checkbox"
                          checked={designingTemplate?.template_data?.globalSettings?.layerBehindContent || false}
                          onChange={(e) => setDesigningTemplate({
                            ...designingTemplate,
                            template_data: {
                              ...designingTemplate.template_data,
                              globalSettings: {
                                ...designingTemplate.template_data?.globalSettings,
                                layerBehindContent: e.target.checked
                              }
                            }
                          })}
                          className="rounded"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">שמירה על קריאות</Label>
                        <input
                          type="checkbox"
                          checked={designingTemplate?.template_data?.globalSettings?.preserveReadability || false}
                          onChange={(e) => setDesigningTemplate({
                            ...designingTemplate,
                            template_data: {
                              ...designingTemplate.template_data,
                              globalSettings: {
                                ...designingTemplate.template_data?.globalSettings,
                                preserveReadability: e.target.checked
                              }
                            }
                          })}
                          className="rounded"
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{template.template_type}</Badge>
                            <Badge variant="secondary">{template.category}</Badge>
                            <Badge className="bg-yellow-100 text-yellow-800">ברירת מחדל</Badge>
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
                          onClick={() => setEditingTemplate(template)}
                          disabled={isUpdating}
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        {template.template_type === 'watermark' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openWatermarkDesigner(template)}
                            disabled={isUpdating}
                            className="text-purple-600 hover:bg-purple-50"
                            title="עיצוב סימני מים"
                          >
                            <Palette className="w-4 h-4" />
                          </Button>
                        )}
                        {template.template_type === 'watermark' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportWatermarkTemplate(template.id)}
                            disabled={isUpdating}
                            className="text-indigo-600 hover:bg-indigo-50"
                            title="ייצוא תבנית"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateTemplate(template.id, template.name)}
                          disabled={isUpdating}
                          className="text-green-600 hover:bg-green-50"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                          disabled={isUpdating}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{template.template_type}</Badge>
                            <Badge variant="secondary">{template.category}</Badge>
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
                          onClick={() => setEditingTemplate(template)}
                          disabled={isUpdating}
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        {template.template_type === 'watermark' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openWatermarkDesigner(template)}
                            disabled={isUpdating}
                            className="text-purple-600 hover:bg-purple-50"
                            title="עיצוב סימני מים"
                          >
                            <Palette className="w-4 h-4" />
                          </Button>
                        )}
                        {template.template_type === 'watermark' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportWatermarkTemplate(template.id)}
                            disabled={isUpdating}
                            className="text-indigo-600 hover:bg-indigo-50"
                            title="ייצוא תבנית"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                          disabled={isUpdating}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
                  {searchTerm || selectedType !== 'all' || selectedCategory !== 'all'
                    ? 'נסה לשנות את הסננים או למחוק את חיפוש'
                    : 'צור תבנית ראשונה כדי להתחיל'
                  }
                </p>
                <Button
                  onClick={() => setShowCreateForm(true)}
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
                  <li>• תבניות משמשות לעיצוב תחתיות עמוד, ראשי עמוד וסימני מים ב-PDF</li>
                  <li>• כל סוג תבנית (footer/header/watermark) חייב בברירת מחדל אחת לפחות</li>
                  <li>• תבניות מותאמות ניתנות לעריכה ושכפול</li>
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
      </div>
    </div>
  );
}