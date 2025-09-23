
import React, { useState, useEffect } from "react";
import { SiteText, User } from "@/services/entities";
import { getProductTypeName, NAV_ITEMS } from '@/config/productTypes';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Edit,
  Save,
  Plus,
  Trash2,
  Search,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  FileText
} from "lucide-react";

export default function SiteTexts() {
  const [texts, setTexts] = useState([]);
  const [filteredTexts, setFilteredTexts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editingText, setEditingText] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [formData, setFormData] = useState({
    key: "",
    text: "",
    category: "general",
    description: ""
  });

  const categories = [
    { value: "navigation", label: "ניווט" },
    { value: "buttons", label: "כפתורים" },
    { value: "homepage", label: "דף הבית" },
    { value: "catalog", label: "קטלוג" },
    { value: "payment", label: "תשלום" },
    { value: "account", label: "חשבון" },
    { value: "notifications", label: "התראות" },
    { value: "footer", label: "כותרת תחתית" },
    { value: "forms", label: "טפסים" },
    { value: "general", label: "כללי" }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterTexts();
  }, [texts, searchTerm, selectedCategory]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      setIsAdmin(user.role === 'admin');

      if (user.role === 'admin') {
        const textsData = await SiteText.list("category");
        setTexts(textsData);

        // Initialize default texts if none exist
        if (textsData.length === 0) {
          await initializeDefaultTexts();
          const newTextsData = await SiteText.list("category");
          setTexts(newTextsData);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const initializeDefaultTexts = async () => {
    const defaultTexts = [
      // Navigation
      { key: "nav.workshops", text: NAV_ITEMS.workshops.text, category: "navigation", description: `כפתור ${getProductTypeName('workshop', 'plural')} בתפריט הראשי` },
      { key: "nav.courses", text: NAV_ITEMS.courses.text, category: "navigation", description: `כפתור ${getProductTypeName('course', 'plural')} בתפריט הראשי` },
      { key: "nav.tools", text: NAV_ITEMS.files.text, category: "navigation", description: `כפתור ${getProductTypeName('tool', 'plural')} בתפריט הראשי` },
      { key: "nav.myAccount", text: "החשבון שלי", category: "navigation", description: "כפתור החשבון שלי בתפריט" },
      { key: "nav.adminSystem", text: "מנהל מערכת", category: "navigation", description: "כפתור מנהל מערכת למנהלים" },
      { key: "nav.login", text: "התחברות", category: "navigation", description: "כפתור התחברות" },
      { key: "nav.logout", text: "התנתקות", category: "navigation", description: "כפתור התנתקות" },

      // Homepage
      { key: "home.title", text: `${getProductTypeName('workshop', 'plural')} חינוכיות`, category: "homepage", description: "כותרת ראשית בדף הבית" },
      { key: "home.subtitle", text: `למדו ${getProductTypeName('tool', 'plural')} דיגיטליים חדישים שיעזרו לכם ליצור חוויות למידה מרתקות ואינטראקטיביות`, category: "homepage", description: "תת כותרת בדף הבית" },
      { key: "home.cta.viewWorkshops", text: `צפו ב${getProductTypeName('workshop', 'plural')}`, category: "homepage", description: "כפתור ראשי בדף הבית" },
      { key: "home.cta.learnMore", text: "למדו עוד", category: "homepage", description: "כפתור שני בדף הבית" },
      { key: "home.features.title", text: `למה לבחור ב${getProductTypeName('workshop', 'plural')} שלי?`, category: "homepage", description: "כותרת מאפיינים" },
      { key: "home.features.subtitle", text: `אני מספקת ${getProductTypeName('tool', 'plural')} מעשיים ומתקדמים שיעזרו לכם להתקדם בקריירה החינוכית`, category: "homepage", description: "תת כותרת מאפיינים" },
      { key: "home.features.advanced", text: `${getProductTypeName('workshop', 'plural')} מתקדמות`, category: "homepage", description: "מאפיין ראשון" },
      { key: "home.features.community", text: "קהילת מורים ומורות", category: "homepage", description: "מאפיין שני" },
      { key: "home.features.certificates", text: "הסמכות מקצועיות", category: "homepage", description: "מאפיין שלישי" },
      { key: "home.features.recordings", text: "הקלטות איכותיות", category: "homepage", description: "מאפיין רביעי" },
      { key: "home.testimonials.title", text: "מה אומרים עליי", category: "homepage", description: "כותרת המלצות" },
      { key: "home.testimonials.subtitle", text: `הצלחות של מורים ומורות שהשתתפו ב${getProductTypeName('workshop', 'plural')} שלי`, category: "homepage", description: "תת כותרת המלצות" },
      { key: "home.cta.final.title", text: "מוכנים להתחיל את המסע שלכם?", category: "homepage", description: "כותרת CTA סופי" },
      { key: "home.cta.final.subtitle", text: "הצטרפו אליי והפכו למורים ולמורות המתקדמים שאתם רוצים להיות", category: "homepage", description: "תת כותרת CTA סופי" },
      { key: "home.cta.final.button", text: "התחילו עכשיו", category: "homepage", description: "כפתור CTA סופי" },

      // Catalog
      { key: "catalog.title", text: `קטלוג ה${getProductTypeName('workshop', 'plural')}`, category: "catalog", description: "כותרת דף הקטלוג" },
      { key: "catalog.subtitle", text: `${getProductTypeName('workshop', 'plural')} אונליין ומוקלטות לבחירתך במגוון תחומים`, category: "catalog", description: "תת כותרת דף הקטלוג" },
      { key: "catalog.search", text: `חפשי ${getProductTypeName('workshop', 'singular')}...`, category: "catalog", description: "placeholder לחיפוש" },
      { key: "catalog.registerNow", text: "הירשמו עכשיו", category: "catalog", description: "כפתור הרשמה בקטלוג" },
      { key: "catalog.upcoming", text: `${getProductTypeName('workshop', 'plural')} קרובות`, category: "catalog", description: `טאב ${getProductTypeName('workshop', 'plural')} קרובות` },
      { key: "catalog.recordings", text: "הקלטות", category: "catalog", description: "טאב הקלטות" },
      { key: "catalog.allCategories", text: "כל הקטגוריות", category: "catalog", description: "אופציה בסלקט קטגוריות" },
      { key: "catalog.noUpcoming", text: `אין ${getProductTypeName('workshop', 'plural')} קרובות`, category: "catalog", description: `הודעה כשאין ${getProductTypeName('workshop', 'plural')} קרובות` },
      { key: "catalog.noUpcoming.subtitle", text: `${getProductTypeName('workshop', 'plural')} חדשות יפורסמו בקרוב`, category: "catalog", description: `תת הודעה כשאין ${getProductTypeName('workshop', 'plural')} קרובות` },
      { key: "catalog.noRecordings", text: "אין הקלטות זמינות", category: "catalog", description: "הודעה כשאין הקלטות" },
      { key: "catalog.noRecordings.subtitle", text: "הקלטות יועלו בהמשך", category: "catalog", description: "תת הודעה כשאין הקלטות" },
      { key: "catalog.getAccess", text: "קבלת גישה", category: "catalog", description: "כפתור לקבלת גישה" },
      { key: "catalog.watchRecording", text: "צפיה בהקלטה", category: "catalog", description: "כפתור צפיה בהקלטה" },
      { key: "catalog.loading", text: `טוען ${getProductTypeName('workshop', 'plural')}...`, category: "catalog", description: "הודעת טעינה" },

      // Account
      { key: "account.title", text: "החשבון שלי", category: "account", description: "כותרת דף החשבון" },
      { key: "account.subtitle", text: "נהלי את ההרשמות והגישה להקלטות שלך", category: "account", description: "תת כותרת דף החשבון" },
      { key: "account.personalInfo", text: "פרטים אישיים", category: "account", description: "כותרת פרטים אישיים" },
      { key: "account.fullName", text: "שם מלא", category: "account", description: "לייבל שם מלא" },
      { key: "account.email", text: "אימייל", category: "account", description: "לייבל אימייל" },
      { key: "account.myRecordings", text: "ההקלטות שלי", category: "account", description: "כותרת הקלטות" },
      { key: "account.upcomingWorkshops", text: `${getProductTypeName('workshop', 'plural')} קרובות`, category: "account", description: `כותרת ${getProductTypeName('workshop', 'plural')} קרובות` },
      { key: "account.orderNumber", text: "מספר הזמנה", category: "account", description: "לייבל מספר הזמנה" },
      { key: "account.pendingPayment", text: "ממתין לתשלום", category: "account", description: "סטטוס ממתין לתשלום" },
      { key: "account.paid", text: "שולם", category: "account", description: "סטטוס שולם" },
      { key: "account.accessUntil", text: "גישה זמינה עד", category: "account", description: "טקסט גישה זמינה עד" },
      { key: "account.accessExpired", text: "הגישה פגה ב-", category: "account", description: "טקסט גישה פגה" },
      { key: "account.watchRecording", text: "צפה בהקלטה", category: "account", description: "כפתור צפיה בהקלטה" },
      { key: "account.joinWorkshop", text: `הצטרף ל${getProductTypeName('workshop', 'singular')}`, category: "account", description: `כפתור הצטרפות ל${getProductTypeName('workshop', 'singular')}` },
      { key: "account.linkComingSoon", text: "קישור יישלח בקרוב", category: "account", description: "הודעה שקישור יישלח" },
      { key: "account.recordingNotAvailable", text: "הקלטה לא זמינה", category: "account", description: "הודעה שהקלטה לא זמינה" },
      { key: "account.noRecordings", text: "אין לך הקלטות זמינות כרגע.", category: "account", description: "הודעה כשאין הקלטות" },
      { key: "account.reportIssue", text: "דווח תקלה", category: "account", description: "כפתור דיווח תקלה" },
      { key: "account.loadingData", text: "טוען נתונים...", category: "account", description: "הודעת טעינה" },

      // Buttons
      { key: "button.save", text: "שמור", category: "buttons", description: "כפתור שמירה כללי" },
      { key: "button.cancel", text: "ביטול", category: "buttons", description: "כפתור ביטול כללי" },
      { key: "button.edit", text: "ערוך", category: "buttons", description: "כפתור עריכה כללי" },
      { key: "button.delete", text: "מחק", category: "buttons", description: "כפתור מחיקה כללי" },
      { key: "button.loading", text: "טוען...", category: "buttons", description: "טקסט טעינה כללי" },

      // Footer
      { key: "footer.privacy", text: "מדיניות פרטיות", category: "footer", description: "קישור מדיניות פרטיות" },
      { key: "footer.terms", text: "תנאי שימוש", category: "footer", description: "קישור תנאי שימוש" },
      { key: "footer.contact", text: "צור קשר", category: "footer", description: "קישור יצירת קשר" },
      { key: "footer.description", text: `${getProductTypeName('workshop', 'plural')} חינוכיות מתקדמות לעידן הדיגיטלי`, category: "footer", description: "תיאור בפוטר" },
      { key: "footer.importantLinks", text: "קישורים חשובים", category: "footer", description: "כותרת קישורים חשובים" },
      { key: "footer.contactUs", text: "צרי קשר", category: "footer", description: "כותרת צרי קשר" },
      { key: "footer.contactDescription", text: "לשאלות, תמיכה או כל דבר אחר.", category: "footer", description: "תיאור יצירת קשר" },
      { key: "footer.sendMessage", text: "לשליחת פנייה", category: "footer", description: "כפתור שליחת פנייה" },
      { key: "footer.copyright", text: "© 2024 Ludora. כל הזכויות שמורות.", category: "footer", description: "זכויות יוצרים" },

      // Forms
      { key: "form.fullName", text: "שם מלא", category: "forms", description: "לייבל שם מלא" },
      { key: "form.email", text: "אימייל", category: "forms", description: "לייבל אימייל" },
      { key: "form.phone", text: "מספר טלפון", category: "forms", description: "לייבל טלפון" },
      { key: "form.required", text: "שדה חובה", category: "forms", description: "סימון שדה חובה" },
      { key: "form.fullName.placeholder", text: "השם המלא שלך", category: "forms", description: "placeholder שם מלא" },
      { key: "form.email.placeholder", text: "your@email.com", category: "forms", description: "placeholder אימייל" },
      { key: "form.phone.placeholder", text: "050-1234567", category: "forms", description: "placeholder טלפון" }
    ];

    for (const textData of defaultTexts) {
      await SiteText.create(textData);
    }
  };

  const filterTexts = () => {
    let filtered = texts;

    if (searchTerm) {
      filtered = filtered.filter(text =>
        text.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        text.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        text.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(text => text.category === selectedCategory);
    }

    setFilteredTexts(filtered);
  };

  const handleSave = async () => {
    if (!formData.key.trim() || !formData.text.trim()) {
      setMessage({ type: 'error', text: 'מפתח וטקסט הם שדות חובה' });
      return;
    }

    try {
      if (editingText) {
        await SiteText.update(editingText.id, formData);
        setMessage({ type: 'success', text: 'הטקסט עודכן בהצלחה' });
      } else {
        await SiteText.create(formData);
        setMessage({ type: 'success', text: 'הטקסט נוסף בהצלחה' });
      }

      setShowForm(false);
      setEditingText(null);
      setFormData({ key: "", text: "", category: "general", description: "" });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה בשמירת הטקסט' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const handleEdit = (text) => {
    setEditingText(text);
    setFormData(text);
    setShowForm(true);
  };

  const handleDelete = async (textId) => {
    if (!confirm("האם למחוק את הטקסט?")) return;

    try {
      await SiteText.delete(textId);
      setMessage({ type: 'success', text: 'הטקסט נמחק בהצלחה' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה במחיקת הטקסט' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingText(null);
    setFormData({ key: "", text: "", category: "general", description: "" });
  };

  // Calculate counts for tabs
  const allCount = filteredTexts.length;
  const navigationCount = filteredTexts.filter(t => t.category === 'navigation').length;
  const homepageCount = filteredTexts.filter(t => t.category === 'homepage').length;
  const catalogCount = filteredTexts.filter(t => t.category === 'catalog').length;
  const explicitTabCategories = ['navigation', 'homepage', 'catalog'];
  const otherCount = filteredTexts.filter(t => !explicitTabCategories.includes(t.category)).length;

  // Helper function to render text cards
  const renderTextCards = (textsToRender) => {
    if (textsToRender.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">אין טקסטים בקטגוריה זו</h3>
          <p>נסו קטגוריה אחרת או הוסיפו טקסט חדש.</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {textsToRender.map((text) => (
          <Card key={text.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between space-y-3 sm:space-y-0">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">
                      {text.key}
                    </code>
                    <Badge variant="outline" className="text-xs self-start sm:self-auto">
                      {categories.find(c => c.value === text.category)?.label || text.category}
                    </Badge>
                  </div>
                  <div className="text-base font-medium mb-2 break-words">
                    {showKeys ? `{{${text.key}}}` : text.text}
                  </div>
                  {text.description && (
                    <p className="text-sm text-gray-600 break-words">{text.description}</p>
                  )}
                </div>
                <div className="flex gap-2 self-end sm:self-start">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(text)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(text.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (!isAdmin) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              אין לך הרשאות גישה לדף ניהול הטקסטים. רק מנהלים יכולים לגשת לאזור זה.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Mobile-first Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">טקסטים לאתר</h1>
            <p className="text-gray-500 text-sm">נהלי את כל הטקסטים המופיעים באתר</p>
          </div>

          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Mobile-responsive action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <Button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 sm:w-auto"
              >
                <Plus className="w-4 h-4 ml-2" />
                טקסט חדש
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowKeys(!showKeys)}
                className="sm:w-auto"
              >
                {showKeys ? <EyeOff className="w-4 h-4 ml-2" /> : <Eye className="w-4 h-4 ml-2" />}
                {showKeys ? 'הצג טקסטים' : 'הצג מפתחות'}
              </Button>
            </div>
          </div>

          {/* Mobile-responsive search and filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="חפש טקסט או מפתח..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="כל הקטגוריות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקטגוריות</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mobile-responsive tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-auto">
            <TabsTrigger value="all" className="text-xs sm:text-sm py-2">
              הכל ({allCount})
            </TabsTrigger>
            <TabsTrigger value="navigation" className="text-xs sm:text-sm py-2">ניווט ({navigationCount})</TabsTrigger>
            <TabsTrigger value="homepage" className="text-xs sm:text-sm py-2">דף הבית ({homepageCount})</TabsTrigger>
            <TabsTrigger value="catalog" className="text-xs sm:text-sm py-2">קטלוג ({catalogCount})</TabsTrigger>
            <TabsTrigger value="other" className="text-xs sm:text-sm py-2">אחר ({otherCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {renderTextCards(filteredTexts)}
          </TabsContent>

          <TabsContent value="navigation" className="space-y-4">
            {renderTextCards(filteredTexts.filter(t => t.category === 'navigation'))}
          </TabsContent>

          <TabsContent value="homepage" className="space-y-4">
            {renderTextCards(filteredTexts.filter(t => t.category === 'homepage'))}
          </TabsContent>

          <TabsContent value="catalog" className="space-y-4">
            {renderTextCards(filteredTexts.filter(t => t.category === 'catalog'))}
          </TabsContent>

          <TabsContent value="other" className="space-y-4">
            {renderTextCards(filteredTexts.filter(t => !explicitTabCategories.includes(t.category)))}
          </TabsContent>
        </Tabs>

        {/* Mobile-responsive form modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingText ? 'עריכת טקסט' : 'הוספת טקסט חדש'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="key">מפתח *</Label>
                    <Input
                      id="key"
                      value={formData.key}
                      onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                      placeholder="לדוגמה: home.title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="text">טקסט *</Label>
                    <Textarea
                      id="text"
                      value={formData.text}
                      onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                      placeholder="הטקסט שיופיע באתר"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">קטגוריה</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">תיאור</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="תיאור המפתח לעזרת המנהל"
                      rows={2}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
                    <Button variant="outline" onClick={handleCancel} className="sm:w-auto">
                      ביטול
                    </Button>
                    <Button onClick={handleSave} className="sm:w-auto">
                      <Save className="w-4 h-4 ml-2" />
                      {editingText ? 'עדכן' : 'שמור'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
