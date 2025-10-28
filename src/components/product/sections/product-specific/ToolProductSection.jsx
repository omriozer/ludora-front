import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * ToolProductSection - Handles tool-specific settings
 * Tool URL, category, detailed description
 */
const ToolProductSection = ({
  formData,
  updateFormData,
  isFieldValid,
  getFieldError
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-orange-900">הגדרות כלי</h3>

      <div>
        <Label className="text-sm font-medium">כתובת הכלי *</Label>
        <Input
          value={formData.tool_url || ''}
          onChange={(e) => updateFormData({ tool_url: e.target.value })}
          placeholder="https://example.com/tool"
          className={`mt-1 ${!isFieldValid('tool_url') ? 'border-red-500' : ''}`}
        />
        {!isFieldValid('tool_url') && (
          <p className="text-sm text-red-600 mt-1">{getFieldError('tool_url')}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          הכתובת המלאה לכלי הדיגיטלי
        </p>
      </div>

      <div>
        <Label className="text-sm font-medium">קטגוריית כלי</Label>
        <Select
          value={formData.tool_category || ''}
          onValueChange={(value) => updateFormData({ tool_category: value })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="בחר קטגוריה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="productivity">פרודוקטיביות</SelectItem>
            <SelectItem value="design">עיצוב</SelectItem>
            <SelectItem value="development">פיתוח</SelectItem>
            <SelectItem value="education">חינוך</SelectItem>
            <SelectItem value="marketing">שיווק</SelectItem>
            <SelectItem value="analytics">אנליטיקה</SelectItem>
            <SelectItem value="other">אחר</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium">תיאור מפורט של הכלי</Label>
        <Textarea
          value={formData.tool_description || ''}
          onChange={(e) => updateFormData({ tool_description: e.target.value })}
          placeholder="תאר בפירוט את הכלי, איך הוא עובד, ומה הוא מאפשר לעשות"
          rows={4}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          תיאור זה יוצג למשתמשים ויעזור להם להבין איך להשתמש בכלי
        </p>
      </div>
    </div>
  );
};

export default ToolProductSection;