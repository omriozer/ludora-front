/**
 * Content Metadata Schemas
 * Defines metadata structure and validation for each semantic type
 */

export const CONTENT_METADATA_SCHEMAS = {
  word: {
    label: 'מילה',
    searchFields: ['value'],
    metadata: {
      lang: {
        type: 'select',
        label: 'שפה',
        required: true,
        defaultValue: 'hebrew',
        options: [
          { value: 'hebrew', label: 'עברית' },
          { value: 'english', label: 'אנגלית' },
          { value: 'arabic', label: 'ערבית' },
          { value: 'french', label: 'צרפתית' },
          { value: 'spanish', label: 'ספרדית' }
        ]
      },
      nikud: {
        type: 'text',
        label: 'ניקוד עברי',
        required: false,
        maxLength: 200,
        placeholder: 'הכנס את המילה עם ניקוד...',
        showWhen: { lang: 'hebrew' }
      }
    }
  },

  question: {
    label: 'שאלה',
    searchFields: ['value'],
    metadata: {
      question_type: {
        type: 'select',
        label: 'סוג השאלה',
        required: true,
        defaultValue: 'open',
        options: [
          { value: 'open', label: 'שאלה פתוחה' },
          { value: 'closed', label: 'שאלה סגורה' },
          { value: 'multiple_choice', label: 'רב ברירה' }
        ]
      },
      difficulty_level: {
        type: 'select',
        label: 'רמת קושי',
        required: false,
        options: [
          { value: 'easy', label: 'קל' },
          { value: 'medium', label: 'בינוני' },
          { value: 'hard', label: 'קשה' }
        ]
      },
      subject: {
        type: 'text',
        label: 'נושא',
        required: false,
        maxLength: 50
      },
      correct_answer: {
        type: 'text',
        label: 'תשובה נכונה',
        required: false,
        maxLength: 200,
        showWhen: { question_type: ['closed', 'multiple_choice'] }
      },
      answer_options: {
        type: 'array',
        label: 'אפשרויות תשובה',
        required: false,
        showWhen: { question_type: 'multiple_choice' }
      }
    }
  },

  name: {
    label: 'שם',
    searchFields: ['value'],
    metadata: {
      name_type: {
        type: 'select',
        label: 'סוג השם',
        required: true,
        defaultValue: 'person',
        options: [
          { value: 'person', label: 'אדם' },
          { value: 'character', label: 'דמות' },
          { value: 'brand', label: 'מותג' },
          { value: 'organization', label: 'ארגון' }
        ]
      },
      gender: {
        type: 'select',
        label: 'מגדר (לדקדוק עברי)',
        required: false,
        options: [
          { value: 'male', label: 'זכר' },
          { value: 'female', label: 'נקבה' },
          { value: 'neutral', label: 'ניטרלי' }
        ],
        showWhen: { name_type: ['person', 'character'] }
      },
      origin: {
        type: 'text',
        label: 'מקור/תרבות',
        required: false,
        maxLength: 50
      },
      category: {
        type: 'text',
        label: 'קטגוריה',
        required: false,
        maxLength: 50,
        placeholder: 'דמות היסטורית, דמות בדיונית, וכו...'
      }
    }
  },

  place: {
    label: 'מקום',
    searchFields: ['value'],
    metadata: {
      place_type: {
        type: 'select',
        label: 'סוג המקום',
        required: true,
        defaultValue: 'city',
        options: [
          { value: 'country', label: 'מדינה' },
          { value: 'city', label: 'עיר' },
          { value: 'landmark', label: 'ציון דרך' },
          { value: 'building', label: 'בניין' },
          { value: 'natural', label: 'אתר טבע' }
        ]
      },
      country: {
        type: 'text',
        label: 'מדינה',
        required: false,
        maxLength: 50
      },
      region: {
        type: 'text',
        label: 'אזור/מחוז',
        required: false,
        maxLength: 50
      },
      coordinates: {
        type: 'coordinates',
        label: 'קואורדינטות',
        required: false
      }
    }
  },

  text: {
    label: 'טקסט',
    searchFields: ['value', 'metadata.title'],
    metadata: {
      title: {
        type: 'text',
        label: 'כותרת',
        required: false,
        maxLength: 100
      },
      text_type: {
        type: 'select',
        label: 'סוג הטקסט',
        required: true,
        defaultValue: 'paragraph',
        options: [
          { value: 'story', label: 'סיפור' },
          { value: 'poem', label: 'שיר' },
          { value: 'article', label: 'מאמר' },
          { value: 'instruction', label: 'הוראה' },
          { value: 'paragraph', label: 'פסקה' }
        ]
      },
      length_category: {
        type: 'select',
        label: 'אורך הטקסט',
        required: false,
        options: [
          { value: 'short', label: 'קצר (עד 50 מילים)' },
          { value: 'medium', label: 'בינוני (50-200 מילים)' },
          { value: 'long', label: 'ארוך (200+ מילים)' }
        ]
      },
      reading_level: {
        type: 'select',
        label: 'רמת קריאה',
        required: false,
        options: [
          { value: 'elementary', label: 'יסודי' },
          { value: 'intermediate', label: 'בינוני' },
          { value: 'advanced', label: 'מתקדם' }
        ]
      },
      language: {
        type: 'select',
        label: 'שפה',
        required: true,
        defaultValue: 'hebrew',
        options: [
          { value: 'hebrew', label: 'עברית' },
          { value: 'english', label: 'אנגלית' },
          { value: 'mixed', label: 'מעורב' }
        ]
      }
    }
  },

  image: {
    label: 'תמונה',
    searchFields: ['metadata.description', 'metadata.subject'],
    metadata: {
      description: {
        type: 'textarea',
        label: 'תיאור התמונה',
        required: true,
        maxLength: 500
      },
      image_type: {
        type: 'select',
        label: 'סוג התמונה',
        required: true,
        options: [
          { value: 'photo', label: 'תצלום' },
          { value: 'illustration', label: 'איור' },
          { value: 'icon', label: 'אייקון' },
          { value: 'diagram', label: 'דיאגרמה' },
          { value: 'drawing', label: 'ציור' }
        ]
      },
      subject: {
        type: 'text',
        label: 'נושא התמונה',
        required: false,
        maxLength: 100
      },
      color_scheme: {
        type: 'select',
        label: 'סכמת צבעים',
        required: false,
        options: [
          { value: 'color', label: 'צבעוני' },
          { value: 'black_white', label: 'שחור לבן' },
          { value: 'sepia', label: 'ספיה' }
        ]
      },
      usage_rights: {
        type: 'select',
        label: 'זכויות שימוש',
        required: true,
        defaultValue: 'owned',
        options: [
          { value: 'free', label: 'חופשי לשימוש' },
          { value: 'licensed', label: 'ברישיון' },
          { value: 'owned', label: 'בבעלות' }
        ]
      }
    }
  },

  audio: {
    label: 'אודיו',
    searchFields: ['metadata.description', 'metadata.name'],
    metadata: {
      name: {
        type: 'text',
        label: 'שם הקובץ',
        required: true,
        maxLength: 100
      },
      description: {
        type: 'textarea',
        label: 'תיאור התוכן',
        required: true,
        maxLength: 500
      },
      audio_type: {
        type: 'select',
        label: 'סוג האודיו',
        required: true,
        defaultValue: 'speech',
        options: [
          { value: 'music', label: 'מוזיקה' },
          { value: 'speech', label: 'דיבור' },
          { value: 'sound_effect', label: 'אפקט קול' },
          { value: 'recording', label: 'הקלטה' },
          { value: 'narration', label: 'הקראה' }
        ]
      },
      duration_seconds: {
        type: 'number',
        label: 'משך (שניות)',
        required: false,
        min: 1,
        max: 3600
      },
      language: {
        type: 'select',
        label: 'שפה',
        required: false,
        options: [
          { value: 'hebrew', label: 'עברית' },
          { value: 'english', label: 'אנגלית' },
          { value: 'none', label: 'ללא דיבור' }
        ],
        showWhen: { audio_type: ['speech', 'recording', 'narration'] }
      },
      speaker: {
        type: 'text',
        label: 'דובר',
        required: false,
        maxLength: 100,
        showWhen: { audio_type: ['speech', 'recording', 'narration'] }
      }
    }
  },

  video: {
    label: 'וידאו',
    searchFields: ['metadata.description', 'metadata.name'],
    metadata: {
      name: {
        type: 'text',
        label: 'שם הוידאו',
        required: true,
        maxLength: 100
      },
      description: {
        type: 'textarea',
        label: 'תיאור התוכן',
        required: true,
        maxLength: 500
      },
      video_type: {
        type: 'select',
        label: 'סוג הוידאו',
        required: true,
        defaultValue: 'educational',
        options: [
          { value: 'educational', label: 'חינוכי' },
          { value: 'entertainment', label: 'בידור' },
          { value: 'demo', label: 'הדגמה' },
          { value: 'animation', label: 'אנימציה' },
          { value: 'documentary', label: 'דוקומנטרי' }
        ]
      },
      duration_seconds: {
        type: 'number',
        label: 'משך (שניות)',
        required: false,
        min: 1,
        max: 7200
      },
      resolution: {
        type: 'select',
        label: 'רזולוציה',
        required: false,
        options: [
          { value: '480p', label: '480p' },
          { value: '720p', label: '720p (HD)' },
          { value: '1080p', label: '1080p (Full HD)' },
          { value: '4k', label: '4K' }
        ]
      },
      language: {
        type: 'select',
        label: 'שפה',
        required: false,
        options: [
          { value: 'hebrew', label: 'עברית' },
          { value: 'english', label: 'אנגלית' },
          { value: 'none', label: 'ללא דיבור' }
        ]
      },
      has_subtitles: {
        type: 'boolean',
        label: 'יש כתוביות',
        required: false,
        defaultValue: false
      }
    }
  },

  game_card_bg: {
    label: 'רקע קלף',
    searchFields: ['metadata.description', 'metadata.theme'],
    metadata: {
      description: {
        type: 'textarea',
        label: 'תיאור רקע הקלף',
        required: true,
        maxLength: 300,
        placeholder: 'תאר את עיצוב הרקע, הצבעים והמוטיבים...'
      },
      theme: {
        type: 'select',
        label: 'נושא הרקע',
        required: true,
        defaultValue: 'abstract',
        options: [
          { value: 'abstract', label: 'מופשט' },
          { value: 'nature', label: 'טבע' },
          { value: 'animals', label: 'חיות' },
          { value: 'holidays', label: 'חגים' },
          { value: 'seasons', label: 'עונות השנה' },
          { value: 'geometric', label: 'גיאומטרי' },
          { value: 'educational', label: 'חינוכי' },
          { value: 'fantasy', label: 'פנטזיה' },
          { value: 'sports', label: 'ספורט' },
          { value: 'music', label: 'מוזיקה' }
        ]
      },
      color_scheme: {
        type: 'select',
        label: 'סכמת צבעים',
        required: true,
        defaultValue: 'colorful',
        options: [
          { value: 'colorful', label: 'צבעוני' },
          { value: 'monochrome', label: 'חד גוני' },
          { value: 'warm', label: 'צבעים חמים' },
          { value: 'cool', label: 'צבעים קרים' },
          { value: 'pastel', label: 'פסטל' },
          { value: 'high_contrast', label: 'ניגודיות גבוהה' }
        ]
      },
      style: {
        type: 'select',
        label: 'סגנון עיצוב',
        required: true,
        defaultValue: 'illustration',
        options: [
          { value: 'illustration', label: 'איור' },
          { value: 'pattern', label: 'דוגמה' },
          { value: 'texture', label: 'מרקם' },
          { value: 'gradient', label: 'מעבר צבעים' },
          { value: 'minimalist', label: 'מינימליסטי' },
          { value: 'ornamental', label: 'דקורטיבי' }
        ]
      },
      age_group: {
        type: 'select',
        label: 'קבוצת גיל מתאימה',
        required: false,
        options: [
          { value: 'preschool', label: 'גן (3-6)' },
          { value: 'elementary', label: 'יסודי (6-12)' },
          { value: 'middle_school', label: 'חטיבה (12-15)' },
          { value: 'high_school', label: 'תיכון (15-18)' },
          { value: 'adult', label: 'מבוגרים' },
          { value: 'all_ages', label: 'כל הגילאים' }
        ]
      },
      complexity: {
        type: 'select',
        label: 'מורכבות עיצוב',
        required: false,
        options: [
          { value: 'simple', label: 'פשוט' },
          { value: 'moderate', label: 'בינוני' },
          { value: 'complex', label: 'מורכב' }
        ]
      },
      usage_rights: {
        type: 'select',
        label: 'זכויות שימוש',
        required: true,
        defaultValue: 'owned',
        options: [
          { value: 'free', label: 'חופשי לשימוש' },
          { value: 'licensed', label: 'ברישיון' },
          { value: 'owned', label: 'בבעלות' }
        ]
      },
      originalName: {
        type: 'text',
        label: 'שם הקובץ המקורי',
        required: false,
        maxLength: 100,
        readonly: true
      }
    }
  },

  complete_card: {
    label: 'קלף שלם',
    searchFields: ['metadata.name', 'metadata.description', 'metadata.card_content_type', 'metadata.content'],
    metadata: {
      name: {
        type: 'text',
        label: 'שם הקלף',
        required: true,
        maxLength: 100,
        placeholder: 'שם תיאורי לקלף...'
      },
      description: {
        type: 'textarea',
        label: 'תיאור הקלף',
        required: true,
        maxLength: 300,
        placeholder: 'תאר בקצרה את התוכן והעיצוב של הקלף...'
      },
      card_content_type: {
        type: 'select',
        label: 'סוג תוכן הקלף',
        required: true,
        defaultValue: 'word',
        options: [
          { value: 'word', label: 'מילה' },
          { value: 'question', label: 'שאלה' },
          { value: 'answer', label: 'תשובה' },
          { value: 'image', label: 'תמונה' },
          { value: 'symbol', label: 'סמל' },
          { value: 'number', label: 'מספר' },
          { value: 'shape', label: 'צורה' }
        ]
      },
      content: {
        type: 'textarea',
        label: 'תוכן הקלף',
        required: false,
        maxLength: 150,
        placeholder: 'התוכן הטקסטואלי הנוסף בקלף (אופציונלי)'
      },
      game_purpose: {
        type: 'select',
        label: 'מטרת המשחק',
        required: false,
        options: [
          { value: 'memory', label: 'זיכרון' },
          { value: 'matching', label: 'התאמה' },
          { value: 'vocabulary', label: 'אוצר מילים' },
          { value: 'comprehension', label: 'הבנה' },
          { value: 'recognition', label: 'זיהוי' },
          { value: 'categorization', label: 'סיווג' }
        ]
      },
      age_group: {
        type: 'select',
        label: 'קבוצת גיל מתאימה',
        required: false,
        options: [
          { value: 'preschool', label: 'גן (3-6)' },
          { value: 'elementary', label: 'יסודי (6-12)' },
          { value: 'middle_school', label: 'חטיבה (12-15)' },
          { value: 'high_school', label: 'תיכון (15-18)' },
          { value: 'adult', label: 'מבוגרים' },
          { value: 'all_ages', label: 'כל הגילאים' }
        ]
      },
      theme: {
        type: 'select',
        label: 'נושא ועיצוב',
        required: false,
        options: [
          { value: 'animals', label: 'חיות' },
          { value: 'nature', label: 'טבע' },
          { value: 'people', label: 'אנשים' },
          { value: 'objects', label: 'חפצים' },
          { value: 'food', label: 'אוכל' },
          { value: 'transportation', label: 'תחבורה' },
          { value: 'holidays', label: 'חגים' },
          { value: 'seasons', label: 'עונות השנה' },
          { value: 'emotions', label: 'רגשות' },
          { value: 'professions', label: 'מקצועות' },
          { value: 'school', label: 'בית ספר' },
          { value: 'family', label: 'משפחה' },
          { value: 'sports', label: 'ספורט' },
          { value: 'music', label: 'מוזיקה' },
          { value: 'colorful', label: 'צבעוני' },
          { value: 'minimalist', label: 'מינימליסטי' },
          { value: 'illustration', label: 'איור' },
          { value: 'realistic', label: 'ריאליסטי' }
        ]
      }
    }
  }
};

