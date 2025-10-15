import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { getApiBase } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tag,
  Save,
  ArrowRight,
  AlertCircle,
  Info,
  Users,
  Target,
  Eye,
  Calendar,
  DollarSign,
  Percent,
  Settings,
  Package,
  Shield
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { clog, cerror } from "@/lib/utils";

export default function CouponForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { currentUser, isLoading: userLoading } = useUser();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Products for targeting
  const [products, setProducts] = useState([]);

  // Form data
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    discount_cap: null,
    minimum_amount: null,
    targeting_type: 'general',
    targeting_criteria: null,
    targeting_metadata: {},
    visibility: 'secret',
    is_active: true,
    usage_limit: null,
    usage_count: 0,
    valid_from: '',
    valid_until: '',
    priority_level: 5,
    can_stack: false,
    user_segments: []
  });

  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (currentUser && !userLoading) {
      loadData();
    }
  }, [currentUser, userLoading]);

  const loadData = async () => {
    setIsLoading(true);
    try {

      // Load products for targeting options
      const [workshopsResponse, coursesResponse, filesResponse, toolsResponse, gamesResponse] = await Promise.all([
        fetch(`${getApiBase()}/entities/workshop`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${getApiBase()}/entities/course`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${getApiBase()}/entities/file`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${getApiBase()}/entities/tool`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${getApiBase()}/entities/game`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      const [workshopsData, coursesData, filesData, toolsData, gamesData] = await Promise.all([
        workshopsResponse.json(),
        coursesResponse.json(),
        filesResponse.json(),
        toolsResponse.json(),
        gamesResponse.json()
      ]);

      const allProducts = [
        ...workshopsData.map(w => ({ ...w, entity_type: 'workshop', display_name: `${w.title} (סדנה)` })),
        ...coursesData.map(c => ({ ...c, entity_type: 'course', display_name: `${c.title} (קורס)` })),
        ...filesData.map(f => ({ ...f, entity_type: 'file', display_name: `${f.title} (קובץ)` })),
        ...toolsData.map(t => ({ ...t, entity_type: 'tool', display_name: `${t.title} (כלי)` })),
        ...gamesData.map(g => ({ ...g, entity_type: 'game', display_name: `${g.title} (משחק)` }))
      ];
      setProducts(allProducts);

      // Load existing coupon if editing
      if (isEditing) {
        const couponResponse = await fetch(`${getApiBase()}/entities/coupon/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });
        const coupon = await couponResponse.json();
        if (coupon) {
          setFormData({
            code: coupon.code || '',
            description: coupon.description || '',
            discount_type: coupon.discount_type || 'percentage',
            discount_value: coupon.discount_value || 0,
            discount_cap: coupon.discount_cap || null,
            minimum_amount: coupon.minimum_amount || null,
            targeting_type: coupon.targeting_type || 'general',
            targeting_criteria: coupon.targeting_criteria || null,
            targeting_metadata: coupon.targeting_metadata || {},
            visibility: coupon.visibility || 'secret',
            is_active: coupon.is_active !== false,
            usage_limit: coupon.usage_limit || null,
            usage_count: coupon.usage_count || 0,
            valid_from: coupon.valid_from ? coupon.valid_from.split('T')[0] : '',
            valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : '',
            priority_level: coupon.priority_level || 5,
            can_stack: coupon.can_stack || false,
            user_segments: coupon.user_segments || []
          });
        }
      }
    } catch (error) {
      cerror("Error loading data:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת הנתונים' });
    }
    setIsLoading(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    // Required fields
    if (!formData.code.trim()) {
      errors.code = 'קוד הקופון הוא שדה חובה';
    } else if (formData.code.length < 3) {
      errors.code = 'קוד הקופון חייב להכיל לפחות 3 תווים';
    } else if (!/^[A-Z0-9_-]+$/.test(formData.code)) {
      errors.code = 'קוד הקופון יכול להכיל רק אותיות באנגלית, מספרים, _ ו-';
    }

    if (!formData.discount_value || formData.discount_value <= 0) {
      errors.discount_value = 'ערך ההנחה חייב להיות גדול מ-0';
    }

    if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
      errors.discount_value = 'אחוז הנחה לא יכול להיות גדול מ-100%';
    }

    if (formData.targeting_type === 'product_id' && !formData.targeting_criteria) {
      errors.targeting_criteria = 'יש לבחור מוצר ספציפי';
    }

    if (formData.targeting_type === 'product_type' && !formData.targeting_criteria) {
      errors.targeting_criteria = 'יש לבחור סוג מוצר';
    }

    if (formData.valid_from && formData.valid_until) {
      const fromDate = new Date(formData.valid_from);
      const untilDate = new Date(formData.valid_until);
      if (fromDate >= untilDate) {
        errors.valid_until = 'תאריך סיום חייב להיות אחרי תאריך התחלה';
      }
    }

    if (formData.usage_limit && formData.usage_limit < 1) {
      errors.usage_limit = 'מגבלת שימוש חייבת להיות לפחות 1';
    }

    if (formData.minimum_amount && formData.minimum_amount < 0) {
      errors.minimum_amount = 'סכום מינימלי לא יכול להיות שלילי';
    }

    if (formData.discount_cap && formData.discount_cap <= 0) {
      errors.discount_cap = 'תקרת הנחה חייבת להיות גדולה מ-0';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setMessage({ type: 'error', text: 'יש לתקן את השגיאות בטופס' });
      return;
    }

    setIsSaving(true);
    try {
      const couponData = {
        ...formData,
        code: formData.code.toUpperCase(),
        discount_value: Number(formData.discount_value),
        discount_cap: formData.discount_cap ? Number(formData.discount_cap) : null,
        minimum_amount: formData.minimum_amount ? Number(formData.minimum_amount) : null,
        usage_limit: formData.usage_limit ? Number(formData.usage_limit) : null,
        priority_level: Number(formData.priority_level),
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null
      };

      if (isEditing) {
        await fetch(`${getApiBase()}/entities/coupon/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(couponData)
        });
        toast({
          title: "קופון עודכן",
          description: "הקופון עודכן בהצלחה במערכת",
          variant: "default"
        });
      } else {
        await fetch(`${getApiBase()}/entities/coupon`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(couponData)
        });
        toast({
          title: "קופון נוצר",
          description: "הקופון נוצר בהצלחה במערכת",
          variant: "default"
        });
      }

      navigate('/coupons');
    } catch (error) {
      cerror('Error saving coupon:', error);
      setMessage({
        type: 'error',
        text: error.message?.includes('Validation')
          ? 'שגיאה בנתונים - אנא בדוק את הטופס'
          : 'שגיאה בשמירת הקופון'
      });
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">טוען נתונים...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/coupons')}
              className="flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              חזור לרשימת קופונים
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {isEditing ? 'עריכת קופון' : 'יצירת קופון חדש'}
              </h1>
              <p className="text-gray-500">
                {isEditing ? 'ערוך את פרטי הקופון' : 'צור קופון הנחה חדש עם הגדרות מתקדמות'}
              </p>
            </div>
          </div>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            {message.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Info className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                מידע בסיסי
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">קוד קופון *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                    placeholder="SAVE20"
                    className={validationErrors.code ? 'border-red-500' : ''}
                  />
                  {validationErrors.code && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.code}</p>
                  )}
                  <p className="text-gray-500 text-sm mt-1">
                    אותיות באנגלית, מספרים ותווי _ - בלבד
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Label htmlFor="is_active">פעיל</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">תיאור</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="תיאור הקופון ותנאי השימוש"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Discount Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5" />
                הגדרות הנחה
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="discount_type">סוג הנחה *</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value) => handleInputChange('discount_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">אחוז הנחה</SelectItem>
                      <SelectItem value="fixed_amount">סכום קבוע</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="discount_value">
                    ערך הנחה * {formData.discount_type === 'percentage' ? '(%)' : '(₪)'}
                  </Label>
                  <Input
                    id="discount_value"
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => handleInputChange('discount_value', e.target.value)}
                    placeholder={formData.discount_type === 'percentage' ? '20' : '50'}
                    min="0"
                    max={formData.discount_type === 'percentage' ? '100' : undefined}
                    step="0.01"
                    className={validationErrors.discount_value ? 'border-red-500' : ''}
                  />
                  {validationErrors.discount_value && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.discount_value}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="discount_cap">תקרת הנחה (₪)</Label>
                  <Input
                    id="discount_cap"
                    type="number"
                    value={formData.discount_cap || ''}
                    onChange={(e) => handleInputChange('discount_cap', e.target.value || null)}
                    placeholder="100"
                    min="0"
                    step="0.01"
                    className={validationErrors.discount_cap ? 'border-red-500' : ''}
                  />
                  {validationErrors.discount_cap && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.discount_cap}</p>
                  )}
                  <p className="text-gray-500 text-sm mt-1">
                    מגביל את ההנחה המקסימלית (רלוונטי לאחוז הנחה)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minimum_amount">סכום מינימלי לרכישה (₪)</Label>
                  <Input
                    id="minimum_amount"
                    type="number"
                    value={formData.minimum_amount || ''}
                    onChange={(e) => handleInputChange('minimum_amount', e.target.value || null)}
                    placeholder="100"
                    min="0"
                    step="0.01"
                    className={validationErrors.minimum_amount ? 'border-red-500' : ''}
                  />
                  {validationErrors.minimum_amount && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.minimum_amount}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Label htmlFor="can_stack">ניתן לערום עם קופונים אחרים</Label>
                  <Switch
                    id="can_stack"
                    checked={formData.can_stack}
                    onCheckedChange={(checked) => handleInputChange('can_stack', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Targeting Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                הגדרות מיקוד
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="targeting_type">סוג מיקוד</Label>
                <Select
                  value={formData.targeting_type}
                  onValueChange={(value) => {
                    handleInputChange('targeting_type', value);
                    handleInputChange('targeting_criteria', null); // Reset criteria when type changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">כללי - כל המוצרים</SelectItem>
                    <SelectItem value="product_type">סוג מוצר ספציפי</SelectItem>
                    <SelectItem value="product_id">מוצר ספציפי</SelectItem>
                    <SelectItem value="user_segment">קבוצת משתמשים</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.targeting_type === 'product_type' && (
                <div>
                  <Label htmlFor="targeting_criteria">סוג מוצר *</Label>
                  <Select
                    value={formData.targeting_criteria || ''}
                    onValueChange={(value) => handleInputChange('targeting_criteria', value)}
                  >
                    <SelectTrigger className={validationErrors.targeting_criteria ? 'border-red-500' : ''}>
                      <SelectValue placeholder="בחר סוג מוצר" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workshop">סדנאות</SelectItem>
                      <SelectItem value="course">קורסים</SelectItem>
                      <SelectItem value="file">קבצים</SelectItem>
                      <SelectItem value="tool">כלים</SelectItem>
                      <SelectItem value="game">משחקים</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.targeting_criteria && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.targeting_criteria}</p>
                  )}
                </div>
              )}

              {formData.targeting_type === 'product_id' && (
                <div>
                  <Label htmlFor="targeting_criteria">מוצר ספציפי *</Label>
                  <Select
                    value={formData.targeting_criteria || ''}
                    onValueChange={(value) => handleInputChange('targeting_criteria', value)}
                  >
                    <SelectTrigger className={validationErrors.targeting_criteria ? 'border-red-500' : ''}>
                      <SelectValue placeholder="בחר מוצר" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={`${product.entity_type}-${product.id}`} value={product.id}>
                          {product.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.targeting_criteria && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.targeting_criteria}</p>
                  )}
                </div>
              )}

              {formData.targeting_type === 'user_segment' && (
                <div>
                  <Label>קבוצות משתמשים</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {[
                      { id: 'new_user', label: 'משתמשים חדשים' },
                      { id: 'content_creator', label: 'יוצרי תוכן' },
                      { id: 'vip', label: 'משתמשי VIP' },
                      { id: 'student', label: 'תלמידים' },
                      { id: 'admin', label: 'מנהלים' }
                    ].map((segment) => (
                      <div key={segment.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={segment.id}
                          checked={formData.user_segments.includes(segment.id)}
                          onChange={(e) => {
                            const segments = e.target.checked
                              ? [...formData.user_segments, segment.id]
                              : formData.user_segments.filter(s => s !== segment.id);
                            handleInputChange('user_segments', segments);
                          }}
                          className="rounded"
                        />
                        <Label htmlFor={segment.id} className="text-sm">{segment.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visibility and Behavior */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                נראות והתנהגות
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="visibility">רמת נראות</Label>
                  <Select
                    value={formData.visibility}
                    onValueChange={(value) => handleInputChange('visibility', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="secret">סודי - דורש קוד</SelectItem>
                      <SelectItem value="public">ציבורי - מוצג ברשימה</SelectItem>
                      <SelectItem value="auto_suggest">הצעה אוטומטית - מוצע בקופה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority_level">רמת עדיפות (1-10)</Label>
                  <Input
                    id="priority_level"
                    type="number"
                    value={formData.priority_level}
                    onChange={(e) => handleInputChange('priority_level', e.target.value)}
                    min="1"
                    max="10"
                  />
                  <p className="text-gray-500 text-sm mt-1">
                    עדיפות גבוהה יותר = יוחל קודם בעת התנגשות
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Limits and Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                מגבלות שימוש ותוקף
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="usage_limit">מגבלת שימוש</Label>
                  <Input
                    id="usage_limit"
                    type="number"
                    value={formData.usage_limit || ''}
                    onChange={(e) => handleInputChange('usage_limit', e.target.value || null)}
                    placeholder="ללא הגבלה"
                    min="1"
                    className={validationErrors.usage_limit ? 'border-red-500' : ''}
                  />
                  {validationErrors.usage_limit && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.usage_limit}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="valid_from">תוקף מתאריך</Label>
                  <Input
                    id="valid_from"
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => handleInputChange('valid_from', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="valid_until">תוקף עד תאריך</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => handleInputChange('valid_until', e.target.value)}
                    className={validationErrors.valid_until ? 'border-red-500' : ''}
                  />
                  {validationErrors.valid_until && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.valid_until}</p>
                  )}
                </div>
              </div>

              {isEditing && (
                <div>
                  <Label>שימושים נוכחיים</Label>
                  <div className="text-lg font-semibold text-gray-900">
                    {formData.usage_count} {formData.usage_limit ? ` / ${formData.usage_limit}` : ''}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/coupons')}
              disabled={isSaving}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEditing ? 'עדכן קופון' : 'צור קופון'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}