
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CreditCard, RefreshCw, AlertTriangle, Scale, Phone, Settings, Play, BookOpen, GraduationCap, Users, Crown, Shield, Globe, EyeOff, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProductTypeName } from "@/config/productTypes";
import FeatureFlagService from "@/services/FeatureFlagService";
import { generateTermsContent } from "@/utils/legalContentGenerator.jsx";
import { useUser } from "@/contexts/UserContext";

export default function TermsOfService() {
  const [enabledFeatures, setEnabledFeatures] = useState([]);
  const [dynamicSections, setDynamicSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useUser();

  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'sysadmin');

  useEffect(() => {
    const loadFeatures = async () => {
      try {
        const features = isAdmin
          ? await FeatureFlagService.getAllFeaturesForAdmin()
          : await FeatureFlagService.getPublicFeatures();

        setEnabledFeatures(features);

        const sections = generateTermsContent(features);
        setDynamicSections(sections);
      } catch (error) {
        console.error('Error loading features:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeatures();
  }, [isAdmin]);

  const getIconComponent = (iconName) => {
    const iconMap = {
      FileText, Settings, Play, BookOpen, GraduationCap, Users, CreditCard, UserCheck
    };
    return iconMap[iconName] || FileText;
  };

  const getVisibilityBadge = (visibility, enabled) => {
    if (!isAdmin) return null;

    if (!enabled) {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-300 text-xs">
          <EyeOff className="w-3 h-3 mr-1" />
          מבוטל
        </Badge>
      );
    }

    switch (visibility) {
      case 'public':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
            <Globe className="w-3 h-3 mr-1" />
            גלוי לכולם
          </Badge>
        );
      case 'admin_only':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
            <Crown className="w-3 h-3 mr-1" />
            מנהלים בלבד
          </Badge>
        );
      case 'admins_and_creators':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
            <Shield className="w-3 h-3 mr-1" />
            מנהלים ויוצרי תוכן
          </Badge>
        );
      case 'hidden':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
            <EyeOff className="w-3 h-3 mr-1" />
            מוסתר
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">טוען תנאי שימוש...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">תנאי השימוש</h1>
          <p className="text-lg text-gray-600">תנאים וכללים לשימוש באתר ובשירותים הדיגיטליים</p>

          {isAdmin && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">תצוגת מנהל</h3>
              </div>
              <p className="text-sm text-blue-800">
                אתה רואה את כל הסעיפים ללא קשר להגדרות התצוגה. סעיפים עם תגיות צבעוניות מציינים את רמת הנגישות של הסעיף למשתמשים רגילים.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                כללי
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                השימוש באתר זה ובשירותיו מהווה הסכמה מלאה לתנאים המפורטים להלן. 
                אנא קרא/י בעיון לפני הרשמה או רכישה.
              </p>
              <p className="text-gray-600">
                האתר מופעל על ידי גל עוזר (עוסק פטור 305700304) ומספק שירותים דיגיטליים למורים ותלמידים.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-600" />
                תשלומים והרשמה
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">תנאי תשלום:</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>התשלום נדרש במלואו בעת רכישת מוצר</li>
                  <li>התשלום מעובד באמצעות ספק סליקה חיצוני מוסמך (PayPlus) בשיטת תשלום מאובטחת</li>
                  <li>מחירי המוצרים והמנויים כפופים לשינויים ללא הודעה מוקדמת</li>
                  <li>גישה למוצר בתשלום תינתן רק לאחר אישור התשלום</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">אישור רכישה:</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>לאחר השלמת התשלום יתקבל אישור רכישה בדוא"ל</li>
                  {(enabledFeatures.some(f => f.key === 'workshops') || isAdmin) && (
                    <>
                      <li className="flex items-center gap-2">
                        במקרה של {getProductTypeName('workshop', 'singular')} "חיה" - יתקבל קישור זום עד שעה לפני תחילת ה{getProductTypeName('workshop', 'singular')}
                        {isAdmin && getVisibilityBadge(enabledFeatures.find(f => f.key === 'workshops')?.visibility, enabledFeatures.find(f => f.key === 'workshops')?.enabled)}
                      </li>
                      <li className="flex items-center gap-2">
                        גישה להקלטה לרוכשים {getProductTypeName('workshop', 'singular')} תינתן לא יאוחר מ-48 שעות לאחר סיום ה{getProductTypeName('workshop', 'singular')} במידה וה{getProductTypeName('workshop', 'singular')} כוללת הקלטה
                        {isAdmin && getVisibilityBadge(enabledFeatures.find(f => f.key === 'workshops')?.visibility, enabledFeatures.find(f => f.key === 'workshops')?.enabled)}
                      </li>
                    </>
                  )}
                  <li>גישה למוצרים דיגיטליים תינתן מיד לאחר אישור התשלום</li>
                  <li>במקרים מיוחדים, ניתן לפנות אלינו לבקשת החזר - ההחלטה נתונה לדעת החברה</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-orange-600" />
                מדיניות ביטול והחזרים
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">ביטול עסקה בהתאם לחוק הגנת הצרכן:</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>ניתן לבטל עסקה לרכישת שירות בתוך 14 ימים מיום ביצוע העסקה, ובלבד שהביטול ייעשה לפחות 2 ימי עסקים קודם למועד תחילת השירות.</li>
                  {(enabledFeatures.some(f => f.key === 'workshops') || isAdmin) && (
                    <>
                      <li className="flex items-center gap-2">
                        <span><strong>{getProductTypeName('workshop', 'plural')} חיות (אונליין):</strong> ניתן לבטל ולקבל החזר כספי מלא (בניכוי עמלת סליקה של 5% או 100 ש"ח, הנמוך מבניהם) עד 5 ימי עסקים לפני מועד ה{getProductTypeName('workshop', 'singular')}. לאחר מכן, לא יינתן החזר.</span>
                        {isAdmin && getVisibilityBadge(enabledFeatures.find(f => f.key === 'workshops')?.visibility, enabledFeatures.find(f => f.key === 'workshops')?.enabled)}
                      </li>
                      <li className="flex items-center gap-2">
                        <span><strong>{getProductTypeName('workshop', 'plural')} מוקלטות:</strong> בהתאם לחוק, מוצר דיגיטלי הניתן לשכפול או העתקה (כמו הקלטה) אינו ניתן לביטול לאחר קבלת הגישה אליו, אלא אם נמצא פגם במוצר. לא יינתן החזר כספי לאחר קבלת גישה להקלטה.</span>
                        {isAdmin && getVisibilityBadge(enabledFeatures.find(f => f.key === 'workshops')?.visibility, enabledFeatures.find(f => f.key === 'workshops')?.enabled)}
                      </li>
                    </>
                  )}
                  <li><strong>מוצרים דיגיטליים:</strong> לא יינתן החזר כספי לאחר קבלת הגישה לנכס דיגיטלי, אלא אם נמצא פגם במוצר.</li>
                </ul>
              </div>
              
              {(enabledFeatures.some(f => f.key === 'workshops') || isAdmin) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">ביטול על ידי מספק השירות:</h3>
                    {isAdmin && getVisibilityBadge(enabledFeatures.find(f => f.key === 'workshops')?.visibility, enabledFeatures.find(f => f.key === 'workshops')?.enabled)}
                  </div>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>מספק השירות שומר לעצמו את הזכות לבטל או לדחות {getProductTypeName('workshop', 'singular')} מכל סיבה שהיא.</li>
                    <li>במקרה של ביטול, המשתתפים יהיו זכאים להחזר כספי מלא. הצעה למועד חלופי או זיכוי לשירות אחר תהיה בנוסף לזכות זו, ולא במקומה.</li>
                  </ul>
                </div>
              )}

              <p className="text-sm bg-yellow-50 p-3 rounded-lg">
                <strong>חשוב:</strong> בקשות החזר יטופלו עד 14 ימי עסקים ויוחזרו לאמצעי התשלום המקורי, במידת האפשר.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                זכויות יוצרים ושימוש בתכנים
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">זכויות יוצרים:</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>כל התכנים מוגנים בזכויות יוצרים</li>
                  <li>השימוש מותר לצרכים אישיים בלבד</li>
                  <li>אסור להעתיק, להפיץ או למכור את התכנים</li>
                  {(enabledFeatures.some(f => f.key === 'workshops') || isAdmin) && (
                    <li className="flex items-center gap-2">
                      אסור להקליט או לצלם במהלך {getProductTypeName('workshop', 'plural')} חיות
                      {isAdmin && getVisibilityBadge(enabledFeatures.find(f => f.key === 'workshops')?.visibility, enabledFeatures.find(f => f.key === 'workshops')?.enabled)}
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">גישה לתכנים:</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>גישה נתונה לחשבון הרוכש בלבד</li>
                  <li>אסור לשתף סיסמאות או קישורי גישה</li>
                  {(enabledFeatures.some(f => f.key === 'workshops') || isAdmin) && (
                    <li className="flex items-center gap-2">
                      גישה להקלטות מוגבלת בזמן (כמצוין בפרטי ה{getProductTypeName('workshop', 'singular')})
                      {isAdmin && getVisibilityBadge(enabledFeatures.find(f => f.key === 'workshops')?.visibility, enabledFeatures.find(f => f.key === 'workshops')?.enabled)}
                    </li>
                  )}
                  <li>הגישה עשויה להיות מוגבלת בזמן בהתאם לסוג המוצר</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Product-Specific Terms */}
          {dynamicSections.map((section) => {
            const IconComponent = getIconComponent(section.icon);
            const visibilityBadge = isAdmin && section.visibility ? getVisibilityBadge(section.visibility, true) : null;

            return (
              <Card key={section.key} className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconComponent className="w-5 h-5 text-blue-600" />
                      {section.title}
                    </div>
                    {visibilityBadge}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {section.content}
                </CardContent>
              </Card>
            );
          })}

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-purple-600" />
                הגבלת אחריות
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                השירותים והתכנים באתר ניתנים "כפי שהם" (As Is). השימוש באתר ובתכניו הוא על אחריות המשתמש/ת בלבד.
              </p>
              <p className="text-sm bg-red-50 p-3 rounded-lg">
                <strong>הגבלת אחריות:</strong> בשום מקרה, אחריותה הכוללת של החברה, בין אם בחוזה, בנזיקין או בכל דרך אחרת, לא תעלה על הסכום ששולם על ידי המשתמש/ת עבור המוצר או השירות הספציפי שהוביל לתביעה. החברה לא תישא באחריות לכל נזק עקיף, תוצאתי, מיוחד או מקרי.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-teal-600" />
                יצירת קשר ופתרון מחלוקות
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-600">
                  לכל שאלה, בעיה או בקשה, ניתן ליצור איתנו קשר.
                </p>
                <Link to="/contact">
                    <Button>לשליחת פנייה</Button>
                </Link>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">פתרון מחלוקות:</h3>
                <p className="text-gray-600">
                  נעשה מאמץ לפתור כל מחלוקת בדרך של דיאלוג. במקרה של חילוקי דעות, 
                  הסמכות השיפוטית תהיה של בתי המשפט המוסמכים במחוז תל אביב, ישראל.
                </p>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                <strong>עדכון אחרון:</strong> {new Date().toLocaleDateString('he-IL')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
