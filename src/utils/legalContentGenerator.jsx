import { getProductTypeName } from '@/config/productTypes';

export const generateTermsContent = (enabledFeatures) => {
  const sections = [];

  // Age restrictions section (always shown)
  sections.push({
    key: 'age_restrictions',
    title: 'הגבלות גיל ושימוש באתר',
    icon: 'UserCheck',
    content: (
      <div>
        <h3 className="font-semibold mb-2">מדיניות גיל:</h3>
        <ul className="list-disc list-inside text-gray-600 space-y-1">
          <li>השימוש באתר ובשירותיו מותר רק למשתמשים מעל גיל 18</li>
          <li>משתמשים הנרשמים ללא הזמנה מורה מצהירים שהם מעל גיל 18</li>
          <li>מורים יכולים להזמין תלמידים מתחת לגיל 18 רק לאחר קבלת הסכמת הורים</li>
          <li>תהליך ההסכמה: שליחת טופס לדוא"ל ההורים ← הסכמה דיגיטלית ← הוספה לכיתה</li>
        </ul>
        <div className="mt-3">
          <h3 className="font-semibold mb-2">אחריות המשתמש:</h3>
          <p className="text-gray-600">כל משתמש אחראי לוודא שהוא עומד בדרישות הגיל ובעל ההרשאות הנדרשות לשימוש באתר.</p>
        </div>
      </div>
    )
  });

  // Digital Assets section (consolidated for files, tools, games, courses, workshops)
  const digitalAssetTypes = enabledFeatures.filter(f =>
    ['files', 'tools', 'games', 'courses', 'workshops'].includes(f.key)
  );

  if (digitalAssetTypes.length > 0) {
    // Determine visibility for digital assets
    const digitalAssetsVisibility = digitalAssetTypes.some(f => f.visibility === 'public') ? 'public' :
                                   digitalAssetTypes.some(f => f.visibility === 'private') ? 'private' : 'admin';

    sections.push({
      key: 'digital_assets',
      title: 'תנאי שימוש בנכסים דיגיטליים',
      icon: 'FileText',
      visibility: digitalAssetsVisibility,
      content: (
        <div>
          <h3 className="font-semibold mb-2">זכויות שימוש:</h3>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>הנכסים הדיגיטליים מיועדים לשימוש אישי ולמטרות חינוכיות בלבד</li>
            <li>אסור להעביר, לשתף או להפיץ את הנכסים לאחרים</li>
            <li>מותר ליצור עותקים לשימוש חינוכי אישי בלבד</li>
            <li>אסור לבצע שינויים או עריכות בנכסים</li>
            <li>אסור להשתמש בנכסים למטרות מסחריות</li>
            <li>כל התכנים מוגנים בזכויות יוצרים</li>
          </ul>

          <div className="mt-3">
            <h3 className="font-semibold mb-2">הגבלות גישה ושימוש:</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>הנכסים הדיגיטליים עשויים להיות מוגבלים בזמן או במספר השימושים</li>
              <li>כל הגבלה תצוין בבירור בעמוד הרכישה</li>
              <li>הגישה נתונה לחשבון הרוכש בלבד</li>
              <li>אסור לשתף סיסמאות או קישורי גישה</li>
              <li>הנכסים ניתנים "כפי שהם" ללא אחריות לתוצאות</li>
            </ul>
          </div>

          {digitalAssetTypes.some(f => f.key === 'games') && (
            <div className="mt-3">
              <h3 className="font-semibold mb-2">תכונות חברתיות:</h3>
              <p className="text-gray-600">חלק מהמשחקים כוללים תכונות חברתיות כמו לוחות תוצאות ואפשרות שיתוף תוצאות.</p>
            </div>
          )}
        </div>
      )
    });
  }

  // Classrooms section
  const classroomFeature = enabledFeatures.find(f => f.key === 'classrooms');
  if (classroomFeature) {
    sections.push({
      key: 'classrooms',
      title: 'ניהול כיתות ותלמידים',
      icon: 'GraduationCap',
      visibility: classroomFeature.visibility || 'public',
      content: (
        <div>
          <h3 className="font-semibold mb-2">אחריות המורה:</h3>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>המורה אחראי לקבלת הסכמת הורים לפני הוספת תלמידים מתחת לגיל 18</li>
            <li>המורה אחראי לשמירה על פרטיות תלמידיו והשימוש הנאות במידע</li>
            <li>השימוש במערכת ניהול הכיתות מותר למטרות חינוכיות בלבד</li>
            <li>אסור להשתמש במידע התלמידים למטרות מסחריות או שיווקיות</li>
          </ul>
          <div className="mt-3">
            <h3 className="font-semibold mb-2">הגבלות שימוש:</h3>
            <p className="text-gray-600">המערכת מיועדת לשימוש חינוכי בלבד. המורה מתחייב לעמוד בכל הדרישות החוקיות הנוגעות להגנת הפרטיות של קטינים.</p>
          </div>
        </div>
      )
    });
  }

  // Subscriptions section (dynamic based on feature flag)
  // Check for subscription features - could be controlled by 'subscriptions' or 'account' or specific subscription flags
  const subscriptionFeatures = enabledFeatures.filter(f =>
    f.key === 'subscriptions' ||
    f.key === 'account' ||
    (f.key === 'classrooms' && f.enabled) // classrooms require subscription
  );

  const hasSubscriptions = subscriptionFeatures.length > 0;

  if (hasSubscriptions) {
    // Determine visibility for admin indicator
    const subscriptionVisibility = subscriptionFeatures.some(f => f.visibility === 'public') ? 'public' :
                                  subscriptionFeatures.some(f => f.visibility === 'private') ? 'private' : 'admin';

    sections.push({
      key: 'subscriptions',
      title: 'מנויים ותשלומים',
      icon: 'CreditCard',
      visibility: subscriptionVisibility,
      content: (
        <div>
          <h3 className="font-semibold mb-2">תוכניות מנוי:</h3>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>תוכניות המנוי מתעדכנות ונקבעות במסד הנתונים ועשויות להשתנות</li>
            <li>מנויים מתחדשים אוטומטית</li>
            <li>ביטול מנוי יכנס לתוקף בסוף תקופת החיוב הנוכחית</li>
            <li>במקרה של כשל בתשלום, החברה רשאית להוריד אוטומטית את המנוי לרמה החינמית</li>
          </ul>
          <div className="mt-3">
            <h3 className="font-semibold mb-2">ביטול מנוי:</h3>
            <p className="text-gray-600">ניתן לבטל מנוי בכל עת דרך הגדרות החשבון. הביטול יכנס לתוקף בסוף תקופת החיוב הנוכחית.</p>
          </div>
        </div>
      )
    });
  }

  return sections;
};

