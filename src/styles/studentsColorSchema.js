/**
 * Ludora Student Portal - Color Schema
 * Kid-friendly, vibrant colors specifically designed for students
 */

export const STUDENT_COLORS = {
  // Primary Student Palette - Bright and Engaging
  primary: {
    purple: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',  // Main purple
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87'
    },
    blue: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',  // Main blue
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a'
    },
    pink: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',  // Accent pink
      500: '#ec4899',
      600: '#db2777',
      700: '#be185d',
      800: '#9d174d',
      900: '#831843'
    }
  },

  // Fun Secondary Colors for Student UI
  fun: {
    orange: {
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c'
    },
    green: {
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a'
    },
    yellow: {
      400: '#facc15',
      500: '#eab308',
      600: '#ca8a04'
    }
  },

  // Student Portal Background Gradients
  backgrounds: {
    main: 'from-purple-100 via-blue-50 to-indigo-100',
    card: 'from-white via-purple-50 to-blue-50',
    button: 'from-purple-500 to-blue-500',
    buttonHover: 'from-purple-600 to-blue-600',
    footer: 'from-purple-600 via-purple-700 to-indigo-700'
  },

  // Student Footer Specific Colors
  footer: {
    background: 'linear-gradient(135deg, rgb(147 51 234) 0%, rgb(79 70 229) 100%)',
    text: '#e0e7ff',      // indigo-200
    heading: '#ffffff',   // white
    link: '#c7d2fe',      // indigo-300
    linkHover: '#ffffff', // white
    border: '#6366f1'     // indigo-500
  },

  // Neutral Colors for Student Portal
  neutral: {
    white: '#ffffff',
    gray: {
      50: '#f8fafc',   // Lighter grays for kids
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a'
    }
  },

  // Status Colors (Kid-friendly versions)
  status: {
    success: '#22c55e',    // Bright green
    warning: '#f59e0b',    // Bright orange
    error: '#ef4444',      // Bright red
    info: '#3b82f6'        // Bright blue
  }
};

// Student-specific gradients
export const STUDENT_GRADIENTS = {
  // Main backgrounds
  pageBackground: 'bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100',
  cardBackground: 'bg-gradient-to-r from-white via-purple-50 to-blue-50',

  // Buttons
  primaryButton: 'bg-gradient-to-r from-purple-500 to-blue-500',
  primaryButtonHover: 'bg-gradient-to-r from-purple-600 to-blue-600',
  secondaryButton: 'bg-gradient-to-r from-purple-100 to-blue-100',

  // Special elements
  footer: 'bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700',
  header: 'bg-gradient-to-r from-purple-200 to-blue-200',

  // Fun accents
  rainbow: 'bg-gradient-to-r from-purple-400 via-pink-400 via-blue-400 to-green-400',
  sunset: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400'
};

// Student-specific component themes
export const STUDENT_THEMES = {
  button: {
    primary: {
      background: STUDENT_GRADIENTS.primaryButton,
      hover: STUDENT_GRADIENTS.primaryButtonHover,
      text: 'text-white',
      shadow: 'shadow-lg shadow-purple-500/25',
      hoverShadow: 'hover:shadow-xl hover:shadow-purple-500/30'
    },
    secondary: {
      background: 'bg-white border-2 border-purple-300',
      hover: 'hover:bg-purple-50 hover:border-purple-400',
      text: 'text-purple-700',
      shadow: 'shadow-md',
      hoverShadow: 'hover:shadow-lg'
    }
  },

  card: {
    background: 'bg-white/90 backdrop-blur-sm',
    border: 'border border-purple-200/50',
    shadow: 'shadow-lg shadow-purple-500/10',
    hover: 'hover:shadow-xl hover:shadow-purple-500/20 hover:scale-105'
  },

  header: {
    background: 'bg-white/80 backdrop-blur-sm',
    border: 'border-b border-purple-200',
    text: 'text-purple-700'
  }
};

// Utility function for getting student colors
export const getStudentColor = (path) => {
  return path.split('.').reduce((obj, key) => obj?.[key], STUDENT_COLORS);
};

export default STUDENT_COLORS;