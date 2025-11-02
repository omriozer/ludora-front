import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Trash2, Loader2, Eye, AlertCircle } from 'lucide-react';

/**
 * FileProductSection - Handles file-specific settings
 * File upload, preview settings, copyright footer, etc.
 */
const FileProductSection = ({
  formData,
  updateFormData,
  editingProduct,
  handleFileUpload,
  handleDeleteFile,
  isUploading,
  getUploadProgress,
  uploadedFileInfo,
  currentUser,
  showFooterPreview,
  setShowFooterPreview
}) => {

  const getAcceptAttribute = (fileType) => {
    switch (fileType) {
      case 'file':
        return '.pdf'; // File Products only accept PDF files
      default:
        return '*';
    }
  };

  const getFileTypeConfig = (fileType) => {
    switch (fileType) {
      case 'file':
        return { displayName: 'PDF בלבד' };
      default:
        return { displayName: 'קבצים' };
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
        העלאת קובץ
      </h3>

      <div className="space-y-2">
        <Label className="text-sm font-medium">העלאת קובץ</Label>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept={getAcceptAttribute('file')}
                onChange={(e) => handleFileUpload(e, 'file')}
                disabled={isUploading('file') || !editingProduct}
                className={`w-full sm:w-auto ${(isUploading('file') || !editingProduct) ? 'opacity-50' : ''}`}
                title={!editingProduct ? "יש לשמור את המוצר תחילה" : isUploading('file') ? "העלאה בתהליך" : "העלה קובץ"}
              />
              {isUploading('file') && (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-blue-600">
                    {getUploadProgress('file') || 0}%
                  </span>
                </div>
              )}
              {!editingProduct && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs text-amber-700">
                    יש לשמור המוצר תחילה
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar for File Upload */}
          {isUploading('file') && getUploadProgress('file') < 100 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">מעלה קובץ...</span>
                <span className="text-sm font-medium text-blue-600">
                  {getUploadProgress('file') || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${getUploadProgress('file') || 0}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Display current file */}
          {(uploadedFileInfo?.exists && !isUploading('file')) && (
            <div className="flex items-center gap-2 mt-2">
              <Download className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-700">
                {uploadedFileInfo.filename && uploadedFileInfo.filename.length > 30
                  ? uploadedFileInfo.filename.substring(0, 30) + '...'
                  : uploadedFileInfo.filename || 'קובץ הועלה בהצלחה'}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteFile('file')}
                  disabled={editingProduct?.is_published || formData.is_published}
                  className={`${(editingProduct?.is_published || formData.is_published) ? 'opacity-50' : ''}`}
                  title={editingProduct?.is_published || formData.is_published ? "לא ניתן למחוק קובץ ממוצר מפורסם - ניתן להחליף בלבד" : "מחק קובץ"}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                {(editingProduct?.is_published || formData.is_published) && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs text-amber-700">
                      מוצר מפורסם - החלפה בלבד
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!editingProduct && (
            <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 mt-2">
              ⚠️ יש לשמור את המוצר תחילה (ללא קובץ) על מנת להעלות קבצים. לחץ על "צור מוצר", ולאחר מכן תוכל להעלות את הקובץ.
            </div>
          )}

          <div className="text-xs text-gray-500 mt-2">
            סוגי קבצים נתמכים: {getFileTypeConfig('file')?.displayName || 'PDF בלבד'}
          </div>
        </div>

        {/* Allow Preview Toggle - Only for PDF files with uploaded file */}
        {uploadedFileInfo?.exists && formData.file_type === 'pdf' && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-gray-900">לאפשר תצוגה מקדימה</Label>
              <p className="text-xs text-gray-500">
                כאשר מופעל, משתמשים יוכלו לצפות בתצוגה מקדימה של קובץ ה-PDF לפני הרכישה
              </p>
            </div>
            <Switch
              checked={formData.allow_preview}
              onCheckedChange={(checked) => updateFormData({ allow_preview: checked })}
            />
          </div>
        )}

        {/* Add Copyrights Footer Toggle - Admin Only */}
        {(currentUser?.role === 'admin' || currentUser?.role === 'sysadmin') && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-gray-900">הוסף כותרת תחתונה עם זכויות יוצרים</Label>
              <p className="text-xs text-gray-500">
                כאשר מופעל, יוסף באופן אוטומטי כותרת תחתונה עם פרטי זכויות היוצרים של היוצר
              </p>
            </div>
            <Switch
              checked={formData.add_copyrights_footer}
              onCheckedChange={(checked) => updateFormData({ add_copyrights_footer: checked })}
            />
          </div>
        )}

        {/* Footer Preview Button - Show if add_copyrights_footer is true, file is PDF, and file is uploaded */}
        {formData.add_copyrights_footer &&
         uploadedFileInfo?.exists &&
         formData.file_type === 'pdf' &&
         (currentUser?.role === 'admin' || currentUser?.role === 'sysadmin' || currentUser?.content_creator_agreement_sign_date) && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFooterPreview(true)}
              className="w-full"
            >
              <Eye className="w-4 h-4 ml-2" />
              תצוגה מקדימה של כותרת תחתונה
            </Button>
            <p className="text-xs text-gray-600 mt-2">
              לחץ לצפייה בתצוגה מקדימה של קובץ ה-PDF עם כותרת תחתונה של זכויות יוצרים
            </p>
          </div>
        )}

        {/* File type display (auto-detected) */}
        {formData.file_type && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">סוג קובץ (זוהה אוטומטית)</Label>
            <div className="p-2 bg-gray-50 rounded border text-sm text-gray-700">
              {formData.file_type === 'pdf' && 'PDF'}
              {formData.file_type === 'ppt' && 'PowerPoint'}
              {formData.file_type === 'docx' && 'Word'}
              {formData.file_type === 'xlsx' && 'Excel'}
              {formData.file_type === 'image' && 'תמונה'}
              {formData.file_type === 'zip' && 'ZIP'}
              {formData.file_type === 'text' && 'טקסט'}
              {formData.file_type === 'video' && 'וידיאו'}
              {formData.file_type === 'other' && 'אחר'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileProductSection;