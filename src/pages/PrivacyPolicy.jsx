
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, Lock, Database, Mail, UserCheck, RefreshCw, Settings, Play, BookOpen, GraduationCap, Users, Crown, Globe, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProductTypeName } from "@/config/productTypes";
import FeatureFlagService from "@/services/FeatureFlagService";
import { generatePrivacyContent } from "@/utils/legalContentGenerator.jsx";
import { useUser } from "@/contexts/UserContext";

// Define the site brand name from "brand settings"
const SITE_BRAND_NAME = "לומדים בקלות"; // Translates to "Learn Easily" or "Easy Learning"

export default function PrivacyPolicy() {
  const [enabledFeatures, setEnabledFeatures] = useState([]);
  const [dynamicSections, setDynamicSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser, isAdmin } = useUser();

  // Set the document title to include the site brand name
  useEffect(() => {
    document.title = `מדיניות פרטיות - ${SITE_BRAND_NAME}`;
  }, []);

  useEffect(() => {
    const loadFeatures = async () => {
      try {
        const features = isAdmin
          ? await FeatureFlagService.getAllFeaturesForAdmin()
          : await FeatureFlagService.getPublicFeatures();

        setEnabledFeatures(features);

        const sections = generatePrivacyContent(features);
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
      UserCheck, Settings, Play, BookOpen, GraduationCap, Users, Database, Eye, Lock, Shield, Mail
    };
    return iconMap[iconName] || UserCheck;
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
          <p className="text-gray-600 text-lg">טוען מדיניות פרטיות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">מדיניות פרטיות</h1>
          <p className="text-lg text-gray-600">אנו ב{SITE_BRAND_NAME} מתחייבים להגן על הפרטיות שלך ולשמור על המידע האישי שלך</p>

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
                <Database className="w-5 h-5 text-blue-600" />
                איזה מידע אנו אוספים
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">מידע אישי בסיסי:</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>שם מלא</li>
                  <li>כתובת דוא"ל</li>
                  <li>מספר טלפון (אופציונלי)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">מידע שימוש ורכישות:</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>פרטי המוצרים והשירותים שרכשת או השתמשת בהם</li>
                  <li>סטטוס תשלום והיסטוריית רכישות</li>
                  <li>תאריכי הרשמה והשתתפות</li>
                  {(enabledFeatures.some(f => f.key === 'workshops') || isAdmin) && (
                    <li>פרטי ה{getProductTypeName('workshop', 'plural')} שנרשמת אליהן</li>
                  )}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">מידע טכני:</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>כתובת IP (לצרכי אבטחה בלבד)</li>
                  <li>דפדפן וחותמת זמן של כניסה לאתר</li>
                  <li>פעילות באתר לשיפור השירות</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-green-600" />
                איך אנו משתמשים במידע
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>לספק לך גישה למוצרים ולשירותים הדיגיטליים</li>
                {(enabledFeatures.some(f => f.key === 'workshops') || isAdmin) && (
                  <li>לספק גישה ל{getProductTypeName('workshop', 'plural')} ולחומרי הלימוד</li>
                )}
                <li>לשלוח הודעות על רכישות, עדכונים ותזכורות</li>
                <li>לעבד תשלומים (באמצעות ספק חיצוני מוסמך)</li>
                <li>לשפר את איכות השירות וחוויית המשתמש</li>
                <li>לתמיכה טכנית ומענה לפניות</li>
                {(enabledFeatures.some(f => f.key === 'classrooms') || isAdmin) && (
                  <li>לאפשר למורים לנהל כיתות ולעקוב אחר התקדמות תלמידים</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-600" />
                הגנה על המידע
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  אנו נוקטים אמצעי אבטחה מתקדמים להגנה על המידע האישי שלך:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>הצפנת מידע רגיש (SSL/TLS)</li>
                  <li>גישה מוגבלת למידע רק לצוות מורשה</li>
                  <li>גיבויים קבועים ומאובטחים</li>
                  <li>מעקב אחר פעילות חשודה</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Google User Data Collection and Usage / שימוש במידע Google
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">English</h3>
                <div className="space-y-3 text-sm text-blue-800">
                  <div>
                    <strong>Data Accessed:</strong> When you sign in with Google, we access your email address and basic profile information (name and profile picture) through Firebase Authentication.
                  </div>
                  <div>
                    <strong>Data Usage:</strong> We use your Google account information to create and maintain your user account, provide authentication services, and personalize your experience on our educational platform.
                  </div>
                  <div>
                    <strong>Data Sharing:</strong> We do not sell, rent, or share your Google user data with advertising or marketing companies. Your Google data is only shared with our secure backend systems for authentication and account management purposes.
                  </div>
                  <div>
                    <strong>Data Storage & Protection:</strong> Your Google authentication data is securely stored using industry-standard encryption (SSL/TLS) and access is restricted to authorized personnel only.
                  </div>
                  <div>
                    <strong>Data Retention & Deletion:</strong> You can request deletion of your account and associated Google data at any time by contacting us. Upon account deletion, your Google authentication data is permanently removed from our systems.
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3">עברית</h3>
                <p className="text-gray-600 mb-2">
                  כאשר אתה נרשם דרך Google, אנו מקבלים גישה לכתובת הדוא"ל שלך ומידע פרופיל בסיסי (שם ותמונת פרופיל) דרך Firebase Authentication.
                </p>
                <p className="text-gray-600">
                  מידע זה משמש אותנו לצורך יצירת חשבון משתמש, אימות זהות ושיפור החוויה הלימודית שלך בפלטפורמה שלנו.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-orange-600" />
                שיתוף מידע עם צדדים שלישיים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  אנו משתפים מידע רק במקרים הבאים:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><strong>עיבוד תשלומים:</strong> ספק הסליקה (PayPlus) מקבל פרטים הכרחיים לעיבוד התשלום בלבד</li>
                  <li><strong>דרישה חוקית:</strong> במקרה של דרישה משפטית מהרשויות</li>
                  <li><strong>הסכמה מפורשת:</strong> רק במקרה שנתת הסכמה מפורשת מראש</li>
                  <li><strong>Google Authentication:</strong> Firebase/Google services for authentication and security purposes only</li>
                </ul>
                <p className="text-sm text-gray-500 bg-gray-100 p-3 rounded-lg">
                  <strong>חשוב לדעת:</strong> אנו לא מוכרים, משכירים או מעבירים את המידע האישי שלך לחברות פרסום או שיווק.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Product-Specific Privacy Sections */}
          {dynamicSections.map((section) => {
            const IconComponent = getIconComponent(section.icon);
            const feature = enabledFeatures.find(f => f.key === section.key);
            const visibilityBadge = feature ? getVisibilityBadge(feature.visibility, feature.enabled) : null;

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
                <Mail className="w-5 h-5 text-red-600" />
                זכויותיך
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">בהתאם לחוק הגנת הפרטיות, יש לך הזכויות הבאות:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>לדעת איזה מידע אנו שומרים עליך</li>
                  <li>לבקש תיקון מידע שגוי</li>
                  <li>לבקש מחיקת המידע שלך</li>
                  <li>להפסיק קבלת הודעות שיווקיות</li>
                  <li>לקבל עותק של המידע שלך</li>
                </ul>
                <div className="text-sm bg-blue-50 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p><strong>איך ליצור קשר:</strong> ניתן לפנות אלינו בכל עת לממש את זכויותיך או לכל שאלה נוספת על מדיניות הפרטיות.</p>
                  <Link to="/contact">
                    <Button size="sm">ליצירת קשר</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>עדכונים למדיניות</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                אנו עשויים לעדכן מדיניות זו מעת לעת. באחריות המשתמשים להתעדכן בשינויים. במקרה של שינויים מהותיים, נודיע לך באמצעות דוא"ל או הודעה בולטת באתר.
              </p>
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
