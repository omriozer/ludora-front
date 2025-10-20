import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, AlertCircle } from "lucide-react";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";

/**
 * EntityForm - A reusable form component for creating/editing entities
 * Handles validation, submission, and different field types
 *
 * @param {Object} props
 * @param {Array} props.fields - Field configuration array
 * @param {Object} props.initialData - Initial form data
 * @param {Function} props.onSubmit - Submit callback function
 * @param {Function} props.onCancel - Cancel callback function
 * @param {boolean} props.loading - Loading state
 * @param {Object} props.errors - Validation errors object
 * @param {string} props.title - Form title
 * @param {string} props.submitText - Submit button text
 * @param {string} props.cancelText - Cancel button text
 * @param {boolean} props.showCancel - Show cancel button
 * @param {string} props.className - Additional CSS classes
 */
export default function EntityForm({
  fields = [],
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  errors = {},
  title = "טופס",
  submitText = "שמור",
  cancelText = "ביטול",
  showCancel = true,
  className = ""
}) {
  const [formData, setFormData] = useState(initialData);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleFieldChange = (fieldKey, value) => {
    setFormData(prev => ({ ...prev, [fieldKey]: value }));
    setTouched(prev => ({ ...prev, [fieldKey]: true }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Mark all required fields as touched on submit attempt
    const newTouched = {};
    fields.forEach(field => {
      if (field.required) {
        newTouched[field.key] = true;
      }
    });
    setTouched(prev => ({ ...prev, ...newTouched }));

    // Check if there are any validation errors
    const hasValidationErrors = fields.some(field => {
      if (field.required) {
        return validateField(field, formData[field.key]);
      }
      return false;
    });

    // Only submit if no validation errors
    if (!hasValidationErrors) {
      onSubmit?.(formData);
    }
  };

  const validateField = (field, value) => {
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `שדה ${field.label} הוא חובה`;
    }

    if (field.minLength && value && value.length < field.minLength) {
      return `${field.label} חייב להכיל לפחות ${field.minLength} תווים`;
    }

    if (field.maxLength && value && value.length > field.maxLength) {
      return `${field.label} יכול להכיל לכל היותר ${field.maxLength} תווים`;
    }

    if (field.min && value && Number(value) < field.min) {
      return `${field.label} חייב להיות לפחות ${field.min}`;
    }

    if (field.max && value && Number(value) > field.max) {
      return `${field.label} יכול להיות לכל היותר ${field.max}`;
    }

    if (field.pattern && value && !field.pattern.test(value)) {
      return field.patternMessage || `${field.label} לא תקין`;
    }

    if (field.validator) {
      return field.validator(value, formData);
    }

    return null;
  };

  const getFieldError = (field) => {
    const serverError = errors[field.key];
    if (serverError) return serverError;

    if (touched[field.key]) {
      return validateField(field, formData[field.key]);
    }

    return null;
  };

  const renderField = (field) => {
    const value = formData[field.key] || (field.type === 'checkbox' ? false : '');
    const error = getFieldError(field);
    const fieldId = `field-${field.key}`;

    const commonProps = {
      id: fieldId,
      name: field.key,
      disabled: loading || field.disabled,
      'aria-invalid': !!error,
      'aria-describedby': error ? `${fieldId}-error` : undefined,
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
      case 'number':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </Label>
            <Input
              {...commonProps}
              type={field.type}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, [field.key]: true }))}
              min={field.min}
              max={field.max}
              step={field.step}
            />
            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}
            {error && (
              <p id={`${fieldId}-error`} className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </Label>
            <Textarea
              {...commonProps}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, [field.key]: true }))}
              rows={field.rows || 3}
            />
            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}
            {error && (
              <p id={`${fieldId}-error`} className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(newValue) => {
                handleFieldChange(field.key, newValue);
                setTouched(prev => ({ ...prev, [field.key]: true }));
              }}
              disabled={loading || field.disabled}
            >
              <SelectTrigger id={fieldId}>
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}
            {error && (
              <p id={`${fieldId}-error`} className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.key} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                {...commonProps}
                checked={value}
                onCheckedChange={(checked) => {
                  handleFieldChange(field.key, checked);
                  setTouched(prev => ({ ...prev, [field.key]: true }));
                }}
              />
              <Label htmlFor={fieldId} className="text-sm font-normal cursor-pointer">
                {field.label}
                {field.required && <span className="text-red-500 mr-1">*</span>}
              </Label>
            </div>
            {field.description && (
              <p className="text-sm text-gray-600 mr-6">{field.description}</p>
            )}
            {error && (
              <p id={`${fieldId}-error`} className="text-sm text-red-600 flex items-center gap-1 mr-6">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </Label>
            <Input
              {...commonProps}
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, [field.key]: true }))}
            />
            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}
            {error && (
              <p id={`${fieldId}-error`} className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      case 'custom':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </Label>
            {field.render && field.render(value, (newValue) => handleFieldChange(field.key, newValue), error)}
            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}
            {error && (
              <p id={`${fieldId}-error`} className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Only consider server errors for button state, not client validation
  // Client validation will be checked on submit
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Server-level errors */}
          {Object.keys(errors).length > 0 && errors.general && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Form fields */}
          <div className="space-y-4">
            {fields.map(renderField)}
          </div>

          {/* Form actions */}
          <div className="flex gap-3 pt-6 border-t">
            <Button
              type="submit"
              disabled={loading || hasErrors}
              className="flex-1 sm:flex-none"
            >
              {loading ? (
                <>
                  <LudoraLoadingSpinner size="sm" />
                  <span className="mr-2">שומר...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  {submitText}
                </>
              )}
            </Button>
            {showCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 sm:flex-none"
              >
                {cancelText}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}