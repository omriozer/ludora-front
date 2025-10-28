import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProductTypeName } from '@/config/productTypes';

/**
 * WorkshopProductSection - Handles workshop-specific settings
 * Workshop type, duration, meeting details, video upload for recorded workshops
 */
const WorkshopProductSection = ({
  formData,
  updateFormData,
  handleFileUpload,
  handleDeleteFile,
  isUploading,
  getUploadProgress
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-blue-900">
        הגדרות {getProductTypeName('workshop', 'singular')}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label className="text-sm font-medium">סוג ה{getProductTypeName('workshop', 'singular')}</Label>
          <Select
            value={formData.workshop_type || ''}
            onValueChange={(value) => updateFormData({ workshop_type: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="בחר סוג" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="online_live">אונליין בזמן אמת</SelectItem>
              <SelectItem value="recorded">מוקלט</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.workshop_type === 'online_live' && (
          <div>
            <Label className="text-sm font-medium">מספר משתתפים מקסימלי</Label>
            <Input
              type="number"
              min="1"
              value={formData.max_participants || ''}
              onChange={(e) => updateFormData({ max_participants: parseInt(e.target.value) || 20 })}
              className="mt-1"
              placeholder="20"
            />
          </div>
        )}

        <div>
          <Label className="text-sm font-medium">
            משך ה{getProductTypeName('workshop', 'singular')} (דקות)
          </Label>
          <Input
            type="number"
            min="15"
            value={formData.duration_minutes || ''}
            onChange={(e) => updateFormData({ duration_minutes: parseInt(e.target.value) || 90 })}
            className="mt-1"
            placeholder="90"
          />
        </div>
      </div>

      {/* Online Live Workshop Fields */}
      {formData.workshop_type === 'online_live' && (
        <div className="space-y-4 pt-4 border-t border-blue-200">
          <h5 className="font-medium text-blue-800">הגדרות מפגש אונליין</h5>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">תאריך ושעת ה{getProductTypeName('workshop', 'singular')} *</Label>
              <Input
                type="datetime-local"
                value={formData.scheduled_date || ''}
                onChange={(e) => updateFormData({ scheduled_date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">פלטפורמת המפגש</Label>
              <Select
                value={formData.meeting_platform || ''}
                onValueChange={(value) => updateFormData({ meeting_platform: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="בחר פלטפורמה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="google_meet">Google Meet</SelectItem>
                  <SelectItem value="teams">Microsoft Teams</SelectItem>
                  <SelectItem value="other">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">קישור למפגש *</Label>
              <Input
                value={formData.meeting_link || ''}
                onChange={(e) => updateFormData({ meeting_link: e.target.value })}
                placeholder="https://zoom.us/j/... או https://meet.google.com/..."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">סיסמת מפגש (אם נדרשת)</Label>
              <Input
                value={formData.meeting_password || ''}
                onChange={(e) => updateFormData({ meeting_password: e.target.value })}
                placeholder="סיסמה אופציונלית"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Recorded Workshop Fields */}
      {formData.workshop_type === 'recorded' && (
        <div className="space-y-4 pt-4 border-t border-blue-200">
          <h5 className="font-medium text-blue-800">הגדרות {getProductTypeName('workshop', 'singular')} מוקלטת</h5>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              עבור סדנאות מוקלטות, ניתן להעלות קובץ וידיאו בקטע העלאת מדיה
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopProductSection;