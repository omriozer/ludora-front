import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { apiRequest, Product } from '@/services/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AssociateProductDialog from "@/components/ui/AssociateProductDialog";
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
  Shield,
  Plus,
  Ticket,
  TrendingUp,
  Lock,
  Globe,
  UserCheck,
  Clock
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { ludlog, luderror } from '@/lib/ludlog';

export default function CouponForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { currentUser, isLoading: userLoading } = useUser();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Product selection dialog state
  const [showAssociateProductDialog, setShowAssociateProductDialog] = useState(false);
  const [selectedProductForCoupon, setSelectedProductForCoupon] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Form data
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    discount_cap: null,
    minimum_amount: null,
    targeting_type: 'general',
    target_product_types: [],
    target_product_ids: [],
    targeting_metadata: {},
    visibility: 'secret',
    is_active: true,
    usage_limit: null,
    usage_count: 0,
    user_usage_limit: null,
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
      // Load existing coupon if editing
      if (isEditing) {
        ludlog.validation('Loading coupon data for ID:', id);
        const coupon = await apiRequest(`/entities/coupon/${id}`);
        ludlog.validation('Loaded coupon data:', coupon);

        if (coupon) {
          setFormData({
            code: coupon.code || '',
            description: coupon.description || '',
            discount_type: coupon.discount_type || 'percentage',
            discount_value: coupon.discount_value || 0,
            discount_cap: coupon.discount_cap || null,
            minimum_amount: coupon.minimum_amount || null,
            targeting_type: coupon.targeting_type || 'general',
            target_product_types: coupon.target_product_types || [],
            target_product_ids: coupon.target_product_ids || [],
            targeting_metadata: coupon.targeting_metadata || {},
            visibility: coupon.visibility || 'secret',
            is_active: coupon.is_active !== false,
            usage_limit: coupon.usage_limit || null,
            usage_count: coupon.usage_count || 0,
            user_usage_limit: coupon.user_usage_limit || null,
            valid_from: coupon.valid_from ? coupon.valid_from.split('T')[0] : '',
            valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : '',
            priority_level: coupon.priority_level || 5,
            can_stack: coupon.can_stack || false,
            user_segments: coupon.user_segments || []
          });

          ludlog.validation('Form data set. Targeting type:', coupon.targeting_type, 'Target product IDs:', coupon.target_product_ids);

          // Debug the condition check
          ludlog.validation('Condition check:', {
            targeting_type: coupon.targeting_type,
            target_product_ids: coupon.target_product_ids,
            type_check: coupon.targeting_type === 'product_id',
            ids_check: coupon.target_product_ids && coupon.target_product_ids.length > 0,
            combined: coupon.targeting_type === 'product_id' && coupon.target_product_ids && coupon.target_product_ids.length > 0
          });

          // If there are specific products selected, restore the selectedProductForCoupon state
          if (coupon.targeting_type === 'product_id' && coupon.target_product_ids && coupon.target_product_ids.length > 0) {
            // For now, show the first product (we'll enhance this to handle multiple products later)
            const firstProductId = coupon.target_product_ids[0];
            ludlog.validation('Loading product details for first selected product:', firstProductId);
            try {
              // Try to load the product details to show proper information
              const product = await apiRequest(`/entities/product/${firstProductId}`);
              ludlog.validation('Loaded product details:', product);

              if (product) {
                setSelectedProductForCoupon({
                  product_id: product.id,
                  title: product.title,
                  product_type: product.product_type
                });
                ludlog.validation('Set selectedProductForCoupon with details:', {
                  product_id: product.id,
                  title: product.title,
                  product_type: product.product_type
                });
              } else {
                // If product not found, still show the ID
                setSelectedProductForCoupon({
                  product_id: firstProductId
                });
                ludlog.validation('Set selectedProductForCoupon with ID only:', firstProductId);
              }
            } catch (productError) {
              ludlog.validation("Could not load product details for selected product:", productError);
              // Still show the product ID even if we can't load details
              setSelectedProductForCoupon({
                product_id: firstProductId
              });
              ludlog.validation('Set selectedProductForCoupon fallback with ID only:', firstProductId);
            }
          }
        }
      }
    } catch (error) {
      luderror.validation("Error loading data:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת הנתונים' });
    }
    setIsLoading(false);
  };

  // Dialog handler functions
  const handleOpenAssociateProductDialog = () => {
    setFormErrors({});
    setShowAssociateProductDialog(true);
  };

  const handleCloseAssociateProductDialog = () => {
    setFormErrors({});
    setShowAssociateProductDialog(false);
  };

  const handleAssociateProduct = async ({ product_id }) => {
    setFormLoading(true);
    setFormErrors({});

    try {
      ludlog.validation('Product selected:', { product_id });

      // Update the form data with the selected product (add to target_product_ids array)
      setFormData(prev => ({
        ...prev,
        target_product_ids: [...prev.target_product_ids, product_id]
      }));

      // Try to load product details for better display
      try {
        const product = await apiRequest(`/entities/product/${product_id}`);
        ludlog.validation('Product details loaded:', product);

        setSelectedProductForCoupon({
          product_id: product.id,
          title: product.title,
          product_type: product.product_type
        });
      } catch (productError) {
        ludlog.validation('Could not load product details, using ID only:', productError);
        setSelectedProductForCoupon({ product_id });
      }

      setShowAssociateProductDialog(false);

      toast({
        title: "מוצר נבחר",
        description: "המוצר נבחר בהצלחה עבור הקופון",
        variant: "default"
      });
    } catch (error) {
      luderror.validation('Error selecting product:', error);
      setFormErrors({ general: 'שגיאה בבחירת המוצר' });
    }
    setFormLoading(false);
  };

  // Get product type labels
  const getProductTypeLabel = (type) => {
    const labels = {
      workshop: 'סדנה',
      course: 'קורס',
      file: 'קובץ',
      tool: 'כלי',
      game: 'משחק',
      bundle: 'קיט'
    };
    return labels[type] || type;
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

    // Reset targeting arrays when targeting type changes
    if (field === 'targeting_type') {
      setFormData(prev => ({
        ...prev,
        target_product_types: [],
        target_product_ids: [],
        user_segments: []
      }));
      setSelectedProductForCoupon(null);
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

    if (formData.targeting_type === 'product_id' && (!formData.target_product_ids || formData.target_product_ids.length === 0)) {
      errors.target_product_ids = 'יש לבחור מוצר ספציפי';
    }

    if (formData.targeting_type === 'product_type' && (!formData.target_product_types || formData.target_product_types.length === 0)) {
      errors.target_product_types = 'יש לבחור סוג מוצר';
    }

    if (formData.valid_from && formData.valid_until) {
      const fromDate = new Date(formData.valid_from);
      const untilDate = new Date(formData.valid_until);
      if (fromDate >= untilDate) {
        errors.valid_until = 'תאריך סיום חייב להיות אחרי תאריך התחלה';
      }
    }

    if (formData.usage_limit && formData.usage_limit < 1) {
      errors.usage_limit = 'כמות קופונים כללית חייבת להיות לפחות 1';
    }

    if (formData.user_usage_limit && formData.user_usage_limit < 1) {
      errors.user_usage_limit = 'מגבלת שימוש למשתמש חייבת להיות לפחות 1';
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
        user_usage_limit: formData.user_usage_limit ? Number(formData.user_usage_limit) : null,
        priority_level: Number(formData.priority_level),
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null
      };

      ludlog.validation('Saving coupon data:', couponData);
      ludlog.validation('Current form data targeting:', {
        targeting_type: formData.targeting_type,
        target_product_ids: formData.target_product_ids,
        target_product_types: formData.target_product_types
      });
      ludlog.validation('Selected product for coupon state:', selectedProductForCoupon);
      ludlog.validation('Full form data:', formData);

      // Log what we're actually sending to the API
      ludlog.validation('Data being sent to API:', {
        targeting_type: couponData.targeting_type,
        target_product_ids: couponData.target_product_ids,
        target_product_types: couponData.target_product_types,
        fullPayload: couponData
      });

      if (isEditing) {
        const result = await apiRequest(`/entities/coupon/${id}`, {
          method: 'PUT',
          body: JSON.stringify(couponData)
        });
        ludlog.validation('Coupon update result:', result);
        ludlog.validation('Update result targeting check:', {
          targeting_type: result?.targeting_type,
          target_product_ids: result?.target_product_ids,
          target_product_types: result?.target_product_types
        });
        toast({
          title: "קופון עודכן",
          description: "הקופון עודכן בהצלחה במערכת",
          variant: "default"
        });
      } else {
        const result = await apiRequest('/entities/coupon', {
          method: 'POST',
          body: JSON.stringify(couponData)
        });
        ludlog.validation('Coupon create result:', result);
        ludlog.validation('Create result targeting check:', {
          targeting_type: result?.targeting_type,
          target_product_ids: result?.target_product_ids,
          target_product_types: result?.target_product_types
        });
        toast({
          title: "קופון נוצר",
          description: "הקופון נוצר בהצלחה במערכת",
          variant: "default"
        });
      }

      navigate('/coupons');
    } catch (error) {
      luderror.validation('Error saving coupon:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="max-w-[1400px] mx-auto p-4 md:p-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <Button
              variant="outline"
              onClick={() => navigate('/coupons')}
              className="flex items-center gap-2 hover:bg-gray-50 transition-colors self-start"
            >
              <ArrowRight className="w-4 h-4" />
              חזור לרשימת קופונים
            </Button>
          </div>

          <div className="text-center sm:text-right">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg">
                <Ticket className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {isEditing ? 'עריכת קופון' : 'יצירת קופון חדש'}
                </h1>
                <p className="text-gray-600 mt-1 text-lg">
                  {isEditing ? 'ערוך את פרטי הקופון והגדרותיו' : 'צור קופון הנחה עם הגדרות מתקדמות ותמחור חכם'}
                </p>
              </div>
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

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Top Row: Basic Information + Visibility and Behavior */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Basic Information */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md">
                    <Tag className="w-5 h-5" />
                  </div>
                  <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    מידע בסיסי
                  </span>
                </CardTitle>
                <p className="text-gray-600 text-sm mt-2 mr-12">
                  הגדר את הפרטים הבסיסיים של הקופון
                </p>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-blue-600" />
                      קוד קופון *
                    </Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                      placeholder="SAVE20"
                      className={`h-11 text-lg font-mono transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.code ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                    {validationErrors.code && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {validationErrors.code}
                      </p>
                    )}
                    <p className="text-gray-500 text-sm flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      אותיות באנגלית, מספרים ותווי _ - בלבד
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-green-600" />
                      סטטוס קופון
                    </Label>
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                        className="data-[state=checked]:bg-green-600"
                      />
                      <Label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                        {formData.is_active ? (
                          <span className="text-green-700 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            פעיל
                          </span>
                        ) : (
                          <span className="text-gray-500 flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            לא פעיל
                          </span>
                        )}
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-600" />
                      תיאור הקופון
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="תאר את הקופון, תנאי השימוש ומה הוא מציע ללקוחות..."
                      rows={4}
                      className="resize-none transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <p className="text-gray-500 text-sm flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      תיאור ברור יעזור ללקוחות להבין את הערך של הקופון
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visibility and Behavior */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md">
                    <Eye className="w-5 h-5" />
                  </div>
                  <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    נראות והתנהגות
                  </span>
                </CardTitle>
                <p className="text-gray-600 text-sm mt-2 mr-12">
                  קבע איך הקופון יופיע ללקוחות ואת רמת העדיפות שלו
                </p>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="visibility" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-teal-600" />
                      רמת נראות *
                    </Label>
                    <Select
                      value={formData.visibility}
                      onValueChange={(value) => handleInputChange('visibility', value)}
                    >
                      <SelectTrigger className="h-11 transition-all duration-200 focus:ring-2 focus:ring-teal-500 border-gray-200 focus:border-teal-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="secret">
                          <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-gray-600" />
                            <div>
                              <div className="font-medium">סודי - דורש קוד</div>
                              <div className="text-xs text-gray-500">קופון נסתר, דורש הקלדת קוד</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="public">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-blue-600" />
                            <div>
                              <div className="font-medium">ציבורי - מוצג ברשימה</div>
                              <div className="text-xs text-gray-500">מוצג בעמוד הקופונים</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="auto_suggest">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <div>
                              <div className="font-medium">הצעה אוטומטית</div>
                              <div className="text-xs text-gray-500">מוצע אוטומטית בקופה</div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-gray-500 text-sm flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      קופונים סודיים דורשים הקלדת קוד מהלקוח
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority_level" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Target className="w-4 h-4 text-orange-600" />
                      רמת עדיפות (1-10)
                    </Label>
                    <div className="relative">
                      <Input
                        id="priority_level"
                        type="number"
                        value={formData.priority_level}
                        onChange={(e) => handleInputChange('priority_level', e.target.value)}
                        min="1"
                        max="10"
                        className="h-11 pr-12 text-lg font-semibold transition-all duration-200 focus:ring-2 focus:ring-orange-500 border-gray-200 focus:border-orange-500"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Target className="w-5 h-5 text-orange-500" />
                      </div>
                    </div>
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <p className="text-orange-800 text-sm flex items-center gap-1 font-medium">
                        <Info className="w-4 h-4" />
                        סדר עדיפויות
                      </p>
                      <p className="text-orange-700 text-xs mt-1">
                        עדיפות גבוהה יותר = הקופון יוחל קודם כאשר יש מספר קופונים זמינים
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Second Row: Discount Settings + Targeting Settings */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Discount Settings */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  הגדרות הנחה
                </span>
              </CardTitle>
              <p className="text-gray-600 text-sm mt-2 mr-12">
                קבע את סוג ההנחה, הערך והמגבלות המתקדמות
              </p>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="discount_type" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-green-600" />
                    סוג הנחה *
                  </Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value) => handleInputChange('discount_type', value)}
                  >
                    <SelectTrigger className="h-11 transition-all duration-200 focus:ring-2 focus:ring-green-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-green-600" />
                          אחוז הנחה
                        </div>
                      </SelectItem>
                      <SelectItem value="fixed_amount">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-blue-600" />
                          סכום קבוע
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_value" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    ערך הנחה * {formData.discount_type === 'percentage' ? '(%)' : '(₪)'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="discount_value"
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => handleInputChange('discount_value', e.target.value)}
                      placeholder={formData.discount_type === 'percentage' ? '20' : '50'}
                      min="0"
                      max={formData.discount_type === 'percentage' ? '100' : undefined}
                      step="0.01"
                      className={`h-11 pr-12 text-lg font-semibold transition-all duration-200 focus:ring-2 ${
                        validationErrors.discount_value ?
                        'border-red-500 focus:border-red-500 focus:ring-red-500' :
                        'border-gray-200 focus:border-orange-500 focus:ring-orange-500'
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                      {formData.discount_type === 'percentage' ? '%' : '₪'}
                    </div>
                  </div>
                  {validationErrors.discount_value && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.discount_value}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_cap" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    תקרת הנחה (₪)
                  </Label>
                  <div className="relative">
                    <Input
                      id="discount_cap"
                      type="number"
                      value={formData.discount_cap || ''}
                      onChange={(e) => handleInputChange('discount_cap', e.target.value || null)}
                      placeholder="100"
                      min="0"
                      step="0.01"
                      className={`h-11 pr-12 transition-all duration-200 focus:ring-2 ${
                        validationErrors.discount_cap ?
                        'border-red-500 focus:border-red-500 focus:ring-red-500' :
                        'border-gray-200 focus:border-purple-500 focus:ring-purple-500'
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                      ₪
                    </div>
                  </div>
                  {validationErrors.discount_cap && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.discount_cap}
                    </p>
                  )}
                  <p className="text-gray-500 text-sm flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    מגביל את ההנחה המקסימלית (רלוונטי לאחוז הנחה)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="minimum_amount" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                    סכום מינימלי לרכישה (₪)
                  </Label>
                  <div className="relative">
                    <Input
                      id="minimum_amount"
                      type="number"
                      value={formData.minimum_amount || ''}
                      onChange={(e) => handleInputChange('minimum_amount', e.target.value || null)}
                      placeholder="100"
                      min="0"
                      step="0.01"
                      className={`h-11 pr-12 transition-all duration-200 focus:ring-2 ${
                        validationErrors.minimum_amount ?
                        'border-red-500 focus:border-red-500 focus:ring-red-500' :
                        'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500'
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                      ₪
                    </div>
                  </div>
                  {validationErrors.minimum_amount && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {validationErrors.minimum_amount}
                    </p>
                  )}
                  <p className="text-gray-500 text-sm flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    השאר ריק לקופון ללא מינימום רכישה
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Package className="w-4 h-4 text-pink-600" />
                    הגדרות ערימה
                  </Label>
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border">
                    <Switch
                      id="can_stack"
                      checked={formData.can_stack}
                      onCheckedChange={(checked) => handleInputChange('can_stack', checked)}
                      className="data-[state=checked]:bg-pink-600"
                    />
                    <Label htmlFor="can_stack" className="text-sm font-medium cursor-pointer">
                      {formData.can_stack ? (
                        <span className="text-pink-700 flex items-center gap-2">
                          <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                          ניתן לערום עם קופונים אחרים
                        </span>
                      ) : (
                        <span className="text-gray-500 flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          לא ניתן לערום עם קופונים אחרים
                        </span>
                      )}
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

            {/* Targeting Settings */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-md">
                    <Target className="w-5 h-5" />
                  </div>
                  <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    הגדרות מיקוד
                  </span>
                </CardTitle>
                <p className="text-gray-600 text-sm mt-2 mr-12">
                  קבע למי ולאילו מוצרים הקופון יחול
                </p>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="targeting_type" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    סוג מיקוד *
                  </Label>
                  <Select
                    value={formData.targeting_type}
                    onValueChange={(value) => handleInputChange('targeting_type', value)}
                  >
                    <SelectTrigger className="h-11 transition-all duration-200 focus:ring-2 focus:ring-purple-500 border-gray-200 focus:border-purple-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-600" />
                          כללי - כל המוצרים
                        </div>
                      </SelectItem>
                      <SelectItem value="product_type">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-green-600" />
                          סוג מוצר ספציפי
                        </div>
                      </SelectItem>
                      <SelectItem value="product_id">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-purple-600" />
                          מוצר ספציפי
                        </div>
                      </SelectItem>
                      <SelectItem value="user_segment">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-orange-600" />
                          קבוצת משתמשים
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.targeting_type === 'product_type' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Package className="w-4 h-4 text-green-600" />
                      סוגי מוצרים *
                    </Label>
                    <div className="grid grid-cols-1 gap-3 mt-2">
                      {[
                        { id: 'workshop', label: 'סדנאות' },
                        { id: 'course', label: 'קורסים' },
                        { id: 'file', label: 'קבצים' },
                        { id: 'tool', label: 'כלים' },
                        { id: 'game', label: 'משחקים' },
                        { id: 'bundle', label: 'קיטים' }
                      ].map((type) => (
                        <div key={type.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
                          <input
                            type="checkbox"
                            id={type.id}
                            checked={formData.target_product_types.includes(type.id)}
                            onChange={(e) => {
                              const types = e.target.checked
                                ? [...formData.target_product_types, type.id]
                                : formData.target_product_types.filter(t => t !== type.id);
                              handleInputChange('target_product_types', types);
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={type.id} className="text-sm cursor-pointer flex-1">{type.label}</Label>
                        </div>
                      ))}
                    </div>
                    {validationErrors.target_product_types && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {validationErrors.target_product_types}
                      </p>
                    )}
                  </div>
                )}

                {formData.targeting_type === 'product_id' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-600" />
                      מוצרים ספציפיים *
                    </Label>
                    <div className="space-y-3">
                      {formData.target_product_ids.length > 0 ? (
                        <div className="space-y-2">
                          {formData.target_product_ids.map((productId, index) => (
                            <div key={productId} className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                              <Package className="w-5 h-5 text-green-600" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-semibold text-green-800">
                                    {selectedProductForCoupon?.product_id === productId ? selectedProductForCoupon?.title : 'מוצר נבחר'}
                                  </p>
                                  {selectedProductForCoupon?.product_id === productId && selectedProductForCoupon?.product_type && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                      {getProductTypeLabel(selectedProductForCoupon.product_type)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-green-600">
                                  ID: {productId}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const updatedIds = formData.target_product_ids.filter(id => id !== productId);
                                  handleInputChange('target_product_ids', updatedIds);
                                  if (selectedProductForCoupon?.product_id === productId) {
                                    setSelectedProductForCoupon(null);
                                  }
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                הסר
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleOpenAssociateProductDialog}
                        className="w-full flex items-center gap-2 justify-center h-10 border-dashed border-2 hover:border-solid"
                      >
                        <Plus className="w-4 h-4" />
                        {formData.target_product_ids.length > 0 ? 'הוסף מוצר נוסף' : 'בחר מוצר'}
                      </Button>

                      {validationErrors.target_product_ids && (
                        <p className="text-red-500 text-sm flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {validationErrors.target_product_ids}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {formData.targeting_type === 'user_segment' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-600" />
                      קבוצות משתמשים
                    </Label>
                    <div className="grid grid-cols-1 gap-3 mt-2">
                      {[
                        { id: 'new_user', label: 'משתמשים חדשים' },
                        { id: 'content_creator', label: 'יוצרי תוכן' },
                        { id: 'vip', label: 'משתמשי VIP' },
                        { id: 'student', label: 'תלמידים' },
                        { id: 'admin', label: 'מנהלים' }
                      ].map((segment) => (
                        <div key={segment.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
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
                          <Label htmlFor={segment.id} className="text-sm cursor-pointer flex-1">{segment.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Usage Limits and Dates */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md">
                  <Lock className="w-5 h-5" />
                </div>
                <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  מגבלות שימוש ותוקף
                </span>
              </CardTitle>
              <p className="text-gray-600 text-sm mt-2 mr-12">
                קבע מגבלות שימוש חכמות ותקופת תוקף הקופון
              </p>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              {/* Dual Usage Limits Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-100">
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    מגבלות שימוש מתקדמות
                  </h4>
                  <p className="text-gray-600 text-sm">
                    קבע מגבלות נפרדות לכלל השימושים ולמשתמשים יחידים
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Global Usage Limit */}
                  <div className="space-y-2">
                    <Label htmlFor="usage_limit" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-600" />
                      כמות קופונים כללית
                    </Label>
                    <div className="relative">
                      <Input
                        id="usage_limit"
                        type="number"
                        value={formData.usage_limit || ''}
                        onChange={(e) => handleInputChange('usage_limit', e.target.value || null)}
                        placeholder="ללא הגבלה"
                        min="1"
                        className={`h-12 pr-12 text-lg font-semibold transition-all duration-200 focus:ring-2 focus:ring-blue-500 bg-white border-blue-200 ${
                          validationErrors.usage_limit ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Globe className="w-5 h-5 text-blue-500" />
                      </div>
                    </div>
                    {validationErrors.usage_limit && (
                      <p className="text-red-500 text-sm flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {validationErrors.usage_limit}
                      </p>
                    )}
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <p className="text-blue-800 text-sm flex items-center gap-1 font-medium">
                        <Info className="w-4 h-4" />
                        מגבלה כללית
                      </p>
                      <p className="text-blue-700 text-xs mt-1">
                        כמה פעמים בסך הכל ניתן להשתמש בקופון זה בכל המערכת
                      </p>
                    </div>
                  </div>

                  {/* Per-User Usage Limit */}
                  <div className="space-y-2">
                    <Label htmlFor="user_usage_limit" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-purple-600" />
                      מגבלת שימוש למשתמש
                    </Label>
                    <div className="relative">
                      <Input
                        id="user_usage_limit"
                        type="number"
                        value={formData.user_usage_limit || ''}
                        onChange={(e) => handleInputChange('user_usage_limit', e.target.value || null)}
                        placeholder="ללא הגבלה"
                        min="1"
                        className={`h-12 pr-12 text-lg font-semibold transition-all duration-200 focus:ring-2 focus:ring-purple-500 bg-white border-purple-200 ${
                          validationErrors.user_usage_limit ? 'border-red-500 focus:border-red-500' : 'focus:border-purple-500'
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <UserCheck className="w-5 h-5 text-purple-500" />
                      </div>
                    </div>
                    {validationErrors.user_usage_limit && (
                      <p className="text-red-500 text-sm flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {validationErrors.user_usage_limit}
                      </p>
                    )}
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <p className="text-purple-800 text-sm flex items-center gap-1 font-medium">
                        <Info className="w-4 h-4" />
                        מגבלה פרטנית
                      </p>
                      <p className="text-purple-700 text-xs mt-1">
                        כמה פעמים משתמש יחיד יוכל להשתמש בקופון הזה
                      </p>
                    </div>
                  </div>
                </div>

                {/* Usage Limits Explanation */}
                <div className="mt-6 bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-2">איך פועלות המגבלות יחד?</p>
                      <ul className="space-y-1 text-xs">
                        <li>• <strong>מגבלה כללית:</strong> שולטת על כמה פעמים בסך הכל ניתן להשתמש בקופון</li>
                        <li>• <strong>מגבלה למשתמש:</strong> מונעת מאותו משתמש לנצל יתר של הקופון</li>
                        <li>• שתי המגבלות פועלות יחד - המערכת תבדק את שתיהן</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Date Limits Section */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-100">
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    תקופת תוקף
                  </h4>
                  <p className="text-gray-600 text-sm">
                    קבע את תאריכי התחלה וסיום של הקופון
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="valid_from" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-green-600" />
                      תוקף מתאריך
                    </Label>
                    <Input
                      id="valid_from"
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => handleInputChange('valid_from', e.target.value)}
                      className="h-12 transition-all duration-200 focus:ring-2 focus:ring-green-500 bg-white border-green-200 focus:border-green-500"
                    />
                    <p className="text-green-700 text-xs flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      השאר ריק לקופון שפעיל מיד
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valid_until" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-red-600" />
                      תוקף עד תאריך
                    </Label>
                    <Input
                      id="valid_until"
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => handleInputChange('valid_until', e.target.value)}
                      className={`h-12 transition-all duration-200 focus:ring-2 bg-white border-red-200 ${
                        validationErrors.valid_until ?
                        'border-red-500 focus:border-red-500 focus:ring-red-500' :
                        'focus:border-red-500 focus:ring-red-500'
                      }`}
                    />
                    {validationErrors.valid_until && (
                      <p className="text-red-500 text-sm flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {validationErrors.valid_until}
                      </p>
                    )}
                    <p className="text-red-700 text-xs flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      השאר ריק לקופון ללא תאריך תפוגה
                    </p>
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="space-y-3">
                  <div>
                    <Label>שימושים נוכחיים (כללי)</Label>
                    <div className="text-lg font-semibold text-gray-900">
                      {formData.usage_count} {formData.usage_limit ? ` / ${formData.usage_limit}` : ''}
                    </div>
                  </div>
                  {formData.user_usage_limit && (
                    <div>
                      <Label>הגבלה למשתמש</Label>
                      <div className="text-sm text-gray-600">
                        מקסימום {formData.user_usage_limit} שימושים למשתמש יחיד
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Submit Buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-4 pt-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/coupons')}
              disabled={isSaving}
              className="flex items-center gap-2 h-12 px-6 text-gray-700 border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              <ArrowRight className="w-4 h-4" />
              ביטול
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className={`flex items-center gap-3 h-12 px-8 text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl ${
                isEditing
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isEditing ? 'שומר שינויים...' : 'יוצר קופון...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>{isEditing ? 'עדכן קופון' : 'צור קופון'}</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Associate Product Dialog */}
        <AssociateProductDialog
          open={showAssociateProductDialog}
          onOpenChange={(open) => open ? null : handleCloseAssociateProductDialog()}
          item={{ study_topic: 'הקופון', content_topic: formData.code || 'קופון חדש' }}
          onAssociate={handleAssociateProduct}
          loading={formLoading}
          errors={formErrors}
        />
      </div>
    </div>
  );
}