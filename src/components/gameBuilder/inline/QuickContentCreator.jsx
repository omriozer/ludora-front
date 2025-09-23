import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Save,
  X,
  Edit,
  Languages,
  Image,
  HelpCircle,
  Target,
  Upload,
  AlertCircle
} from 'lucide-react';

import { Word, WordEN, Image as ImageEntity, QA, Attribute } from '@/services/entities';

export default function QuickContentCreator({
  contentType = 'Word',
  gameType,
  onSave,
  onCancel,
  initialData = null
}) {
  const [activeTab, setActiveTab] = useState(contentType);
  const [formData, setFormData] = useState(getInitialFormData(activeTab, initialData));
  const [loading, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  // Content type configurations
  const contentTypeConfigs = {
    Word: {
      icon: Edit,
      name: 'מילה',
      description: 'הוסף מילה חדשה למשחק',
      color: 'blue'
    },
    WordEN: {
      icon: Languages,
      name: 'מילה באנגלית',
      description: 'הוסף מילה באנגלית למשחק',
      color: 'green'
    },
    Image: {
      icon: Image,
      name: 'תמונה',
      description: 'העלה תמונה חדשה למשחק',
      color: 'purple'
    },
    QA: {
      icon: HelpCircle,
      name: 'שאלה ותשובה',
      description: 'צור שאלה ותשובות למשחק',
      color: 'orange'
    },
    Attribute: {
      icon: Target,
      name: 'תכונה',
      description: 'הגדר תכונה או מאפיין',
      color: 'red'
    }
  };

  function getInitialFormData(type, initial = null) {
    if (initial) return initial;

    switch (type) {
      case 'Word':
        return { text: '', description: '', category: '', difficulty: 1 };
      case 'WordEN':
        return { text: '', description: '', category: '', difficulty: 1 };
      case 'Image':
        return { name: '', description: '', file: null, alt_text: '' };
      case 'QA':
        return {
          question_text: '',
          correct_answers: [''],
          incorrect_answers: ['', '', ''],
          explanation: '',
          difficulty: 1
        };
      case 'Attribute':
        return { type: '', value: '', description: '' };
      default:
        return {};
    }
  }

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setFormData(getInitialFormData(newTab));
    setErrors([]);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayInputChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = [];

    switch (activeTab) {
      case 'Word':
      case 'WordEN':
        if (!formData.text?.trim()) {
          newErrors.push('יש להזין טקסט עבור המילה');
        }
        break;

      case 'Image':
        if (!formData.name?.trim()) {
          newErrors.push('יש להזין שם עבור התמונה');
        }
        if (!formData.file && !initialData) {
          newErrors.push('יש לבחור קובץ תמונה');
        }
        break;

      case 'QA':
        if (!formData.question_text?.trim()) {
          newErrors.push('יש להזין טקסט השאלה');
        }
        if (!formData.correct_answers?.some(answer => answer.trim())) {
          newErrors.push('יש להזין לפחות תשובה נכונה אחת');
        }
        break;

      case 'Attribute':
        if (!formData.type?.trim()) {
          newErrors.push('יש להזין סוג התכונה');
        }
        if (!formData.value?.trim()) {
          newErrors.push('יש להזין ערך התכונה');
        }
        break;
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // Create temporary content object
      const newContent = {
        id: `temp_${Date.now()}`,
        ...formData,
        type: activeTab,
        created_at: new Date().toISOString()
      };

      // Clean up the data based on content type
      switch (activeTab) {
        case 'QA':
          newContent.correct_answers = formData.correct_answers.filter(a => a.trim());
          newContent.incorrect_answers = formData.incorrect_answers.filter(a => a.trim());
          break;
      }

      onSave(activeTab, newContent);
    } catch (error) {
      setErrors(['שגיאה בשמירת התוכן: ' + error.message]);
    } finally {
      setSaving(false);
    }
  };

  const renderWordForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="text">טקסט המילה *</Label>
        <Input
          id="text"
          value={formData.text || ''}
          onChange={(e) => handleInputChange('text', e.target.value)}
          placeholder="הזן את המילה..."
          className="text-right"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">תיאור (אופציונלי)</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="הסבר או תיאור למילה..."
          className="text-right"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">קטגוריה</Label>
          <Input
            id="category"
            value={formData.category || ''}
            onChange={(e) => handleInputChange('category', e.target.value)}
            placeholder="למשל: בעלי חיים"
            className="text-right"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="difficulty">רמת קושי</Label>
          <Select value={formData.difficulty?.toString()} onValueChange={(value) => handleInputChange('difficulty', parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">קל</SelectItem>
              <SelectItem value="2">בינוני</SelectItem>
              <SelectItem value="3">קשה</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderImageForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">שם התמונה *</Label>
        <Input
          id="name"
          value={formData.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="הזן שם לתמונה..."
          className="text-right"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">קובץ התמונה *</Label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 mb-2">לחץ לבחירת תמונה או גרור לכאן</p>
          <Input
            id="file"
            type="file"
            accept="image/*"
            onChange={(e) => handleInputChange('file', e.target.files[0])}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('file').click()}
            type="button"
          >
            בחר קובץ
          </Button>
        </div>
        {formData.file && (
          <p className="text-sm text-green-600">נבחר: {formData.file.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="alt_text">טקסט תיאור</Label>
        <Input
          id="alt_text"
          value={formData.alt_text || ''}
          onChange={(e) => handleInputChange('alt_text', e.target.value)}
          placeholder="תיאור התמונה לנגישות..."
          className="text-right"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">תיאור נוסף</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="מידע נוסף על התמונה..."
          className="text-right"
          rows={2}
        />
      </div>
    </div>
  );

  const renderQAForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="question_text">טקסט השאלה *</Label>
        <Textarea
          id="question_text"
          value={formData.question_text || ''}
          onChange={(e) => handleInputChange('question_text', e.target.value)}
          placeholder="הזן את השאלה..."
          className="text-right"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>תשובות נכונות *</Label>
        {formData.correct_answers?.map((answer, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={answer}
              onChange={(e) => handleArrayInputChange('correct_answers', index, e.target.value)}
              placeholder={`תשובה נכונה ${index + 1}`}
              className="text-right"
            />
            {formData.correct_answers.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeArrayItem('correct_answers', index)}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => addArrayItem('correct_answers')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          הוסף תשובה נכונה
        </Button>
      </div>

      <div className="space-y-2">
        <Label>תשובות שגויות (לבחירה מרובה)</Label>
        {formData.incorrect_answers?.map((answer, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={answer}
              onChange={(e) => handleArrayInputChange('incorrect_answers', index, e.target.value)}
              placeholder={`תשובה שגויה ${index + 1}`}
              className="text-right"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => removeArrayItem('incorrect_answers', index)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => addArrayItem('incorrect_answers')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          הוסף תשובה שגויה
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="explanation">הסבר (אופציונלי)</Label>
        <Textarea
          id="explanation"
          value={formData.explanation || ''}
          onChange={(e) => handleInputChange('explanation', e.target.value)}
          placeholder="הסבר מדוע זו התשובה הנכונה..."
          className="text-right"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="difficulty">רמת קושי</Label>
        <Select value={formData.difficulty?.toString()} onValueChange={(value) => handleInputChange('difficulty', parseInt(value))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">קל</SelectItem>
            <SelectItem value="2">בינוני</SelectItem>
            <SelectItem value="3">קשה</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderAttributeForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="type">סוג התכונה *</Label>
        <Input
          id="type"
          value={formData.type || ''}
          onChange={(e) => handleInputChange('type', e.target.value)}
          placeholder="למשל: צבע, גודל, קטגוריה..."
          className="text-right"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="value">ערך התכונה *</Label>
        <Input
          id="value"
          value={formData.value || ''}
          onChange={(e) => handleInputChange('value', e.target.value)}
          placeholder="למשל: אדום, גדול, חיה..."
          className="text-right"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">תיאור</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="תיאור נוסף על התכונה..."
          className="text-right"
          rows={2}
        />
      </div>
    </div>
  );

  const getFormRenderer = () => {
    switch (activeTab) {
      case 'Word':
      case 'WordEN':
        return renderWordForm();
      case 'Image':
        return renderImageForm();
      case 'QA':
        return renderQAForm();
      case 'Attribute':
        return renderAttributeForm();
      default:
        return <div>סוג תוכן לא נתמך</div>;
    }
  };

  const config = contentTypeConfigs[activeTab];

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <config.icon className="w-6 h-6" />
            הוספת {config.name}
          </DialogTitle>
          <p className="text-sm text-gray-600">{config.description}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Content Type Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-5">
              {Object.entries(contentTypeConfigs).map(([type, typeConfig]) => (
                <TabsTrigger key={type} value={type} className="flex items-center gap-2">
                  <typeConfig.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{typeConfig.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.keys(contentTypeConfigs).map((type) => (
              <TabsContent key={type} value={type} className="mt-6">
                {getFormRenderer()}
              </TabsContent>
            ))}
          </Tabs>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              'שומר...'
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                שמור והוסף
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}