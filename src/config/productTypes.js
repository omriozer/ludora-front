/**
 * Centralized Product Types Configuration
 *
 * This is the ONLY file in the application that should contain
 * hardcoded Hebrew product type names and text variations.
 *
 * All other components should import and use names from this file.
 */

import { Calendar, BookOpen, FileText, Play, Star } from "lucide-react";

// Product Types Configuration with Catalog Settings
export const PRODUCT_TYPES = {
  workshop: {
    key: 'workshop',
    url: '/workshops',
    singular: 'הדרכה',
    plural: 'הדרכות',
    navText: 'הדרכות',
    description: 'הדרכות אונליין חיות או מוקלטות',
    icon: Calendar,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    gradient: "from-blue-500 via-indigo-500 to-purple-600",
    fallbackImageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=250&fit=crop&q=60",
    catalog: {
      title: 'קטלוג הדרכות',
      subtitle: 'הדרכות אונליין ומוקלטות לבחירתך במגוון תחומים',
      searchPlaceholder: 'חפשי הדרכה...',
      emptyStateTitle: 'אין הדרכות קרובות',
      emptyStateSubtitle: 'הדרכות חדשות יפורסמו בקרוב',
      loadingMessage: 'טוען הדרכות...',
      filters: ['search', 'category', 'publishStatus'],
      cardLayout: 'detailed',
      showTabs: true,
      tabs: [
        { key: 'upcoming', label: 'הדרכות אונליין', icon: 'Calendar' },
        { key: 'past', label: 'הדרכות מוקלטות', icon: 'Video' }
      ],
      actions: {
        primary: 'הירשמו עכשיו',
        secondary: 'צפייה בפרטים',
        owned: 'צפייה בהקלטה'
      }
    }
  },
  course: {
    key: 'course',
    url: '/courses',
    singular: 'קורס',
    plural: 'קורסים',
    navText: 'קורסים',
    description: 'קורסים עם מודולים מרובים',
    icon: BookOpen,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    gradient: "from-orange-400 via-red-500 to-pink-600",
    fallbackImageUrl: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=250&fit=crop&q=60",
    catalog: {
      title: 'קטלוג קורסים',
      subtitle: 'קורסים מקוונים עם מודולים מרובים ולמידה מתקדמת',
      searchPlaceholder: 'חפש קורסים...',
      emptyStateTitle: 'לא נמצאו קורסים',
      emptyStateSubtitle: 'נסה לשנות את הפילטרים או החיפוש',
      loadingMessage: 'טוען קורסים...',
      filters: ['search', 'category', 'skillLevel'],
      cardLayout: 'detailed',
      showTabs: false,
      actions: {
        primary: 'התחל קורס',
        secondary: 'פרטים נוספים',
        owned: 'המשך קורס'
      }
    }
  },
  file: {
    key: 'file',
    url: '/files',
    singular: 'קובץ',
    plural: 'קבצים',
    navText: 'קבצים',
    description: 'קבצים דיגיטליים',
    icon: FileText,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    gradient: "from-emerald-400 via-teal-500 to-cyan-600",
    fallbackImageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=250&fit=crop&q=60",
    catalog: {
      title: 'קבצים',
      subtitle: 'כלים דיגיטליים, תבניות ומשאבים מוכנים להורדה שיעזרו לכם ליצור חוויות למידה מהנות',
      searchPlaceholder: 'חפש קבצים...',
      emptyStateTitle: 'לא נמצאו קבצים',
      emptyStateSubtitle: 'נסה לשנות את הסינון או החיפוש',
      loadingMessage: 'טוען קבצים...',
      filters: ['search', 'category', 'grade', 'subject', 'audience', 'sort'],
      cardLayout: 'detailed',
      showTabs: false,
      actions: {
        primary: 'הורדה',
        secondary: 'פרטים נוספים',
        owned: 'גישה לקובץ'
      }
    }
  },
  tool: {
    key: 'tool',
    url: '/tools',
    singular: 'כלי',
    plural: 'כלים',
    navText: 'כלים',
    description: 'כלים דיגיטליים',
    icon: FileText,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    gradient: "from-emerald-400 via-teal-500 to-cyan-600",
    fallbackImageUrl: "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=400&h=250&fit=crop&q=60",
    catalog: {
      title: 'כלים דיגיטליים',
      subtitle: 'כלים ויישומונים דיגיטליים לשיפור חוויית הלמידה',
      searchPlaceholder: 'חפש כלים...',
      emptyStateTitle: 'לא נמצאו כלים',
      emptyStateSubtitle: 'נסה לשנות את הפילטרים או החיפוש',
      loadingMessage: 'טוען כלים...',
      filters: ['search', 'category', 'sort'],
      cardLayout: 'detailed',
      showTabs: false,
      actions: {
        primary: 'השתמש בכלי',
        secondary: 'פרטים נוספים',
        owned: 'פתח כלי'
      }
    }
  },
  game: {
    key: 'game',
    url: '/games',
    singular: 'משחק',
    plural: 'משחקים',
    navText: 'משחקים',
    description: 'משחקים חינוכיים',
    icon: Play,
    color: 'from-pink-500 to-red-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    gradient: "from-purple-500 via-pink-500 to-red-500",
    fallbackImageUrl: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&h=250&fit=crop&q=60",
    catalog: {
      title: 'קטלוג המשחקים',
      subtitle: 'משחקים חינוכיים אינטראקטיביים לכל הגילאים',
      searchPlaceholder: 'חפש משחקים...',
      emptyStateTitle: 'לא נמצאו משחקים',
      emptyStateSubtitle: 'נסה לשנות את הפילטרים או חפש משחקים אחרים',
      loadingMessage: 'טוען משחקים...',
      filters: ['search', 'subject', 'gameType', 'price'],
      cardLayout: 'compact',
      showTabs: false,
      showAnalytics: true,
      actions: {
        primary: 'שחק עכשיו',
        secondary: 'פרטים נוספים',
        owned: 'שחק שוב'
      }
    }
  },
  lesson_plan: {
    key: 'lesson_plan',
    url: '/lesson-plans',
    singular: 'מערך שיעור',
    plural: 'מערכי שיעור',
    navText: 'מערכי שיעור',
    description: 'מערכי שיעור מוכנים עם מצגות ונכסים',
    icon: BookOpen,
    color: 'from-indigo-500 to-blue-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    gradient: "from-indigo-400 via-blue-500 to-cyan-600",
    fallbackImageUrl: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&h=250&fit=crop&q=60",
    catalog: {
      title: 'קטלוג מערכי שיעור',
      subtitle: 'מערכי שיעור מוכנים עם מצגות, אודיו ונכסים לחוויית הוראה שלמה',
      searchPlaceholder: 'חפש מערכי שיעור...',
      emptyStateTitle: 'לא נמצאו מערכי שיעור',
      emptyStateSubtitle: 'נסה לשנות את הפילטרים או חפש מערכי שיעור אחרים',
      loadingMessage: 'טוען מערכי שיעור...',
      filters: ['search', 'context', 'subject', 'grade', 'price'],
      cardLayout: 'detailed',
      showTabs: false,
      actions: {
        primary: 'רכישה',
        secondary: 'פרטים נוספים',
        owned: 'הצגת שיעור'
      }
    }
  }
};

// Navigation Items Configuration
export const NAV_ITEMS = {
  files: {
    key: 'files',
    text: 'קבצים',
    defaultIcon: 'FileText',
    description: 'קבצים דיגיטליים להדפסה',
    gradient: "from-emerald-400 via-teal-500 to-cyan-600",
    portal: 'teacher'
  },
  tools: {
    key: 'tools',
    text: 'כלים',
    defaultIcon: 'Settings',
    description: 'כלים דיגיטליים ויישומונים',
    gradient: "from-slate-400 via-gray-500 to-zinc-600",
    portal: 'teacher'
  },
  games: {
    key: 'games',
    text: 'משחקים',
    defaultIcon: 'Play',
    description: 'משחקים חינוכיים',
    gradient: "from-purple-500 via-pink-500 to-red-500",
    portal: 'teacher'
  },
  workshops: {
    key: 'workshops',
    text: 'הדרכות',
    defaultIcon: 'Calendar',
    description: 'הדרכות וסדנאות',
    gradient: "from-blue-500 via-indigo-500 to-purple-600",
    portal: 'teacher'
  },
  courses: {
    key: 'courses',
    text: 'קורסים',
    defaultIcon: 'BookOpen',
    description: 'קורסים מקוונים',
    gradient: "from-orange-400 via-red-500 to-pink-600",
    portal: 'teacher'
  },
  classrooms: {
    key: 'classrooms',
    url: '/classrooms',
    text: 'הכיתות שלי',
    defaultIcon: 'GraduationCap',
    description: 'ניהול כיתות ותלמידים',
    requiresSubscription: true,
    gradient: "from-teal-400 via-cyan-500 to-blue-600",
    portal: 'teacher'
  },
  account: {
    key: 'account',
    url: '/account',
    text: 'החשבון שלי',
    defaultIcon: 'UserIcon',
    description: 'ניהול חשבון משתמש',
    gradient: "from-gray-500 via-slate-500 to-gray-600",
    portal: 'both'
  },
  content_creators: {
    key: 'content_creators',
    url: '/content-creators',
    text: 'יוצרי תוכן',
    defaultIcon: 'Users',
    description: 'פורטל יוצרי תוכן',
    specialVisibility: true,
    gradient: "from-indigo-500 via-purple-500 to-pink-600",
    portal: 'teacher'
  },
  curriculum: {
    key: 'curriculum',
    url: '/curriculum',
    text: 'תכניות לימודים',
    defaultIcon: 'BookOpen',
    description: 'ניהול תכניות לימודים לפי מקצועות וכיתות',
    gradient: "from-blue-500 via-indigo-500 to-purple-600",
    portal: 'teacher'
  },
  lesson_plans: {
    key: 'lesson_plans',
    url: '/lesson-plans',
    text: 'מערכי שיעור',
    defaultIcon: 'BookOpen',
    description: 'מערכי שיעור מוכנים עם מצגות ונכסים',
    gradient: "from-indigo-400 via-blue-500 to-cyan-600",
    portal: 'teacher'
  },
  // Student-specific navigation items
  student_games: {
    key: 'student_games',
    text: 'משחקים מהנים',
    defaultIcon: 'Play',
    description: 'משחקים חינוכיים מהנים ופשוטים',
    gradient: "from-purple-500 via-pink-500 to-red-500",
    portal: 'student',
    url: '/student/games'
  },
  student_activities: {
    key: 'student_activities',
    text: 'פעילויות',
    defaultIcon: 'Star',
    description: 'פעילויות למידה אינטראקטיביות',
    gradient: "from-yellow-400 via-orange-500 to-red-500",
    portal: 'student',
    url: '/student/activities'
  },
  student_materials: {
    key: 'student_materials',
    text: 'חומרי לימוד',
    defaultIcon: 'BookOpen',
    description: 'חומרי לימוד ומשאבים',
    gradient: "from-emerald-400 via-teal-500 to-cyan-600",
    portal: 'student',
    url: '/student/materials'
  },
  student_profile: {
    key: 'student_profile',
    text: 'הפרופיל שלי',
    defaultIcon: 'UserIcon',
    description: 'הפרופיל האישי שלי',
    gradient: "from-blue-400 via-purple-500 to-pink-600",
    portal: 'student',
    url: '/student/profile'
  }
};

// Portal filtering utility functions
export const getNavItemsForPortal = (portalType) => {
  return Object.keys(NAV_ITEMS).filter(key => {
    const navItem = NAV_ITEMS[key];
    return navItem.portal === portalType || navItem.portal === 'both';
  });
};

export const filterNavItemsByPortal = (navItems, portalType) => {
  return navItems.filter(itemKey => {
    const navItemConfig = getNavItemConfig(itemKey);
    if (!navItemConfig) return false;
    return navItemConfig.portal === portalType || navItemConfig.portal === 'both';
  });
};

// Utility functions
export const getProductTypeName = (key, form = 'singular') => {
  const productType = PRODUCT_TYPES[key];
  if (!productType) return key;
  return productType[form] || productType.singular;
};

export const getNavItemText = (key) => {
  const navItem = NAV_ITEMS[key];
  if (!navItem) return key;
  return navItem.text;
};

export const getProductTypeConfig = (key) => {
  return PRODUCT_TYPES[key] || null;
};

export const getNavItemConfig = (key) => {
  return NAV_ITEMS[key] || null;
};

// Helper function to get URL for a product type
// Usage: getProductTypeUrl('game') or directly PRODUCT_TYPES.game.url
export const getProductTypeUrl = (key) => {
  const productType = PRODUCT_TYPES[key];
  return productType ? productType.url : null;
};