// Helper function to get schema for a semantic type
export const getContentSchema = (semanticType) => {
  return CONTENT_METADATA_SCHEMAS[semanticType] || null;
};

// Helper function to get search fields for a semantic type
export const getSearchFields = (semanticType) => {
  const schema = getContentSchema(semanticType);
  return schema ? schema.searchFields : ['value'];
};

// Helper function to get metadata fields that should be shown based on conditions
export const getVisibleMetadataFields = (semanticType, currentMetadata = {}) => {
  const schema = getContentSchema(semanticType);
  if (!schema || !schema.metadata) return {};

  const visibleFields = {};

  Object.entries(schema.metadata).forEach(([fieldName, fieldConfig]) => {
    let shouldShow = true;

    if (fieldConfig.showWhen) {
      shouldShow = false;
      Object.entries(fieldConfig.showWhen).forEach(([conditionField, conditionValue]) => {
        const currentValue = currentMetadata[conditionField];
        if (Array.isArray(conditionValue)) {
          if (conditionValue.includes(currentValue)) {
            shouldShow = true;
          }
        } else {
          if (currentValue === conditionValue) {
            shouldShow = true;
          }
        }
      });
    }

    if (shouldShow) {
      visibleFields[fieldName] = fieldConfig;
    }
  });

  return visibleFields;
};