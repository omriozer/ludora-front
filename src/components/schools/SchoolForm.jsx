import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, X, Upload, School as SchoolIcon, Image as ImageIcon, Loader2 } from "lucide-react";
import { UploadFile } from "@/services/integrations";
import UserSelector from "@/components/ui/UserSelector";

// Israeli districts
const DISTRICTS = [
  "צפון",
  "חיפה", 
  "מרכז",
  "תל אביב",
  "ירושלים",
  "דרום"
];

// Education levels
const EDUCATION_LEVELS = [
  { value: 'elementary', label: 'יסודי' },
  { value: 'middle_school', label: 'חטיבת ביניים' },
  { value: 'high_school', label: 'על יסודי' },
  { value: 'academic', label: 'אקדמאי' }
];

export default function SchoolForm({ school, onSave, onCancel, title, currentUser }) {
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    address: "",
    institution_symbol: "",
    email: "",
    phone: "",
    education_levels: [],
    logo_url: "",
    principal_id: "",
    district: ""
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (school) {
      setFormData({
        name: school.name || "",
        city: school.city || "",
        address: school.address || "",
        institution_symbol: school.institution_symbol || "",
        email: school.email || "",
        phone: school.phone || "",
        education_levels: school.education_levels || [],
        logo_url: school.logo_url || "",
        principal_id: school.principal_id || "",
        district: school.district || ""
      });
    }
  }, [school]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "שם מוסד החינוך הוא שדה חובה";
    }

    if (!formData.city.trim()) {
      newErrors.city = "עיר היא שדה חובה";
    }

    if (!formData.address.trim()) {
      newErrors.address = "כתובת היא שדה חובה";
    }

    if (!formData.institution_symbol.trim()) {
      newErrors.institution_symbol = "סמל מוסד הוא שדה חובה";
    } else if (!/^\d+$/.test(formData.institution_symbol.trim())) {
      newErrors.institution_symbol = "סמל מוסד חייב להיות מספר";
    }

    // Email validation (optional but if provided must be valid)
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "כתובת האימייל אינה תקינה";
    }

    // Phone validation (optional but if provided should be valid)
    if (formData.phone.trim() && !/^[\d\-\+\(\)\s]{7,}$/.test(formData.phone.trim())) {
      newErrors.phone = "מספר הטלפון אינו תקין";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, logo: 'יש להעלות קובץ תמונה בלבד' }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, logo: 'גודל הקובץ לא יכול לעלות על 5MB' }));
      return;
    }

    setIsUploadingLogo(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, logo_url: file_url }));
      setErrors(prev => ({ ...prev, logo: undefined }));
    } catch (error) {
      console.error('Error uploading logo:', error);
      setErrors(prev => ({ ...prev, logo: 'שגיאה בהעלאת הלוגו' }));
    }
    setIsUploadingLogo(false);
  };

  const handleEducationLevelChange = (levelValue, checked) => {
    setFormData(prev => ({
      ...prev,
      education_levels: checked
        ? [...prev.education_levels, levelValue]
        : prev.education_levels.filter(level => level !== levelValue)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Clean the data
      const cleanedData = {
        name: formData.name.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
        institution_symbol: formData.institution_symbol.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        education_levels: formData.education_levels,
        logo_url: formData.logo_url.trim() || null,
        principal_id: formData.principal_id.trim() || null,
        district: formData.district || null
      };

      await onSave(cleanedData);
    } catch (error) {
      // Error handling is done in parent component
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
        <CardTitle className="flex items-center gap-3">
          <SchoolIcon className="w-6 h-6" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name - Required */}
          <div>
            <Label htmlFor="name" className="text-sm font-medium">
              שם מוסד החינוך <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="הכנס שם מוסד החינוך"
              className={`mt-1 ${errors.name ? 'border-red-500' : ''}`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* City and Address - Required */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city" className="text-sm font-medium">
                עיר <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="הכנס שם העיר"
                className={`mt-1 ${errors.city ? 'border-red-500' : ''}`}
              />
              {errors.city && (
                <p className="text-red-500 text-xs mt-1">{errors.city}</p>
              )}
            </div>

            <div>
              <Label htmlFor="address" className="text-sm font-medium">
                כתובת <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="הכנס כתובת"
                className={`mt-1 ${errors.address ? 'border-red-500' : ''}`}
              />
              {errors.address && (
                <p className="text-red-500 text-xs mt-1">{errors.address}</p>
              )}
            </div>
          </div>

          {/* Institution Symbol - Required */}
          <div>
            <Label htmlFor="institution_symbol" className="text-sm font-medium">
              סמל מוסד <span className="text-red-500">*</span>
            </Label>
            <Input
              id="institution_symbol"
              value={formData.institution_symbol}
              onChange={(e) => handleInputChange('institution_symbol', e.target.value)}
              placeholder="הכנס סמל מוסד (מספר)"
              className={`mt-1 ${errors.institution_symbol ? 'border-red-500' : ''}`}
            />
            {errors.institution_symbol && (
              <p className="text-red-500 text-xs mt-1">{errors.institution_symbol}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">סמל המוסד חייב להיות יחודי במערכת</p>
          </div>

          {/* Email and Phone - Optional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email" className="text-sm font-medium">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="הכנס כתובת אימייל"
                className={`mt-1 ${errors.email ? 'border-red-500' : ''}`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-medium">טלפון</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="הכנס מספר טלפון"
                className={`mt-1 ${errors.phone ? 'border-red-500' : ''}`}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Education Levels - Optional */}
          <div>
            <Label className="text-sm font-medium">שלבי חינוך</Label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {EDUCATION_LEVELS.map(level => (
                <div key={level.value} className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id={level.value}
                    checked={formData.education_levels.includes(level.value)}
                    onCheckedChange={(checked) => handleEducationLevelChange(level.value, checked)}
                  />
                  <Label htmlFor={level.value} className="text-sm font-normal cursor-pointer">
                    {level.label}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-1">בחר את שלבי החינוך הרלוונטיים למוסד</p>
          </div>

          {/* District - Optional */}
          <div>
            <Label htmlFor="district" className="text-sm font-medium">מחוז</Label>
            <Select value={formData.district} onValueChange={(value) => handleInputChange('district', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="בחר מחוז" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>ללא מחוז</SelectItem>
                {DISTRICTS.map(district => (
                  <SelectItem key={district} value={district}>{district}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Logo Upload - Optional */}
          <div>
            <Label className="text-sm font-medium">לוגו מוסד החינוך</Label>
            <div className="mt-1 space-y-3">
              {/* Current Logo Preview */}
              {formData.logo_url && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <img
                    src={formData.logo_url}
                    alt="לוגו מוסד החינוך"
                    className="w-12 h-12 object-cover rounded-lg border"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">לוגו נוכחי</p>
                    <p className="text-xs text-gray-500">לחץ על "העלה לוגו חדש" כדי להחליף</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleInputChange('logo_url', '')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Upload Button */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploadingLogo}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploadingLogo}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {isUploadingLogo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      מעלה...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {formData.logo_url ? 'העלה לוגו חדש' : 'העלה לוגו'}
                    </>
                  )}
                </Button>
              </div>

              {errors.logo && (
                <p className="text-red-500 text-xs">{errors.logo}</p>
              )}
              <p className="text-gray-500 text-xs">
                תמונות עד 5MB במפורמט JPG, PNG או GIF
              </p>
            </div>
          </div>

          {/* Principal Selection - Admin Only */}
          {isAdmin && (
            <div>
              <Label className="text-sm font-medium">מנהל מוסד החינוך</Label>
              <div className="mt-1">
                <UserSelector
                  value={formData.principal_id}
                  onValueChange={(value) => handleInputChange('principal_id', value)}
                  placeholder="בחר מנהל מוסד חינוך"
                />
              </div>
              <p className="text-gray-500 text-xs mt-1">
                בחר משתמש רשום במערכת שיהיה מנהל מוסד החינוך (אופציונלי)
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={isLoading || isUploadingLogo}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
              ) : (
                <Save className="w-4 h-4 ml-2" />
              )}
              {school ? 'עדכן' : 'שמור'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 ml-2" />
              ביטול
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}