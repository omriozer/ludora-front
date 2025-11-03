import React, { useState, useEffect } from "react";
import { apiRequest } from '@/services/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  ArrowRight,
  AlertCircle,
  Info,
  Play,
  Copy,
  Eye,
  RefreshCw,
  Settings,
  Tag,
  Percent,
  Target,
  Calendar,
  Sparkles,
  CheckCircle,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { clog, cerror } from "@/lib/utils";

export default function BulkCouponGenerator() {
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedCoupons, setGeneratedCoupons] = useState([]);

  // Pattern settings
  const [patternSettings, setPatternSettings] = useState({
    pattern: 'SAVE-####',
    count: 10,
    charSet: 'alphanumeric',
    presetType: 'custom'
  });

  // Preview
  const [previewCodes, setPreviewCodes] = useState([]);
  const [patternValidation, setPatternValidation] = useState(null);

  // Coupon settings
  const [couponSettings, setCouponSettings] = useState({
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    discount_cap: null,
    minimum_amount: null,
    targeting_type: 'general',
    targeting_criteria: null,
    visibility: 'secret',
    is_active: false, // Start inactive for safety
    usage_limit: 1,
    valid_from: '',
    valid_until: '',
    priority_level: 5,
    can_stack: false
  });

  // Available presets
  const presets = {
    student: { pattern: 'STUDENT-###', description: 'קופונים לתלמידים' },
    vip: { pattern: 'VIP-####', description: 'קופוני VIP' },
    holiday: { pattern: 'HOLIDAY##', description: 'קופוני חג' },
    general: { pattern: 'SAVE####', description: 'קופונים כלליים' },
    referral: { pattern: 'REF-####', description: 'קופוני הפניה' },
    welcome: { pattern: 'WELCOME##', description: 'קופוני ברוכים הבאים' },
    flashsale: { pattern: 'FLASH###', description: 'קופוני מבזק' },
    earlybird: { pattern: 'EARLY###', description: 'קופוני ציפור מוקדמת' },
    loyalty: { pattern: 'LOYAL###', description: 'קופוני נאמנות' },
    creator: { pattern: 'CREATE##', description: 'קופוני יוצרי תוכן' }
  };

  useEffect(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    validatePattern();
  }, [patternSettings.pattern]);

  useEffect(() => {
    if (patternValidation?.isValid) {
      generatePreview();
    }
  }, [patternSettings, patternValidation]);

  const validatePattern = async () => {
    if (!patternSettings.pattern) {
      setPatternValidation(null);
      return;
    }

    try {
      const data = await apiRequest('/functions/validateCouponPattern', {
        method: 'POST',
        body: JSON.stringify({
          pattern: patternSettings.pattern
        })
      });

      if (data.validation) {
        setPatternValidation(data.validation);
      }
    } catch (error) {
      cerror('Error validating pattern:', error);
    }
  };

  const generatePreview = async () => {
    if (!patternValidation?.isValid) return;

    try {
      await apiRequest('/functions/getCouponPresetPatterns');

      // Generate a few sample codes for preview
      const sampleCodes = [];
      for (let i = 0; i < Math.min(5, patternSettings.count); i++) {
        let code = patternSettings.pattern;

        // Replace # with random numbers
        code = code.replace(/#/g, () => Math.floor(Math.random() * 10));
        // Replace @ with random letters
        code = code.replace(/@/g, () => String.fromCharCode(65 + Math.floor(Math.random() * 26)));

        sampleCodes.push(code);
      }
      setPreviewCodes(sampleCodes);
    } catch (error) {
      cerror('Error generating preview:', error);
    }
  };

  const handlePresetChange = (presetType) => {
    if (presets[presetType]) {
      setPatternSettings(prev => ({
        ...prev,
        pattern: presets[presetType].pattern,
        presetType
      }));
    }
  };

  const handleGenerate = async () => {
    if (!patternValidation?.isValid) {
      setMessage({ type: 'error', text: 'התבנית אינה תקינה' });
      return;
    }

    if (patternSettings.count < 1 || patternSettings.count > 1000) {
      setMessage({ type: 'error', text: 'מספר הקופונים חייב להיות בין 1 ל-1000' });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedCoupons([]);

    try {
      // Prepare coupon data
      const couponData = {
        ...couponSettings,
        discount_value: Number(couponSettings.discount_value),
        discount_cap: couponSettings.discount_cap ? Number(couponSettings.discount_cap) : null,
        minimum_amount: couponSettings.minimum_amount ? Number(couponSettings.minimum_amount) : null,
        usage_limit: couponSettings.usage_limit ? Number(couponSettings.usage_limit) : null,
        priority_level: Number(couponSettings.priority_level),
        valid_from: couponSettings.valid_from || null,
        valid_until: couponSettings.valid_until || null
      };

      const data = await apiRequest('/functions/generateCouponCodes', {
        method: 'POST',
        body: JSON.stringify({
          pattern: patternSettings.pattern,
          count: patternSettings.count,
          charSet: patternSettings.charSet,
          couponData
        })
      });

      if (data.success) {
        setGeneratedCoupons(data.data.generated_coupons);
        setGenerationProgress(100);

        toast({
          title: "קופונים נוצרו בהצלחה",
          description: `נוצרו ${data.data.generated_coupons.length} קופונים חדשים`,
          variant: "default"
        });

        setMessage({
          type: 'success',
          text: `נוצרו בהצלחה ${data.data.generated_coupons.length} קופונים`
        });
      } else {
        throw new Error(data.message || 'שגיאה ביצירת הקופונים');
      }
    } catch (error) {
      cerror('Error generating coupons:', error);
      setMessage({ type: 'error', text: error.message || 'שגיאה ביצירת הקופונים' });
    }

    setIsGenerating(false);
  };

  const downloadCoupons = () => {
    if (generatedCoupons.length === 0) return;

    const csvContent = [
      ['קוד קופון', 'תיאור', 'סוג הנחה', 'ערך הנחה', 'סטטוס', 'תאריך יצירה'].join(','),
      ...generatedCoupons.map(coupon => [
        coupon.code,
        coupon.description || '',
        coupon.discount_type === 'percentage' ? 'אחוז' : 'סכום קבוע',
        coupon.discount_value,
        coupon.is_active ? 'פעיל' : 'לא פעיל',
        new Date(coupon.created_at).toLocaleDateString('he-IL')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coupons-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "קובץ הורד",
      description: "רשימת הקופונים הורדה בהצלחה",
      variant: "default"
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "הועתק",
      description: "הקוד הועתק ללוח",
      variant: "default"
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">טוען...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <Link to="/coupons">
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                חזור לניהול קופונים
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">יצירת קופונים בכמות</h1>
              <p className="text-gray-500">צור מספר קופונים בבת אחת עם הגדרות משותפות</p>
            </div>
          </div>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            {message.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pattern Builder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  בנאי תבניות קוד
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preset Selection */}
                <div>
                  <Label>תבניות מוכנות</Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
                    {Object.entries(presets).map(([key, preset]) => (
                      <Button
                        key={key}
                        variant={patternSettings.presetType === key ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePresetChange(key)}
                        className="text-xs"
                      >
                        {preset.pattern}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Pattern */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="pattern">תבנית קוד *</Label>
                    <Input
                      id="pattern"
                      value={patternSettings.pattern}
                      onChange={(e) => setPatternSettings(prev => ({
                        ...prev,
                        pattern: e.target.value.toUpperCase(),
                        presetType: 'custom'
                      }))}
                      placeholder="SAVE-####"
                      className={!patternValidation?.isValid && patternSettings.pattern ? 'border-red-500' : ''}
                    />
                    <p className="text-gray-500 text-sm mt-1">
                      # = מספר, @ = אות, - = קו מפריד
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="charSet">סט תווים</Label>
                    <Select
                      value={patternSettings.charSet}
                      onValueChange={(value) => setPatternSettings(prev => ({ ...prev, charSet: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alphanumeric">אותיות ומספרים</SelectItem>
                        <SelectItem value="alphabetic">אותיות בלבד</SelectItem>
                        <SelectItem value="numeric">מספרים בלבד</SelectItem>
                        <SelectItem value="uppercase">אותיות גדולות</SelectItem>
                        <SelectItem value="lowercase">אותיות קטנות</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="count">כמות קופונים *</Label>
                    <Input
                      id="count"
                      type="number"
                      value={patternSettings.count}
                      onChange={(e) => setPatternSettings(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
                      min="1"
                      max="1000"
                    />
                    <p className="text-gray-500 text-sm mt-1">מקסימום 1000 קופונים</p>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={generatePreview}
                      disabled={!patternValidation?.isValid}
                      className="flex items-center gap-2 w-full"
                    >
                      <RefreshCw className="w-4 h-4" />
                      רענן תצוגה מקדימה
                    </Button>
                  </div>
                </div>

                {/* Pattern Validation */}
                {patternValidation && (
                  <div className={`p-3 rounded-lg ${
                    patternValidation.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {patternValidation.isValid ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${
                        patternValidation.isValid ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {patternValidation.isValid ? 'תבנית תקינה' : 'תבנית לא תקינה'}
                      </span>
                    </div>
                    {patternValidation.message && (
                      <p className={`text-sm mt-1 ${
                        patternValidation.isValid ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {patternValidation.message}
                      </p>
                    )}
                    {patternValidation.possibleCombinations && (
                      <p className="text-sm text-gray-600 mt-1">
                        צירופים אפשריים: {patternValidation.possibleCombinations.toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coupon Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  הגדרות קופון משותפות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="description">תיאור</Label>
                  <Textarea
                    id="description"
                    value={couponSettings.description}
                    onChange={(e) => setCouponSettings(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="תיאור הקופונים ותנאי השימוש"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="discount_type">סוג הנחה</Label>
                    <Select
                      value={couponSettings.discount_type}
                      onValueChange={(value) => setCouponSettings(prev => ({ ...prev, discount_type: value }))}
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
                      ערך הנחה {couponSettings.discount_type === 'percentage' ? '(%)' : '(₪)'}
                    </Label>
                    <Input
                      id="discount_value"
                      type="number"
                      value={couponSettings.discount_value}
                      onChange={(e) => setCouponSettings(prev => ({ ...prev, discount_value: e.target.value }))}
                      min="0"
                      max={couponSettings.discount_type === 'percentage' ? '100' : undefined}
                      step="0.01"
                    />
                  </div>

                  <div>
                    <Label htmlFor="usage_limit">מגבלת שימוש</Label>
                    <Input
                      id="usage_limit"
                      type="number"
                      value={couponSettings.usage_limit || ''}
                      onChange={(e) => setCouponSettings(prev => ({ ...prev, usage_limit: e.target.value || null }))}
                      placeholder="ללא הגבלה"
                      min="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valid_from">תוקף מתאריך</Label>
                    <Input
                      id="valid_from"
                      type="date"
                      value={couponSettings.valid_from}
                      onChange={(e) => setCouponSettings(prev => ({ ...prev, valid_from: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="valid_until">תוקף עד תאריך</Label>
                    <Input
                      id="valid_until"
                      type="date"
                      value={couponSettings.valid_until}
                      onChange={(e) => setCouponSettings(prev => ({ ...prev, valid_until: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Label htmlFor="is_active">הפעל קופונים מיד</Label>
                  <Switch
                    id="is_active"
                    checked={couponSettings.is_active}
                    onCheckedChange={(checked) => setCouponSettings(prev => ({ ...prev, is_active: checked }))}
                  />
                  <p className="text-gray-500 text-sm">מומלץ להשאיר כבוי לבדיקה</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview and Actions Panel */}
          <div className="space-y-6">
            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  תצוגה מקדימה
                </CardTitle>
              </CardHeader>
              <CardContent>
                {previewCodes.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-3">דוגמאות קודים:</p>
                    {previewCodes.map((code, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <code className="font-mono text-sm">{code}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(code)}
                          className="p-1"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    {patternSettings.count > 5 && (
                      <p className="text-xs text-gray-500 text-center mt-2">
                        ועוד {patternSettings.count - 5} קופונים...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Tag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm">הזן תבנית תקינה לתצוגה מקדימה</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generation Progress */}
            {isGenerating && (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
                    <p className="font-medium mb-2">יוצר קופונים...</p>
                    <Progress value={generationProgress} className="w-full" />
                    <p className="text-sm text-gray-500 mt-2">{generationProgress}%</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generate Button */}
            <Card>
              <CardContent className="p-6">
                <Button
                  onClick={handleGenerate}
                  disabled={!patternValidation?.isValid || isGenerating}
                  className="w-full flex items-center gap-2"
                  size="lg"
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                  יצור {patternSettings.count} קופונים
                </Button>

                {generatedCoupons.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Button
                      onClick={downloadCoupons}
                      variant="outline"
                      className="w-full flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      הורד קופונים (CSV)
                    </Button>
                    <p className="text-center text-sm text-green-600">
                      ✅ נוצרו {generatedCoupons.length} קופונים בהצלחה
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  טיפים
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-2">
                <p>• התחל עם קופונים לא פעילים לבדיקה</p>
                <p>• השתמש בתבניות ברורות ומובנות</p>
                <p>• הגדר תאריכי תוקף מתאימים</p>
                <p>• בדוק תצוגה מקדימה לפני יצירה</p>
                <p>• שמור רשימת קופונים שנוצרו</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Results Section */}
        {generatedCoupons.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                קופונים שנוצרו ({generatedCoupons.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                {generatedCoupons.slice(0, 50).map((coupon, index) => (
                  <div key={coupon.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                    <div>
                      <code className="font-mono font-semibold">{coupon.code}</code>
                      <p className="text-xs text-gray-500">
                        {coupon.discount_type === 'percentage' ?
                          `${coupon.discount_value}% הנחה` :
                          `₪${coupon.discount_value} הנחה`
                        }
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(coupon.code)}
                      className="p-1"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>

              {generatedCoupons.length > 50 && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  מציג 50 ראשונים מתוך {generatedCoupons.length} קופונים. הורד קובץ CSV לרשימה המלאה.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}