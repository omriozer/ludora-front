import React, { useState, useEffect } from "react";
import { SubscriptionPlan, User, Settings } from "@/services/entities";
import { showConfirm } from '@/utils/messaging';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Crown,
  Users,
  BarChart3,
  Play,
  Infinity,
  Copy, // Added Copy icon for duplicate functionality
  Power
} from "lucide-react";

export default function SubscriptionSettings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Global settings state
  const [globalDiscountDisplayType, setGlobalDiscountDisplayType] = useState('percentage'); // 'percentage' or 'amount'

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    billing_period: 'monthly',
    has_discount: false,
    discount_type: 'percentage',
    discount_value: 0,
    discount_valid_until: '',
    is_active: true,
    is_default: false,
    plan_type: 'free',
    benefits: {
      games_access: {
        enabled: false,
        unlimited: false,
        monthly_limit: 10
      },
      classroom_management: {
        enabled: false,
        unlimited_classrooms: false,
        max_classrooms: 3,
        unlimited_students_per_classroom: false,
        max_students_per_classroom: 30,
        unlimited_total_students: false,
        max_total_students: 100
      },
      reports_access: false
    },
    sort_order: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      setIsAdmin(user.role === 'admin');

      if (user.role === 'admin') {
        const plans = await SubscriptionPlan.list('sort_order');
        setSubscriptionPlans(plans);

        // Load settings
        const settingsData = await Settings.find();
        const currentSettings = settingsData.length > 0 ? settingsData[0] : {};
        setSettings(currentSettings);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת נתונים' });
    }
    setIsLoading(false);
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleToggleSubscriptionSystem = async (enabled) => {
    setIsSavingSettings(true);
    try {
      const updatedSettings = { ...settings, subscription_system_enabled: enabled };

      if (settings && settings.id) {
        await Settings.update(settings.id, updatedSettings);
      } else {
        const createdSettings = await Settings.create(updatedSettings);
        setSettings(createdSettings);
      }

      setSettings(updatedSettings);
      showMessage('success', enabled ? 'תוכנית המנויים הופעלה' : 'תוכנית המנויים הושבתה');
    } catch (error) {
      console.error("Error updating subscription system setting:", error);
      showMessage('error', 'שגיאה בעדכון הגדרת תוכנית המנויים');
    }
    setIsSavingSettings(false);
  };

  // Format price function
  const formatPrice = (price) => {
    // Handle null, undefined, or non-numeric values
    if (price === null || price === undefined || isNaN(price)) {
      return '0';
    }

    // Convert to number if it's a string
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;

    // Handle invalid numbers
    if (isNaN(numPrice)) {
      return '0';
    }

    // Format the price
    if (Number.isInteger(numPrice)) {
      return numPrice.toString();
    }
    return numPrice.toFixed(2);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      billing_period: 'monthly',
      has_discount: false,
      discount_type: 'percentage',
      discount_value: 0,
      discount_valid_until: '',
      is_active: true,
      is_default: false,
      plan_type: 'free',
      benefits: {
        games_access: {
          enabled: false,
          unlimited: false,
          monthly_limit: 10
        },
        classroom_management: {
          enabled: false,
          unlimited_classrooms: false,
          max_classrooms: 3,
          unlimited_students_per_classroom: false,
          max_students_per_classroom: 30,
          unlimited_total_students: false,
          max_total_students: 100
        },
        reports_access: false
      },
      sort_order: 0
    });
    setEditingPlan(null);
    setShowForm(false);
    setValidationErrors({});
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'שם התוכנית הוא שדה חובה';
    }

    if (!formData.description.trim()) {
      errors.description = 'תיאור התוכנית הוא שדה חובה';
    }

    if (formData.price === null || formData.price === undefined || formData.price < 0) {
      errors.price = 'מחיר התוכנית חייב להיות 0 או יותר';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEdit = (plan) => {
    setFormData({
      name: plan.name || '',
      description: plan.description || '',
      price: plan.price || 0,
      billing_period: plan.billing_period || 'monthly',
      has_discount: plan.has_discount !== undefined ? plan.has_discount : false,
      discount_type: plan.discount_type || 'percentage',
      discount_value: plan.discount_value || 0,
      discount_valid_until: plan.discount_valid_until || '',
      is_active: plan.is_active !== undefined ? plan.is_active : true,
      is_default: plan.is_default || false,
      plan_type: plan.plan_type || 'free',
      benefits: {
        games_access: {
          enabled: plan.benefits?.games_access?.enabled || false,
          unlimited: plan.benefits?.games_access?.unlimited || false,
          monthly_limit: plan.benefits?.games_access?.monthly_limit || 10
        },
        classroom_management: {
          enabled: plan.benefits?.classroom_management?.enabled || false,
          unlimited_classrooms: plan.benefits?.classroom_management?.unlimited_classrooms || false,
          max_classrooms: plan.benefits?.classroom_management?.max_classrooms || 3,
          unlimited_students_per_classroom: plan.benefits?.classroom_management?.unlimited_students_per_classroom || false,
          max_students_per_classroom: plan.benefits?.classroom_management?.max_students_per_classroom || 30,
          unlimited_total_students: plan.benefits?.classroom_management?.unlimited_total_students || false,
          max_total_students: plan.benefits?.classroom_management?.max_total_students || 100
        },
        reports_access: plan.benefits?.reports_access || false
      },
      sort_order: plan.sort_order !== undefined ? plan.sort_order : 0
    });
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleDuplicate = (plan) => {
    setFormData({
      name: `${plan.name} - עותק`,
      description: plan.description || '',
      price: plan.price || 0,
      billing_period: plan.billing_period || 'monthly',
      has_discount: plan.has_discount !== undefined ? plan.has_discount : false,
      discount_type: plan.discount_type || 'percentage',
      discount_value: plan.discount_value || 0,
      discount_valid_until: plan.discount_valid_until || '',
      is_active: plan.is_active !== undefined ? plan.is_active : true,
      is_default: false, // New duplicated plan should not be default
      plan_type: plan.plan_type || 'free',
      benefits: {
        games_access: {
          enabled: plan.benefits?.games_access?.enabled || false,
          unlimited: plan.benefits?.games_access?.unlimited || false,
          monthly_limit: plan.benefits?.games_access?.monthly_limit || 10
        },
        classroom_management: {
          enabled: plan.benefits?.classroom_management?.enabled || false,
          unlimited_classrooms: plan.benefits?.classroom_management?.unlimited_classrooms || false,
          max_classrooms: plan.benefits?.classroom_management?.max_classrooms || 3,
          unlimited_students_per_classroom: plan.benefits?.classroom_management?.unlimited_students_per_classroom || false,
          max_students_per_classroom: plan.benefits?.classroom_management?.max_students_per_classroom || 30,
          unlimited_total_students: plan.benefits?.classroom_management?.unlimited_total_students || false,
          max_total_students: plan.benefits?.classroom_management?.max_total_students || 100
        },
        reports_access: plan.benefits?.reports_access || false
      },
      sort_order: plan.sort_order !== undefined ? plan.sort_order : 0
    });
    setEditingPlan(null); // Clear editing plan for new duplicate
    setShowForm(true);
  };

  const handleSave = async () => {
    console.log('🔍 HandleSave called:', { formData, editingPlan });

    if (isSavingPlan) {
      console.log('⏳ Already saving, ignoring click');
      return;
    }

    // Run form validation
    if (!validateForm()) {
      console.log('❌ Validation failed:', validationErrors);
      showMessage('error', 'יש לתקן את השגיאות בטופס לפני השמירה');
      return;
    }

    console.log('✅ Validation passed, attempting to save...');
    setIsSavingPlan(true);

    try {
      if (editingPlan) {
        console.log('📝 Updating existing plan:', editingPlan.id);
        await SubscriptionPlan.update(editingPlan.id, formData);
        showMessage('success', 'תוכנית המנוי עודכנה בהצלחה');
      } else {
        console.log('➕ Creating new plan');
        const result = await SubscriptionPlan.create(formData);
        console.log('✅ Plan created successfully:', result);
        showMessage('success', 'תוכנית המנוי נוצרה בהצלחה');
      }

      resetForm();
      loadData();
    } catch (error) {
      console.error("❌ Error saving subscription plan:", error);
      console.error("Error details:", error.message, error.stack);
      showMessage('error', `שגיאה בשמירת תוכנית המנוי: ${error.message || 'שגיאה לא ידועה'}`);
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleDelete = async (planId) => {
    const confirmed = await showConfirm(
      'מחיקת תוכנית מנוי',
      'האם אתה בטוח שברצונך למחוק תוכנית מנוי זו? פעולה זו לא ניתנת לביטול.',
      { variant: 'danger' }
    );
    if (!confirmed) {
      return;
    }

    try {
      await SubscriptionPlan.delete(planId);
      showMessage('success', 'תוכנית המנוי נמחקה בהצלחה');
      loadData();
    } catch (error) {
      console.error("Error deleting subscription plan:", error);
      showMessage('error', 'שגיאה במחיקת תוכנית המנוי');
    }
  };

  const updateFormField = (field, value) => {
    if (field.includes('.')) {
      const parts = field.split('.');
      setFormData(prev => {
        let newFormData = { ...prev };
        let current = newFormData;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          current[part] = { ...current[part] };
          current = current[part];
        }
        current[parts[parts.length - 1]] = value;
        return newFormData;
      });
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Calculate discounted price
  const calculateDiscountedPrice = (plan) => {
    if (!plan.has_discount || !plan.discount_value || plan.price === 0) {
      return plan.price;
    }

    let discountedPrice;
    if (plan.discount_type === 'percentage') {
      discountedPrice = Math.max(0, plan.price - (plan.price * plan.discount_value / 100));
    } else { // fixed_amount
      discountedPrice = Math.max(0, plan.price - plan.discount_value);
    }
    return discountedPrice;
  };

  const getDiscountText = (plan, displayType = globalDiscountDisplayType) => {
    if (!plan.has_discount || !plan.discount_value) return '';
    
    if (displayType === 'percentage' && plan.discount_type === 'percentage') {
      return `${plan.discount_value}% הנחה`;
    } else if (displayType === 'amount') {
      const discountAmount = plan.discount_type === 'percentage' 
        ? (plan.price * plan.discount_value / 100) 
        : plan.discount_value;
      return `הנחה של ₪${formatPrice(discountAmount)}`;
    } else if (plan.discount_type === 'percentage') {
      return `${plan.discount_value}% הנחה`;
    } else { // displayType is percentage, but plan is fixed_amount
      const percentage = plan.price > 0 ? Math.round((plan.discount_value / plan.price) * 100) : 0;
      return `${percentage}% הנחה`;
    }
  };

  const getBillingPeriodText = (billingPeriod) => {
    switch (billingPeriod) {
      case 'monthly':
        return 'חודשי';
      case 'yearly':
        return 'שנתי';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              אין לך הרשאות גישה להגדרות מנויים. רק מנהלים יכולים לגשת לאזור זה.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const isSubscriptionSystemEnabled = settings?.subscription_system_enabled !== undefined ? settings.subscription_system_enabled : true; // Default to true if setting not found

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            {message.type === 'error' ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">הגדרות מנויים</h1>
            <p className="text-gray-600">ניהול תוכניות מנוי ותמחור</p>
          </div>
        </div>

        {/* Global Subscription System Toggle */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Power className={`w-5 h-5 ${isSubscriptionSystemEnabled ? 'text-green-600' : 'text-red-600'}`} />
              תוכנית המנויים הכללית
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
              <div>
                <div className="font-medium text-gray-900 mb-2">
                  הפעלת תוכנית המנויים
                </div>
                <div className="text-sm text-gray-600">
                  כאשר מכובה, לא יתבצעו בדיקות מנוי ולא יוצגו אפשרויות רכישת מנוי למשתמשים
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={`text-sm font-medium ${isSubscriptionSystemEnabled ? 'text-green-600' : 'text-red-600'}`}>
                  {isSubscriptionSystemEnabled ? 'פעיל' : 'כבוי'}
                </div>
                <Switch
                  checked={isSubscriptionSystemEnabled}
                  onCheckedChange={handleToggleSubscriptionSystem}
                  disabled={isSavingSettings}
                />
              </div>
            </div>

            {!isSubscriptionSystemEnabled && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  תוכנית המנויים כבויה כעת. המשתמשים לא יידרשו למנוי ולא יוצגו להם אפשרויות רכישה.
                  תוכניות המנוי המוגדרות למטה יוצגו במצב לא פעיל.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Global Settings */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              הגדרות כלליות למנויים
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                אופן הצגת הנחות
              </Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="discountDisplay"
                    value="percentage"
                    checked={globalDiscountDisplayType === 'percentage'}
                    onChange={(e) => setGlobalDiscountDisplayType(e.target.value)}
                    className="text-blue-600"
                    disabled={!isSubscriptionSystemEnabled}
                  />
                  <span className="text-sm">הצג כאחוזים (20% הנחה)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="discountDisplay"
                    value="amount"
                    checked={globalDiscountDisplayType === 'amount'}
                    onChange={(e) => setGlobalDiscountDisplayType(e.target.value)}
                    className="text-blue-600"
                    disabled={!isSubscriptionSystemEnabled}
                  />
                  <span className="text-sm">הצג כסכום (הנחה של ₪20)</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Plans List */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {subscriptionPlans.map((plan) => {
            const discountedPrice = calculateDiscountedPrice(plan);
            const hasDiscount = plan.has_discount && plan.discount_value && plan.price > 0;
            
            return (
              <Card key={plan.id} className={`relative group ${!plan.is_active || !isSubscriptionSystemEnabled ? 'opacity-60' : ''} hover:shadow-2xl transition-all duration-500 border-0 bg-white rounded-2xl overflow-hidden ${!isSubscriptionSystemEnabled ? 'pointer-events-none' : ''}`}>
                {/* Disabled overlay when subscription system is off */}
                {!isSubscriptionSystemEnabled && (
                  <div className="absolute inset-0 bg-gray-500/20 z-10 rounded-2xl flex items-center justify-center">
                    <div className="bg-white rounded-lg p-3 shadow-lg">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Power className="w-5 h-5" />
                        <span className="font-medium">תוכנית המנויים כבויה</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Background gradient overlay */}
                <div className={`absolute inset-0 opacity-5 ${plan.plan_type === 'pro' ? 'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500' : 'bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600'}`} />

                {/* Premium badge */}
                {plan.plan_type === 'pro' && (
                  <div className="absolute -top-1 -right-1 w-20 h-20">
                    <div className="absolute transform rotate-45 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold py-1 px-8 top-4 right-[-35px] shadow-lg">
                      פרימיום
                    </div>
                  </div>
                )}

                <CardHeader className="relative pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {plan.plan_type === 'pro' ? (
                          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                            <Crown className="w-6 h-6 text-white" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                            <CreditCard className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            {plan.name}
                          </CardTitle>
                          <div className="flex gap-2 mt-1">
                            {plan.is_default && (
                              <Badge className="bg-green-100 text-green-800 border-0">
                                ברירת מחדל
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {getBillingPeriodText(plan.billing_period)}
                            </Badge>
                            {!isSubscriptionSystemEnabled && (
                              <Badge variant="outline" className="text-xs bg-red-50 text-red-600">
                                לא פעיל
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-sm leading-relaxed">{plan.description}</p>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDuplicate(plan)}
                        className="hover:bg-green-50 hover:text-green-600 transition-colors"
                        title="שכפל מנוי"
                        disabled={!isSubscriptionSystemEnabled}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEdit(plan)}
                        className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        disabled={!isSubscriptionSystemEnabled}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(plan.id)} 
                        className="hover:bg-red-50 hover:text-red-600 transition-colors"
                        disabled={!isSubscriptionSystemEnabled}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="relative">
                  <div className="space-y-6">
                    {/* Price */}
                    <div className="text-center py-4">
                      {plan.price === 0 ? (
                        <span className="text-4xl font-bold text-green-600">חינם</span>
                      ) : (
                        <div>
                          {hasDiscount ? (
                            <div className="space-y-2">
                              {/* Discount badge */}
                              <div className="inline-block bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                {getDiscountText(plan)}
                              </div>

                              {/* Original price (crossed out) */}
                              <div className="flex items-baseline justify-center gap-1">
                                <span className="text-lg text-gray-400 line-through">₪{formatPrice(plan.price)}</span>
                              </div>

                              {/* Discounted price */}
                              <div className="flex items-baseline justify-center gap-1">
                                <span className="text-lg text-gray-500">₪</span>
                                <span className="text-4xl font-bold text-red-600">{formatPrice(discountedPrice)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-lg text-gray-500">₪</span>
                              <span className="text-4xl font-bold text-gray-900">{formatPrice(plan.price)}</span>
                            </div>
                          )}
                          <div className="text-gray-500 text-sm mt-1">
                            ל{getBillingPeriodText(plan.billing_period).replace('י', '')}
                          </div>

                          {/* Discount validity */}
                          {hasDiscount && plan.discount_valid_until && (
                            <div className="text-xs text-red-500 mt-1">
                              ההנחה בתוקף עד: {new Date(plan.discount_valid_until).toLocaleDateString('he-IL')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Benefits */}
                    <div className="space-y-4">
                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
                          הטבות כלולות
                        </h4>

                        <div className="space-y-3">
                          {/* Games Access */}
                          {plan.benefits?.games_access?.enabled ? (
                            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Play className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-green-900 flex items-center gap-2">
                                  גישה למשחקים
                                  {plan.benefits.games_access.unlimited && (
                                    <Infinity className="w-4 h-4 text-green-600" />
                                  )}
                                </div>
                                <div className="text-sm text-green-700 mt-1">
                                  {plan.benefits.games_access.unlimited ?
                                    'גישה בלתי מוגבלת לכל המשחקים' :
                                    `עד ${plan.benefits.games_access.monthly_limit} משחקים בחודש`
                                  }
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 opacity-50">
                              <div className="w-8 h-8 bg-gray-300 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Play className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-600">
                                  גישה למשחקים
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  לא כלול במנוי זה
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Classroom Management */}
                          {plan.benefits?.classroom_management?.enabled ? (
                            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Users className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-blue-900 flex items-center gap-2">
                                  ניהול כיתות
                                  {plan.benefits.classroom_management.unlimited_classrooms && (
                                    <Infinity className="w-4 h-4 text-blue-600" />
                                  )}
                                </div>
                                <div className="text-sm text-blue-700 mt-1">
                                  {plan.benefits.classroom_management.unlimited_classrooms ?
                                    'כיתות ללא הגבלה' :
                                    `עד ${plan.benefits.classroom_management.max_classrooms || 3} כיתות`
                                  }
                                </div>
                                <div className="text-xs text-blue-600 mt-1">
                                  {plan.benefits.classroom_management.unlimited_students_per_classroom ?
                                    'תלמידים ללא הגבלה בכיתה' :
                                    `עד ${plan.benefits.classroom_management.max_students_per_classroom || 30} תלמידים בכיתה`
                                  }
                                </div>
                                {plan.benefits.classroom_management.unlimited_total_students ? (
                                  <div className="text-xs text-blue-600">
                                    תלמידים ללא הגבלה כללית
                                  </div>
                                ) : (plan.benefits.classroom_management.max_total_students !== undefined && plan.benefits.classroom_management.max_total_students !== null) && (
                                  <div className="text-xs text-blue-600">
                                    עד {plan.benefits.classroom_management.max_total_students} תלמידים סה"כ
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 opacity-50">
                              <div className="w-8 h-8 bg-gray-300 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Users className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-600">
                                  ניהול כיתות
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  לא כלול במנוי זה
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Reports Access */}
                          {plan.benefits?.reports_access ? (
                            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                <BarChart3 className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-purple-900">
                                  צפיה בדוחות
                                </div>
                                <div className="text-sm text-purple-700 mt-1">
                                  דוחות מפורטים על פעילות התלמידים
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 opacity-50">
                              <div className="w-8 h-8 bg-gray-300 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                <BarChart3 className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-600">
                                  צפיה בדוחות
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  לא כלול במנוי זה
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status indicator */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${plan.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className={`text-sm font-medium ${plan.is_active ? 'text-green-600' : 'text-red-600'}`}>
                          {plan.is_active ? 'פעיל' : 'לא פעיל'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Add New Plan Button */}
        <div className="text-center">
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            disabled={!isSubscriptionSystemEnabled}
          >
            <Plus className="w-5 h-5 ml-2" />
            {!isSubscriptionSystemEnabled ? 'הפעל תוכנית מנויים להוספת תוכניות' : 'הוסף תוכנית מנוי חדשה'}
          </Button>
        </div>

        {/* Subscription Plan Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {editingPlan ? 'עריכת תוכנית מנוי' : 'יצירת תוכנית מנוי חדשה'}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={resetForm}>
                    <X className="w-6 h-6" />
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Basic Information */}
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2 block">
                        שם התוכנית *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({...formData, name: e.target.value});
                          // Clear validation error when user starts typing
                          if (validationErrors.name) {
                            setValidationErrors(prev => ({ ...prev, name: undefined }));
                          }
                        }}
                        placeholder="למשל: מנוי בסיסי"
                        className={`rounded-lg ${validationErrors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
                      />
                      {validationErrors.name && (
                        <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {validationErrors.name}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-sm font-medium text-gray-700 mb-2 block">
                        תיאור התוכנית *
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => {
                          setFormData({...formData, description: e.target.value});
                          // Clear validation error when user starts typing
                          if (validationErrors.description) {
                            setValidationErrors(prev => ({ ...prev, description: undefined }));
                          }
                        }}
                        placeholder="תיאור קצר של התוכנית והטבותיה"
                        className={`rounded-lg h-24 ${validationErrors.description ? 'border-red-500 focus:ring-red-500' : ''}`}
                      />
                      {validationErrors.description && (
                        <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {validationErrors.description}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price" className="text-sm font-medium text-gray-700 mb-2 block">
                          מחיר *
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => {
                            setFormData({...formData, price: parseFloat(e.target.value) || 0});
                            // Clear validation error when user starts typing
                            if (validationErrors.price) {
                              setValidationErrors(prev => ({ ...prev, price: undefined }));
                            }
                          }}
                          placeholder="0"
                          className={`rounded-lg ${validationErrors.price ? 'border-red-500 focus:ring-red-500' : ''}`}
                        />
                        {validationErrors.price && (
                          <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {validationErrors.price}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="billing_period" className="text-sm font-medium text-gray-700 mb-2 block">
                          תקופת חיוב *
                        </Label>
                        <select
                          id="billing_period"
                          value={formData.billing_period}
                          onChange={(e) => setFormData({...formData, billing_period: e.target.value})}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        >
                          <option value="monthly">חודשי</option>
                          <option value="yearly">שנתי</option>
                        </select>
                      </div>
                    </div>

                    {/* Discount Settings */}
                    <div className="border-t pt-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Switch
                          checked={formData.has_discount}
                          onCheckedChange={(checked) => setFormData({...formData, has_discount: checked})}
                        />
                        <Label className="text-sm font-medium text-gray-700">
                          הפעל הנחה
                        </Label>
                      </div>

                      {formData.has_discount && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              סוג הנחה
                            </Label>
                            <select
                              value={formData.discount_type}
                              onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            >
                              <option value="percentage">אחוזים</option>
                              <option value="fixed_amount">סכום קבוע</option>
                            </select>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              {formData.discount_type === 'percentage' ? 'אחוז הנחה' : 'סכום הנחה (₪)'}
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              max={formData.discount_type === 'percentage' ? "100" : undefined}
                              step={formData.discount_type === 'percentage' ? "1" : "0.01"}
                              value={formData.discount_value}
                              onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value) || 0})}
                              className="rounded-lg"
                            />
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">
                              תוקף עד (אופציונלי)
                            </Label>
                            <Input
                              type="date"
                              value={formData.discount_valid_until}
                              onChange={(e) => setFormData({...formData, discount_valid_until: e.target.value})}
                              className="rounded-lg"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Plan Settings */}
                    <div className="border-t pt-6 space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          סוג תוכנית *
                        </Label>
                        <select
                          value={formData.plan_type}
                          onChange={(e) => setFormData({...formData, plan_type: e.target.value})}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        >
                          <option value="free">חינם</option>
                          <option value="pro">פרימיום</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <Switch
                          checked={formData.is_default}
                          onCheckedChange={(checked) => setFormData({...formData, is_default: checked})}
                        />
                        <Label className="text-sm font-medium text-gray-700">
                          תוכנית ברירת מחדל
                        </Label>
                      </div>

                      <div className="flex items-center gap-3">
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                        />
                        <Label className="text-sm font-medium text-gray-700">
                          תוכנית פעילה
                        </Label>
                      </div>

                      <div>
                        <Label htmlFor="sort_order" className="text-sm font-medium text-gray-700 mb-2 block">
                          סדר הצגה
                        </Label>
                        <Input
                          id="sort_order"
                          type="number"
                          value={formData.sort_order}
                          onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                          className="rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 mb-4">הטבות</h3>

                    {/* Games Access */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Play className="w-4 h-4" />
                          גישה למשחקים
                        </Label>
                        <Switch
                          checked={formData.benefits.games_access.enabled}
                          onCheckedChange={(checked) => updateFormField('benefits.games_access.enabled', checked)}
                        />
                      </div>

                      {formData.benefits.games_access.enabled && (
                        <>
                          <div className="flex items-center justify-between">
                            <Label>גישה בלתי מוגבלת</Label>
                            <Switch
                              checked={formData.benefits.games_access.unlimited}
                              onCheckedChange={(checked) => updateFormField('benefits.games_access.unlimited', checked)}
                            />
                          </div>

                          {!formData.benefits.games_access.unlimited && (
                            <div>
                              <Label htmlFor="monthly_limit">מגבלת משחקים חודשית</Label>
                              <Input
                                id="monthly_limit"
                                type="number"
                                min="1"
                                value={formData.benefits.games_access.monthly_limit}
                                onChange={(e) => updateFormField('benefits.games_access.monthly_limit', parseInt(e.target.value) || 10)}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Classroom Management */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          ניהול כיתות
                        </Label>
                        <Switch
                          checked={formData.benefits.classroom_management.enabled}
                          onCheckedChange={(checked) => updateFormField('benefits.classroom_management.enabled', checked)}
                        />
                      </div>

                      {formData.benefits.classroom_management.enabled && (
                        <>
                          <div className="flex items-center justify-between">
                            <Label>כיתות ללא הגבלה</Label>
                            <Switch
                              checked={formData.benefits.classroom_management.unlimited_classrooms}
                              onCheckedChange={(checked) => updateFormField('benefits.classroom_management.unlimited_classrooms', checked)}
                            />
                          </div>

                          {!formData.benefits.classroom_management.unlimited_classrooms && (
                            <div>
                              <Label htmlFor="max_classrooms">מספר כיתות מקסימלי</Label>
                              <Input
                                id="max_classrooms"
                                type="number"
                                min="1"
                                value={formData.benefits.classroom_management.max_classrooms}
                                onChange={(e) => updateFormField('benefits.classroom_management.max_classrooms', parseInt(e.target.value) || 3)}
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <Label>תלמידים ללא הגבלה בכיתה</Label>
                            <Switch
                              checked={formData.benefits.classroom_management.unlimited_students_per_classroom}
                              onCheckedChange={(checked) => updateFormField('benefits.classroom_management.unlimited_students_per_classroom', checked)}
                            />
                          </div>

                          {!formData.benefits.classroom_management.unlimited_students_per_classroom && (
                            <div>
                              <Label htmlFor="max_students_per_classroom">מספר תלמידים מקסימלי בכיתה</Label>
                              <Input
                                id="max_students_per_classroom"
                                type="number"
                                min="1"
                                value={formData.benefits.classroom_management.max_students_per_classroom}
                                onChange={(e) => updateFormField('benefits.classroom_management.max_students_per_classroom', parseInt(e.target.value) || 30)}
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <Label>תלמידים ללא הגבלה כללית</Label>
                            <Switch
                              checked={formData.benefits.classroom_management.unlimited_total_students}
                              onCheckedChange={(checked) => updateFormField('benefits.classroom_management.unlimited_total_students', checked)}
                            />
                          </div>

                          {!formData.benefits.classroom_management.unlimited_total_students && (
                            <div>
                              <Label htmlFor="max_total_students">מספר תלמידים מקסימלי כללי</Label>
                              <Input
                                id="max_total_students"
                                type="number"
                                min="1"
                                value={formData.benefits.classroom_management.max_total_students}
                                onChange={(e) => updateFormField('benefits.classroom_management.max_total_students', parseInt(e.target.value) || 100)}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Reports Access */}
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        צפיה בדוחות
                      </Label>
                      <Switch
                        checked={formData.benefits.reports_access}
                        onCheckedChange={(checked) => updateFormField('benefits.reports_access', checked)}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
                  <Button variant="outline" onClick={resetForm}>
                    ביטול
                  </Button>
                  <Button
                    onClick={(e) => {
                      console.log('🖱️ Save button clicked!', e);
                      handleSave();
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isSavingPlan}
                  >
                    {isSavingPlan ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                        שומר...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 ml-2" />
                        {editingPlan ? 'עדכן תוכנית' : 'צור תוכנית'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
