import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Calendar,
  BookOpen,
  Wrench,
  Upload,
  Play,
  Trash2,
  Plus,
  X,
  Loader2,
  Download,
  Eye,
  AlertCircle,
  Link as LinkIcon
} from 'lucide-react';
import { getProductTypeName, getAttributeSchema } from '@/config/productTypes';
import { getProductTypeIconByType } from '@/lib/layoutUtils';

// Import sub-components for each product type
import FileProductSection from './product-specific/FileProductSection';
import WorkshopProductSection from './product-specific/WorkshopProductSection';
import CourseProductSection from './product-specific/CourseProductSection';
import ToolProductSection from './product-specific/ToolProductSection';
import GameProductSection from './product-specific/GameProductSection';
import LessonPlanProductSection from './product-specific/LessonPlanProductSection';
import VisualTemplateEditor from '@/components/templates/VisualTemplateEditor';

/**
 * ProductSpecificSection - Renders product type-specific fields and functionality
 * Dynamically shows relevant sections based on the selected product type
 */
export const ProductSpecificSection = ({
  formData,
  updateFormData,
  updateNestedFormData,
  editingProduct,
  editingLessonPlan,
  handleFileUpload,
  handleDeleteFile,
  isUploading,
  getUploadProgress,
  uploadedFileInfo,
  currentUser,
  showFooterPreview,
  setShowFooterPreview,
  handleSaveFooterSettings,
  isAccessible = true,
  accessReason = null,
  isFieldValid,
  getFieldError,
  globalSettings
}) => {
  const [selectedModuleVideoTab, setSelectedModuleVideoTab] = useState({});

  // Disabled section component
  const DisabledSectionMessage = ({ title, message, icon: Icon }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-gray-400" />
        <Label className="text-sm font-medium text-gray-400">{title}</Label>
      </div>
      <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg text-center">
        <div className="flex flex-col items-center gap-2">
          <Icon className="w-8 h-8 text-gray-300" />
          <p className="text-sm text-gray-500 max-w-md">{message}</p>
        </div>
      </div>
    </div>
  );

  if (!isAccessible) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            הגדרות ספציפיות למוצר
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DisabledSectionMessage
            title="הגדרות ספציפיות למוצר"
            message={accessReason || "יש לבחור סוג מוצר תחילה"}
            icon={FileText}
          />
        </CardContent>
      </Card>
    );
  }

  if (!formData.product_type) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            הגדרות ספציפיות למוצר
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DisabledSectionMessage
            title="הגדרות ספציפיות למוצר"
            message="יש לבחור סוג מוצר בקטע המידע הבסיסי"
            icon={FileText}
          />
        </CardContent>
      </Card>
    );
  }

  // Get icon from settings with fallback to defaults
  const Icon = getProductTypeIconByType(globalSettings, formData.product_type);

  // Common props to pass to all product-specific components
  const commonProps = {
    formData,
    updateFormData,
    updateNestedFormData,
    editingProduct,
    editingLessonPlan,
    handleFileUpload,
    handleDeleteFile,
    isUploading,
    getUploadProgress,
    uploadedFileInfo,
    currentUser,
    isFieldValid,
    getFieldError,
    globalSettings
  };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          הגדרות ספציפיות ל{getProductTypeName(formData.product_type, 'singular')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Duration field for courses only (workshops handle their own duration) */}
        {formData.product_type === 'course' && (
          <div className="mb-6">
            <Label className="text-sm font-medium">משך כולל של הקורס בדקות</Label>
            <Input
              type="number"
              value={formData.total_duration_minutes}
              onChange={(e) => updateFormData({ total_duration_minutes: parseInt(e.target.value) || 0 })}
              onWheel={(e) => e.target.blur()} // Prevent scroll from changing value
              placeholder="180"
              className="mt-1"
            />
            {!isFieldValid('total_duration_minutes') && (
              <p className="text-sm text-red-600 mt-1">{getFieldError('total_duration_minutes')}</p>
            )}
          </div>
        )}

        {/* Grade and subject fields for files, games, and lesson plans */}
        {(formData.product_type === 'file' || formData.product_type === 'game' || formData.product_type === 'lesson_plan') && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4 mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">יעוד ומאפיינים</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">כיתה מינימלית</Label>
                <Select
                  value={formData.type_attributes?.grade_min?.toString() || ''}
                  onValueChange={(value) => updateFormData({
                    type_attributes: {
                      ...formData.type_attributes,
                      grade_min: value ? parseInt(value) : null
                    }
                  })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="בחר כיתה" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(grade => (
                      <SelectItem key={grade} value={grade.toString()}>
                        כיתה {grade === 1 ? 'א' : grade === 2 ? 'ב' : grade === 3 ? 'ג' :
                               grade === 4 ? 'ד' : grade === 5 ? 'ה' : grade === 6 ? 'ו' :
                               grade === 7 ? 'ז' : grade === 8 ? 'ח' : grade === 9 ? 'ט' :
                               grade === 10 ? 'י' : grade === 11 ? 'יא' : 'יב'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">כיתה מקסימלית</Label>
                <Select
                  value={formData.type_attributes?.grade_max?.toString() || ''}
                  onValueChange={(value) => updateFormData({
                    type_attributes: {
                      ...formData.type_attributes,
                      grade_max: value ? parseInt(value) : null
                    }
                  })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="בחר כיתה" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(grade => (
                      <SelectItem
                        key={grade}
                        value={grade.toString()}
                        disabled={formData.type_attributes?.grade_min && grade < formData.type_attributes.grade_min}
                      >
                        כיתה {grade === 1 ? 'א' : grade === 2 ? 'ב' : grade === 3 ? 'ג' :
                               grade === 4 ? 'ד' : grade === 5 ? 'ה' : grade === 6 ? 'ו' :
                               grade === 7 ? 'ז' : grade === 8 ? 'ח' : grade === 9 ? 'ט' :
                               grade === 10 ? 'י' : grade === 11 ? 'יא' : 'יב'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.type_attributes?.grade_min && (
                  <p className="text-xs text-gray-500 mt-1">
                    כיתות נמוכות מ-{formData.type_attributes.grade_min === 1 ? 'א' :
                    formData.type_attributes.grade_min === 2 ? 'ב' :
                    formData.type_attributes.grade_min === 3 ? 'ג' :
                    formData.type_attributes.grade_min === 4 ? 'ד' :
                    formData.type_attributes.grade_min === 5 ? 'ה' :
                    formData.type_attributes.grade_min === 6 ? 'ו' :
                    formData.type_attributes.grade_min === 7 ? 'ז' :
                    formData.type_attributes.grade_min === 8 ? 'ח' :
                    formData.type_attributes.grade_min === 9 ? 'ט' :
                    formData.type_attributes.grade_min === 10 ? 'י' :
                    formData.type_attributes.grade_min === 11 ? 'יא' : 'יב'} אינן זמינות
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">מקצוע</Label>
                <Select
                  value={formData.type_attributes?.subject || '__none__'}
                  onValueChange={(value) => updateFormData({
                    type_attributes: {
                      ...formData.type_attributes,
                      subject: value === '__none__' ? undefined : value
                    }
                  })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="בחר מקצוע" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">ללא מקצוע</SelectItem>
                    {globalSettings?.study_subjects ?
                      Object.entries(globalSettings.study_subjects).map(([key, label]) => (
                        <SelectItem key={key} value={label}>
                          {label}
                        </SelectItem>
                      ))
                    :
                      /* Fallback hardcoded subjects if settings not available */
                      <>
                        <SelectItem value="mathematics">מתמטיקה</SelectItem>
                        <SelectItem value="hebrew">עברית</SelectItem>
                        <SelectItem value="english">אנגלית</SelectItem>
                        <SelectItem value="science">מדעים</SelectItem>
                        <SelectItem value="history">היסטוריה</SelectItem>
                        <SelectItem value="geography">גיאוגרפיה</SelectItem>
                        <SelectItem value="physics">פיזיקה</SelectItem>
                        <SelectItem value="chemistry">כימיה</SelectItem>
                        <SelectItem value="biology">ביולוגיה</SelectItem>
                        <SelectItem value="literature">ספרות</SelectItem>
                        <SelectItem value="art">אמנות</SelectItem>
                        <SelectItem value="music">מוזיקה</SelectItem>
                        <SelectItem value="sports">ספורט</SelectItem>
                        <SelectItem value="technology">טכנולוגיה</SelectItem>
                        <SelectItem value="computer_science">מדעי המחשב</SelectItem>
                        <SelectItem value="other">אחר</SelectItem>
                      </>
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Render product-specific sections */}
        <div className="space-y-6">
          {formData.product_type === 'file' && (
            <FileProductSection
              {...commonProps}
              showFooterPreview={showFooterPreview}
              setShowFooterPreview={setShowFooterPreview}
            />
          )}

          {formData.product_type === 'workshop' && (
            <WorkshopProductSection
              {...commonProps}
            />
          )}

          {formData.product_type === 'course' && (
            <CourseProductSection
              {...commonProps}
              selectedModuleVideoTab={selectedModuleVideoTab}
              setSelectedModuleVideoTab={setSelectedModuleVideoTab}
            />
          )}

          {formData.product_type === 'tool' && (
            <ToolProductSection
              {...commonProps}
            />
          )}

          {formData.product_type === 'game' && (
            <GameProductSection
              {...commonProps}
            />
          )}

          {formData.product_type === 'lesson_plan' && (
            <LessonPlanProductSection
              {...commonProps}
            />
          )}
        </div>

        {/* Dynamic attributes from schema */}
        {formData.product_type && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">מאפיינים נוספים</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(getAttributeSchema(formData.product_type))
                .filter(([key]) => {
                  // Exclude fields that are handled in specific sections
                  if ((formData.product_type === 'file' || formData.product_type === 'game' || formData.product_type === 'lesson_plan') &&
                      (key === 'grade_min' || key === 'grade_max' || key === 'subject')) {
                    return false;
                  }
                  if (formData.product_type === 'game' &&
                      (key === 'game_type' || key === 'digital')) {
                    return false;
                  }
                  if (formData.product_type === 'workshop' && key === 'duration_minutes') {
                    return false;
                  }
                  if (formData.product_type === 'course' && key === 'total_duration_minutes') {
                    return false;
                  }
                  if (formData.product_type === 'lesson_plan' &&
                      (key === 'estimated_duration' || key === 'total_slides' || key === 'teacher_notes')) {
                    return false;
                  }
                  return true;
                })
                .map(([key, config]) => (
                  <div key={key}>
                    <Label className="text-sm font-medium">{config.label}</Label>
                    {config.type === 'select' ? (
                      <Select
                        value={formData[`attr_${key}`] || ''}
                        onValueChange={(value) => updateFormData({ [`attr_${key}`]: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={`בחר ${config.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {config.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : config.type === 'textarea' ? (
                      <Textarea
                        value={formData[`attr_${key}`] || ''}
                        onChange={(e) => updateFormData({ [`attr_${key}`]: e.target.value })}
                        placeholder={config.placeholder}
                        className="mt-1"
                        rows={config.rows || 3}
                      />
                    ) : config.type === 'number' ? (
                      <Input
                        type="number"
                        value={formData[`attr_${key}`] || ''}
                        onChange={(e) => updateFormData({ [`attr_${key}`]: e.target.value })}
                        onWheel={(e) => e.target.blur()} // Prevent scroll from changing value
                        placeholder={config.placeholder}
                        className="mt-1"
                        min={config.min}
                        max={config.max}
                      />
                    ) : (
                      <Input
                        value={formData[`attr_${key}`] || ''}
                        onChange={(e) => updateFormData({ [`attr_${key}`]: e.target.value })}
                        placeholder={config.placeholder}
                        className="mt-1"
                      />
                    )}
                    {config.description && (
                      <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Visual Template Editor Modal */}
    {formData.product_type === 'file' && showFooterPreview && (
      <VisualTemplateEditor
        isOpen={showFooterPreview}
        onClose={() => setShowFooterPreview(false)}
        onSave={async (footerConfig) => {
          try {
            // Save footer settings using the proper handler
            if (handleSaveFooterSettings) {
              await handleSaveFooterSettings(footerConfig);
            } else {
              // Fallback to form data update
              updateFormData({ footer_settings: footerConfig });
            }
            setShowFooterPreview(false);
          } catch (error) {
            console.error('❌ Error saving footer settings:', error);
            // Keep modal open on error
          }
        }}
        fileEntityId={editingProduct?.entity_id}
        userRole={currentUser?.role}
        initialFooterConfig={editingProduct?.footer_settings || formData.footer_settings}
        targetFormat="pdf-a4-portrait" // TODO: Detect format from file
        templateType="branding" // This modal is specifically for branding editing
      />
    )}
  </>
  );
};