export const generatePrivacyContent = (enabledFeatures) => {
  const sections = [];

  // Age verification section (always shown)
  sections.push({
    key: 'age_verification',
    title: 'אימות גיל והסכמת הורים',
    icon: 'UserCheck',
    content: (
      <div>
        <h3 className="font-semibold mb-2">מדיניות גיל:</h3>
        <ul className="list-disc list-inside text-gray-600 space-y-1">
          <li>השימוש במערכת מותר רק למשתמשים מעל גיל 18</li>
          <li>משתמשים הנרשמים ללא הזמנה מורה מצהירים שהם מעל גיל 18</li>
          <li>מורים יכולים להזמין תלמידים מתחת לגיל 18 רק לאחר קבלת הסכמת הורים</li>
          <li>תהליך ההסכמה: שליחת טופס לדוא"ל ההורים ← הסכמה דיגיטלית ← הוספה לכיתה</li>
        </ul>
      </div>
    )
  });

  // Tools data collection
  const toolsFeature = enabledFeatures.find(f => f.key === 'tools');
  if (toolsFeature) {
    sections.push({
      key: 'tools_data',
      title: `איסוף מידע מ${getProductTypeName('tool', 'plural')}`,
      icon: 'Settings',
      visibility: toolsFeature.visibility || 'public',
      content: (
        <div>
          <h3 className="font-semibold mb-2">נתוני שימוש בכלים:</h3>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>תדירות השימוש בכלים שונים</li>
            <li>נתוני קלט שהמשתמש מזין (לשיפור הכלי)</li>
            <li>זמני שימוש ודפוסי פעילות</li>
            <li>נתונים אלה משמשים לשיפור השירות ופיתוח כלים חדשים</li>
          </ul>
        </div>
      )
    });
  }

  // Games data collection
  const gamesFeature = enabledFeatures.find(f => f.key === 'games');
  if (gamesFeature) {
    sections.push({
      key: 'games_data',
      title: `איסוף מידע מ${getProductTypeName('game', 'plural')}`,
      icon: 'Play',
      visibility: gamesFeature.visibility || 'public',
      content: (
        <div>
          <h3 className="font-semibold mb-2">נתוני משחק:</h3>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>ציונים והישגים במשחקים</li>
            <li>התקדמות ושיעורי השלמה</li>
            <li>זמני משחק ותדירות פעילות</li>
            <li>נתונים לשיתוף חברתי (לוחות תוצאות)</li>
          </ul>
        </div>
      )
    });
  }

  // Courses progress tracking
  const coursesFeature = enabledFeatures.find(f => f.key === 'courses');
  if (coursesFeature) {
    sections.push({
      key: 'courses_data',
      title: `מעקב התקדמות ב${getProductTypeName('course', 'plural')}`,
      icon: 'BookOpen',
      visibility: coursesFeature.visibility || 'public',
      content: (
        <div>
          <h3 className="font-semibold mb-2">נתוני למידה:</h3>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>זמן בילוי בכל מודול</li>
            <li>מודולים שהושלמו ותאריכי השלמה</li>
            <li>ציונים במבחנים ותרגילים (אם קיימים)</li>
            <li>דפוסי למידה לשיפור התוכן</li>
          </ul>
        </div>
      )
    });
  }

  // Classroom data handling
  const classroomDataFeature = enabledFeatures.find(f => f.key === 'classrooms');
  if (classroomDataFeature) {
    sections.push({
      key: 'classroom_data',
      title: 'טיפול בנתוני כיתות ותלמידים',
      icon: 'GraduationCap',
      visibility: classroomDataFeature.visibility || 'public',
      content: (
        <div>
          <h3 className="font-semibold mb-2">נתוני תלמידים:</h3>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>שמות מלאים ופרטי יצירת קשר</li>
            <li>נתוני התקדמות ופעילות בפלטפורמה</li>
            <li>ציונים ומשובים מהמורים</li>
            <li>תקשורת בין מורים לתלמידים</li>
          </ul>
          <div className="mt-3">
            <h3 className="font-semibold mb-2">הגנה על פרטיות קטינים:</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>טפסי הסכמת הורים נשמרים דיגיטלית במערכת</li>
              <li>מורים רואים רק חלק מנתוני התלמידים - לא הכל</li>
              <li>נתוני קטינים מוגנים בהתאם לחוקי הגנת הפרטיות</li>
            </ul>
          </div>
        </div>
      )
    });
  }

  // Content creator analytics
  const contentCreatorsFeature = enabledFeatures.find(f => f.key === 'content_creators');
  if (contentCreatorsFeature) {
    sections.push({
      key: 'creator_data',
      title: 'נתוני יוצרי תוכן',
      icon: 'Users',
      visibility: contentCreatorsFeature.visibility || 'public',
      content: (
        <div>
          <h3 className="font-semibold mb-2">אנליטיקה ותשלומים:</h3>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>סטטיסטיקות צפיות ושימוש בתוכן</li>
            <li>נתוני רווחים וחלוקת תמלוגים</li>
            <li>פרטי תשלום ומידע בנקאי (מוצפן ומאובטח)</li>
            <li>משובים ודירוגים מהמשתמשים</li>
          </ul>
        </div>
      )
    });
  }

  return sections;
};