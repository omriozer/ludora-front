// Subject-specific color mappings for educational content
export const SUBJECT_COLORS = {
  // Core subjects
  'מתמטיקה': {
    bg: 'bg-blue-500',
    text: 'text-white',
    border: 'border-blue-400',
    gradient: 'from-blue-500 to-blue-600'
  },
  'עברית': {
    bg: 'bg-green-500',
    text: 'text-white',
    border: 'border-green-400',
    gradient: 'from-green-500 to-green-600'
  },
  'אנגלית': {
    bg: 'bg-purple-500',
    text: 'text-white',
    border: 'border-purple-400',
    gradient: 'from-purple-500 to-purple-600'
  },
  'מדעים': {
    bg: 'bg-orange-500',
    text: 'text-white',
    border: 'border-orange-400',
    gradient: 'from-orange-500 to-orange-600'
  },
  'היסטוריה': {
    bg: 'bg-red-500',
    text: 'text-white',
    border: 'border-red-400',
    gradient: 'from-red-500 to-red-600'
  },
  'גיאוגרפיה': {
    bg: 'bg-teal-500',
    text: 'text-white',
    border: 'border-teal-400',
    gradient: 'from-teal-500 to-teal-600'
  },

  // STEM subjects
  'פיזיקה': {
    bg: 'bg-indigo-500',
    text: 'text-white',
    border: 'border-indigo-400',
    gradient: 'from-indigo-500 to-indigo-600'
  },
  'כימיה': {
    bg: 'bg-pink-500',
    text: 'text-white',
    border: 'border-pink-400',
    gradient: 'from-pink-500 to-pink-600'
  },
  'ביולוגיה': {
    bg: 'bg-emerald-500',
    text: 'text-white',
    border: 'border-emerald-400',
    gradient: 'from-emerald-500 to-emerald-600'
  },
  'מחשבים': {
    bg: 'bg-gray-600',
    text: 'text-white',
    border: 'border-gray-500',
    gradient: 'from-gray-600 to-gray-700'
  },

  // Arts and humanities
  'אמנות': {
    bg: 'bg-rose-500',
    text: 'text-white',
    border: 'border-rose-400',
    gradient: 'from-rose-500 to-rose-600'
  },
  'מוזיקה': {
    bg: 'bg-violet-500',
    text: 'text-white',
    border: 'border-violet-400',
    gradient: 'from-violet-500 to-violet-600'
  },
  'ספורט': {
    bg: 'bg-lime-500',
    text: 'text-white',
    border: 'border-lime-400',
    gradient: 'from-lime-500 to-lime-600'
  },
  'דת': {
    bg: 'bg-amber-500',
    text: 'text-white',
    border: 'border-amber-400',
    gradient: 'from-amber-500 to-amber-600'
  },

  // Default fallback
  'default': {
    bg: 'bg-slate-500',
    text: 'text-white',
    border: 'border-slate-400',
    gradient: 'from-slate-500 to-slate-600'
  }
};

/**
 * Get color scheme for a subject
 * @param {string} subject - The subject name
 * @returns {object} Color scheme object with bg, text, border, gradient classes
 */
export const getSubjectColors = (subject) => {
  if (!subject) return SUBJECT_COLORS.default;

  // Try exact match first
  if (SUBJECT_COLORS[subject]) {
    return SUBJECT_COLORS[subject];
  }

  // Try partial match for variations
  const subjectKey = Object.keys(SUBJECT_COLORS).find(key =>
    key !== 'default' && (subject.includes(key) || key.includes(subject))
  );

  return SUBJECT_COLORS[subjectKey] || SUBJECT_COLORS.default;
};