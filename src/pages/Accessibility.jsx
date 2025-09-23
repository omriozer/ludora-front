import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Keyboard, MousePointer, Volume2, Monitor, Users } from "lucide-react";
import { getProductTypeName } from "@/config/productTypes";

export default function Accessibility() {
  return (
    <div className="min-h-screen bg-gray-50 py-8" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">הצהרת נגישות</h1>
          <p className="text-lg text-gray-600">אנו מתחייבים לנגישות מלאה לכל המשתמשים</p>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                המחויבות שלנו לנגישות
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                לודורה מחויב לספק חוויית שימוש נגישה ושוויונית לכל המשתמשים, 
                כולל אנשים עם מוגבלויות. אנו פועלים בהתאם לתקן הישראלי ת"י 5568 
                ולהנחיות הנגישות הבינלאומיות WCAG 2.1 ברמה AA.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-green-600" />
                תכונות נגישות באתר
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Keyboard className="w-4 h-4" />
                    ניווט במקלדת
                  </h3>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                    <li>ניווט מלא באמצעות מקלדת בלבד</li>
                    <li>סדר לוגי של מעבר בין רכיבים</li>
                    <li>מקשי קיצור נגישים</li>
                    <li>הדגשה ברורה של האלמנט הפעיל</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    תצוגה וצבעים
                  </h3>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                    <li>ניגודיות גבוהה בין טקסט לרקע</li>
                    <li>גדלי פונט גמישים</li>
                    <li>מידע לא מועבר בצבע בלבד</li>
                    <li>תמיכה בזום עד 200%</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    תוכן אודיו וויזואלי
                  </h3>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                    <li>כתוביות לכל התכנים המוקלטים</li>
                    <li>תמלילים מלאים זמינים</li>
                    <li>בקרת עוצמת שמע</li>
                    <li>הפסקה אוטומטית של תוכן נע</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MousePointer className="w-4 h-4" />
                    אינטראקטיביות
                  </h3>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                    <li>כפתורים וקישורים בגודל מתאים</li>
                    <li>הודעות שגיאה ברורות</li>
                    <li>זמן מספיק לביצוע פעולות</li>
                    <li>אישורים לפעולות חשובות</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>תאימות לטכנולוגיות עזר</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">האתר תואם לטכנולוגיות העזר הבאות:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>קוראי מסך (NVDA, JAWS, VoiceOver)</li>
                <li>תוכנות הגדלת מסך</li>
                <li>ניווט קולי</li>
                <li>מקלדות וירטואליות</li>
                <li>טכנולוגיות מגע חלופיות</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>הגבלות ידועות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">אנו פועלים ללא הרף לשיפור הנגישות. הגבלות ידועות כרגע:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>חלק מהתכנים החיצוניים (כמו וידאו מפלטפורמות חיצוניות) עשויים להיות פחות נגישים</li>
                <li>תכונות חדשות עוברות בדיקת נגישות לפני פרסום</li>
              </ul>
              <p className="text-sm bg-blue-50 p-3 rounded-lg">
                אנו עובדים על פתרונות לכל ההגבלות הללו במסגרת התחזוקה השוטפת של האתר.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>משוב ויצירת קשר</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                המשוב שלך חשוב לנו! אם נתקלת בבעיות נגישות או יש לך הצעות לשיפור, 
                אנא צור/י איתנו קשר:
              </p>
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">דרכי יצירת קשר לנושאי נגישות:</h3>
                <ul className="text-gray-600 space-y-1">
                  <li>דרך טופס יצירת הקשר באתר</li>
                  <li>במייל הפניה שיסופק ב{getProductTypeName('workshop', 'plural')}</li>
                  <li>בטלפון המופיע בפרטי יצירת הקשר</li>
                </ul>
              </div>

              <p className="text-sm text-gray-500">
                אנו מתחייבים להגיב לפניות בנושא נגישות תוך 7 ימי עסקים.
              </p>

              <p className="text-sm text-gray-500 mt-4">
                <strong>עדכון אחרון של הצהרת הנגישות:</strong> {new Date().toLocaleDateString('he-IL')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}