// Helper function to get catalog configuration for a product type
export const getCatalogConfig = (key) => {
  const productType = PRODUCT_TYPES[key];
  return productType ? productType.catalog : null;
};

// Helper function to detect product type from URL path
export const getProductTypeFromPath = (pathname) => {
  // Remove leading slash and get the first segment
  const path = pathname.replace(/^\//, '').split('/')[0];

  // Find product type by URL
  for (const [key, config] of Object.entries(PRODUCT_TYPES)) {
    if (config.url === `/${path}`) {
      return key;
    }
  }

  return null;
};

// Type-specific attribute schemas
export const TYPE_ATTRIBUTE_SCHEMAS = {
  file: {
    grade_min: {
      type: 'select',
      label: 'כיתה מינימלית',
      description: 'הכיתה הנמוכה ביותר המתאימה לקובץ',
      placeholder: 'בחר כיתה מינימלית',
      options: [
        { value: 1, label: 'כיתה א' },
        { value: 2, label: 'כיתה ב' },
        { value: 3, label: 'כיתה ג' },
        { value: 4, label: 'כיתה ד' },
        { value: 5, label: 'כיתה ה' },
        { value: 6, label: 'כיתה ו' },
        { value: 7, label: 'כיתה ז' },
        { value: 8, label: 'כיתה ח' },
        { value: 9, label: 'כיתה ט' },
        { value: 10, label: 'כיתה י' },
        { value: 11, label: 'כיתה יא' },
        { value: 12, label: 'כיתה יב' }
      ],
      validate: (value, allAttributes) => {
        if (!value) return true; // Optional field
        const gradeMax = allAttributes.grade_max;
        if (gradeMax && value >= gradeMax) {
          return 'הכיתה המינימלית חייבת להיות נמוכה מהכיתה המקסימלית';
        }
        return true;
      }
    },
    grade_max: {
      type: 'select',
      label: 'כיתה מקסימלית',
      description: 'הכיתה הגבוהה ביותר המתאימה לקובץ',
      placeholder: 'בחר כיתה מקסימלית',
      options: [
        { value: 1, label: 'כיתה א' },
        { value: 2, label: 'כיתה ב' },
        { value: 3, label: 'כיתה ג' },
        { value: 4, label: 'כיתה ד' },
        { value: 5, label: 'כיתה ה' },
        { value: 6, label: 'כיתה ו' },
        { value: 7, label: 'כיתה ז' },
        { value: 8, label: 'כיתה ח' },
        { value: 9, label: 'כיתה ט' },
        { value: 10, label: 'כיתה י' },
        { value: 11, label: 'כיתה יא' },
        { value: 12, label: 'כיתה יב' }
      ],
      validate: (value, allAttributes) => {
        if (!value) return true; // Optional field
        const gradeMin = allAttributes.grade_min;
        if (gradeMin && value <= gradeMin) {
          return 'הכיתה המקסימלית חייבת להיות גבוהה מהכיתה המינימלית';
        }
        return true;
      }
    },
    subject: {
      type: 'select',
      label: 'מקצוע',
      description: 'המקצוע הרלוונטי לקובץ',
      placeholder: 'בחר מקצוע (אופציונלי)',
      nullable: true,
      options: [] // This will be populated dynamically from settings
    }
  },
  workshop: {
    duration_minutes: {
      type: 'number',
      min: 15,
      max: 480,
      label: 'משך בדקות',
      description: 'משך ההדרכה בדקות',
      placeholder: 'למשל: 90'
    },
    max_participants: {
      type: 'number',
      min: 1,
      max: 1000,
      label: 'מספר משתתפים מקסימלי',
      description: 'מספר המשתתפים המקסימלי בהדרכה',
      placeholder: 'למשל: 30'
    },
    workshop_type: {
      type: 'select',
      label: 'סוג הדרכה',
      description: 'האם ההדרכה חיה או מוקלטת',
      placeholder: 'בחר סוג הדרכה',
      options: [
        { value: 'live', label: 'הדרכה חיה' },
        { value: 'recorded', label: 'הדרכה מוקלטת' },
        { value: 'hybrid', label: 'משולב' }
      ]
    }
  },
  course: {
    estimated_hours: {
      type: 'number',
      min: 0.5,
      max: 200,
      step: 0.5,
      label: 'שעות לימוד משוערות',
      description: 'מספר שעות הלימוד המשוער להשלמת הקורס',
      placeholder: 'למשל: 12.5'
    },
    modules_count: {
      type: 'number',
      min: 1,
      max: 50,
      label: 'מספר מודולים',
      description: 'מספר המודולים בקורס',
      placeholder: 'למשל: 8'
    },
    skill_level: {
      type: 'select',
      label: 'רמת מיומנות',
      description: 'רמת המיומנות הנדרשת לקורס',
      placeholder: 'בחר רמת מיומנות',
      options: [
        { value: 'beginner', label: 'מתחילים' },
        { value: 'intermediate', label: 'בינוני' },
        { value: 'advanced', label: 'מתקדמים' }
      ]
    }
  },
  game: {
    grade_min: {
      type: 'select',
      label: 'כיתה מינימלית',
      description: 'הכיתה הנמוכה ביותר המתאימה למשחק',
      placeholder: 'בחר כיתה מינימלית',
      options: [
        { value: 1, label: 'כיתה א' },
        { value: 2, label: 'כיתה ב' },
        { value: 3, label: 'כיתה ג' },
        { value: 4, label: 'כיתה ד' },
        { value: 5, label: 'כיתה ה' },
        { value: 6, label: 'כיתה ו' },
        { value: 7, label: 'כיתה ז' },
        { value: 8, label: 'כיתה ח' },
        { value: 9, label: 'כיתה ט' },
        { value: 10, label: 'כיתה י' },
        { value: 11, label: 'כיתה יא' },
        { value: 12, label: 'כיתה יב' }
      ],
      validate: (value, allAttributes) => {
        if (!value) return true; // Optional field
        const gradeMax = allAttributes.grade_max;
        if (gradeMax && value >= gradeMax) {
          return 'הכיתה המינימלית חייבת להיות נמוכה מהכיתה המקסימלית';
        }
        return true;
      }
    },
    grade_max: {
      type: 'select',
      label: 'כיתה מקסימלית',
      description: 'הכיתה הגבוהה ביותר המתאימה למשחק',
      placeholder: 'בחר כיתה מקסימלית',
      options: [
        { value: 1, label: 'כיתה א' },
        { value: 2, label: 'כיתה ב' },
        { value: 3, label: 'כיתה ג' },
        { value: 4, label: 'כיתה ד' },
        { value: 5, label: 'כיתה ה' },
        { value: 6, label: 'כיתה ו' },
        { value: 7, label: 'כיתה ז' },
        { value: 8, label: 'כיתה ח' },
        { value: 9, label: 'כיתה ט' },
        { value: 10, label: 'כיתה י' },
        { value: 11, label: 'כיתה יא' },
        { value: 12, label: 'כיתה יב' }
      ],
      validate: (value, allAttributes) => {
        if (!value) return true; // Optional field
        const gradeMin = allAttributes.grade_min;
        if (gradeMin && value <= gradeMin) {
          return 'הכיתה המקסימלית חייבת להיות גבוהה מהכיתה המינימלית';
        }
        return true;
      }
    },
    subject: {
      type: 'select',
      label: 'מקצוע',
      description: 'המקצוע הרלוונטי למשחק',
      placeholder: 'בחר מקצוע (אופציונלי)',
      nullable: true,
      options: [] // This will be populated dynamically from settings
    },
    game_type: {
      type: 'select',
      label: 'סוג משחק',
      description: 'סוג המשחק הספציפי',
      placeholder: 'בחר סוג משחק',
      options: [] // Populated dynamically from settings
    },
    digital: {
      type: 'select',
      label: 'סוג הגרסה',
      description: 'האם המשחק זמין בגרסה דיגיטלית או גרסה להדפסה',
      placeholder: 'בחר סוג גרסה',
      options: [
        { value: true, label: 'דיגיטלי' },
        { value: false, label: 'גרסה להדפסה' }
      ]
    }
  },
  tool: {
    // Tools use the same basic fields as files - no special attributes needed
  },
  lesson_plan: {
    context: {
      type: 'text',
      label: 'הקשר/נושא',
      description: 'הקשר הנושאי של מערך השיעור (חיות, חגים, וכו\')',
      placeholder: 'למשל: חיות, חנוכה, חג המולד...',
      nullable: true,
      maxLength: 100
    },
    grade_min: {
      type: 'select',
      label: 'כיתה מינימלית',
      description: 'הכיתה הנמוכה ביותר המתאימה למערך השיעור',
      placeholder: 'בחר כיתה מינימלית',
      options: [
        { value: 1, label: 'כיתה א' },
        { value: 2, label: 'כיתה ב' },
        { value: 3, label: 'כיתה ג' },
        { value: 4, label: 'כיתה ד' },
        { value: 5, label: 'כיתה ה' },
        { value: 6, label: 'כיתה ו' },
        { value: 7, label: 'כיתה ז' },
        { value: 8, label: 'כיתה ח' },
        { value: 9, label: 'כיתה ט' },
        { value: 10, label: 'כיתה י' },
        { value: 11, label: 'כיתה יא' },
        { value: 12, label: 'כיתה יב' }
      ],
      validate: (value, allAttributes) => {
        if (!value) return true; // Optional field
        const gradeMax = allAttributes.grade_max;
        if (gradeMax && value >= gradeMax) {
          return 'הכיתה המינימלית חייבת להיות נמוכה מהכיתה המקסימלית';
        }
        return true;
      }
    },
    grade_max: {
      type: 'select',
      label: 'כיתה מקסימלית',
      description: 'הכיתה הגבוהה ביותר המתאימה למערך השיעור',
      placeholder: 'בחר כיתה מקסימלית',
      options: [
        { value: 1, label: 'כיתה א' },
        { value: 2, label: 'כיתה ב' },
        { value: 3, label: 'כיתה ג' },
        { value: 4, label: 'כיתה ד' },
        { value: 5, label: 'כיתה ה' },
        { value: 6, label: 'כיתה ו' },
        { value: 7, label: 'כיתה ז' },
        { value: 8, label: 'כיתה ח' },
        { value: 9, label: 'כיתה ט' },
        { value: 10, label: 'כיתה י' },
        { value: 11, label: 'כיתה יא' },
        { value: 12, label: 'כיתה יב' }
      ],
      validate: (value, allAttributes) => {
        if (!value) return true; // Optional field
        const gradeMin = allAttributes.grade_min;
        if (gradeMin && value <= gradeMin) {
          return 'הכיתה המקסימלית חייבת להיות גבוהה מהכיתה המינימלית';
        }
        return true;
      }
    },
    subject: {
      type: 'select',
      label: 'מקצוע',
      description: 'המקצוע הרלוונטי למערך השיעור',
      placeholder: 'בחר מקצוע (אופציונלי)',
      nullable: true,
      options: [] // This will be populated dynamically from settings
    },
    estimated_duration: {
      type: 'number',
      min: 5,
      max: 180,
      label: 'משך שיעור משוער (דקות)',
      description: 'משך השיעור המשוער בדקות',
      placeholder: 'למשל: 45'
    }
  }
};

// Helper function to get attributes schema for a product type
export const getAttributeSchema = (productType) => {
  return TYPE_ATTRIBUTE_SCHEMAS[productType] || {};
};

// Helper function to get all available attributes for a product type
export const getProductTypeAttributes = (productType) => {
  const schema = getAttributeSchema(productType);
  return Object.keys(schema);
};

// Helper function to validate type attributes
export const validateTypeAttributes = (productType, attributes) => {
  const schema = getAttributeSchema(productType);
  const errors = [];

  for (const [key, value] of Object.entries(attributes)) {
    const fieldSchema = schema[key];
    if (!fieldSchema) continue;

    // Required field validation
    if (fieldSchema.required && (value === undefined || value === null || value === '')) {
      errors.push(`${fieldSchema.label} הוא שדה חובה`);
      continue;
    }

    // Skip validation for empty optional fields
    if (!fieldSchema.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Type validation
    if (fieldSchema.type === 'number' && typeof value !== 'number') {
      errors.push(`${fieldSchema.label} חייב להיות מספר`);
      continue;
    }
    if (fieldSchema.type === 'select' && typeof value !== 'string') {
      errors.push(`${fieldSchema.label} חייב להיות טקסט`);
      continue;
    }
    if (fieldSchema.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${fieldSchema.label} חייב להיות כן/לא`);
      continue;
    }

    // Range validation for numbers
    if (fieldSchema.type === 'number') {
      if (fieldSchema.min !== undefined && value < fieldSchema.min) {
        errors.push(`${fieldSchema.label} חייב להיות לפחות ${fieldSchema.min}`);
      }
      if (fieldSchema.max !== undefined && value > fieldSchema.max) {
        errors.push(`${fieldSchema.label} חייב להיות לכל היותר ${fieldSchema.max}`);
      }
    }

    // Options validation for select fields
    if (fieldSchema.type === 'select' && fieldSchema.options) {
      const validValues = fieldSchema.options.map(opt => opt.value);
      if (!validValues.includes(value)) {
        const validLabels = fieldSchema.options.map(opt => opt.label).join(', ');
        errors.push(`${fieldSchema.label} חייב להיות אחד מהערכים: ${validLabels}`);
      }
    }
  }

  return errors;
};

// Helper function to get Hebrew grade label from number
export const getGradeLabel = (gradeNumber) => {
  const gradeLabels = {
    1: 'כיתה א',
    2: 'כיתה ב',
    3: 'כיתה ג',
    4: 'כיתה ד',
    5: 'כיתה ה',
    6: 'כיתה ו',
    7: 'כיתה ז',
    8: 'כיתה ח',
    9: 'כיתה ט',
    10: 'כיתה י',
    11: 'כיתה יא',
    12: 'כיתה יב'
  };
  return gradeLabels[gradeNumber] || `כיתה ${gradeNumber}`;
};

// Helper function to format grade range
export const formatGradeRange = (gradeMin, gradeMax) => {
  if (!gradeMin && !gradeMax) return null;
  if (gradeMin && gradeMax) {
    if (gradeMin === gradeMax) {
      return `מתאים ל${getGradeLabel(gradeMin)}`;
    }
    return `מ${getGradeLabel(gradeMin)} - עד ${getGradeLabel(gradeMax)}`;
  }
  if (gradeMin) return `מ${getGradeLabel(gradeMin)}`;
  if (gradeMax) return `עד ${getGradeLabel(gradeMax)}`;
  return null;
};

// Export arrays for iteration
export const PRODUCT_TYPE_KEYS = Object.keys(PRODUCT_TYPES);
export const NAV_ITEM_KEYS = Object.keys(NAV_ITEMS);