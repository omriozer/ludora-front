import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { getProductTypeName } from '@/config/productTypes';

/**
 * CourseProductSection - Handles course-specific settings
 * Course modules with videos and materials
 */
const CourseProductSection = ({
  formData,
  updateFormData,
  updateNestedFormData
}) => {

  const addModule = () => {
    const newModule = {
      title: '',
      description: '',
      duration_minutes: 0,
      video_url: '',
      materials: []
    };

    const updatedModules = [...(formData.course_modules || []), newModule];
    updateFormData({ course_modules: updatedModules });
  };

  const removeModule = (index) => {
    const updatedModules = formData.course_modules?.filter((_, i) => i !== index) || [];
    updateFormData({ course_modules: updatedModules });
  };

  const updateModule = (index, field, value) => {
    const updatedModules = [...(formData.course_modules || [])];
    updatedModules[index] = {
      ...updatedModules[index],
      [field]: value
    };
    updateFormData({ course_modules: updatedModules });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-semibold text-green-900">
          מודולי ה{getProductTypeName('course', 'singular')}
        </h3>
        <Button type="button" variant="outline" onClick={addModule} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 ml-2" />
          הוסף מודול
        </Button>
      </div>

      {(!formData.course_modules || formData.course_modules.length === 0) && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
          <p className="text-green-700">עדיין לא הוגדרו מודולים לקורס</p>
          <p className="text-sm text-green-600 mt-1">לחץ על "הוסף מודול" כדי להתחיל</p>
        </div>
      )}

      {formData.course_modules?.map((module, index) => (
        <Card key={index} className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h4 className="font-medium">מודול {index + 1}</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeModule(index)}
              className="self-start sm:self-center"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="כותרת המודול"
                value={module.title || ''}
                onChange={(e) => updateModule(index, 'title', e.target.value)}
              />
              <Input
                placeholder="משך בדקות"
                type="number"
                value={module.duration_minutes || ''}
                onChange={(e) => updateModule(index, 'duration_minutes', parseInt(e.target.value) || 0)}
              />
            </div>
            <Textarea
              placeholder="תיאור המודול"
              value={module.description || ''}
              onChange={(e) => updateModule(index, 'description', e.target.value)}
              rows={2}
            />

            <div className="p-3 bg-gray-50 rounded border">
              <Label className="text-sm font-medium text-gray-700">וידיאו ומודול החומרים</Label>
              <p className="text-xs text-gray-500 mt-1">
                ניתן להעלות וידיאו וחומרים למודול דרך קטע העלאת המדיה לאחר יצירת המוצר
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default CourseProductSection;