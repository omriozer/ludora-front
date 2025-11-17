/**
 * Ludora Design System - Color Schema
 * Centralized color definitions for consistent theming across portals
 */

export const COLORS = {
  // Primary Brand Colors
  primary: {
    purple: {
      50: '#f8f6ff',
      100: '#f0ebff',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b7',
      900: '#4c1d95'
    },
    blue: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
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
      400: '#f472b6',
      500: '#ec4899',
      600: '#db2777',
      700: '#be185d',
      800: '#9d174d',
      900: '#831843'
    }
  },

  // Secondary Colors
  secondary: {
    indigo: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81'
    },
    green: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d'
    }
  },

  // Portal-Specific Themes
  themes: {
    teacher: {
      background: 'from-blue-50 to-indigo-100',
      primary: '#7c3aed', // purple-600
      secondary: '#3b82f6', // blue-500
      accent: '#ec4899', // pink-500
      nav: {
        background: 'from-purple-600 via-pink-600 to-blue-600',
        hover: 'from-purple-700 via-pink-700 to-blue-700'
      }
    },
    student: {
      background: 'from-purple-100 via-blue-50 to-indigo-100',
      primary: '#8b5cf6', // purple-500
      secondary: '#60a5fa', // blue-400
      accent: '#f472b6', // pink-400
      nav: {
        background: 'from-purple-500 to-blue-500',
        hover: 'from-purple-600 to-blue-600'
      },
      footer: {
        background: 'from-purple-900 via-purple-800 to-indigo-900',
        text: 'text-purple-50',
        links: 'text-purple-200',
        linkHover: 'text-white',
        border: 'border-purple-700',
        buttons: {
          whatsapp: 'bg-green-500 hover:bg-green-600',
          email: 'bg-purple-600 hover:bg-purple-700',
          contact: 'border-purple-300 text-purple-200 hover:bg-purple-100 hover:text-purple-900'
        }
      }
    }
  },

  // Status Colors
  status: {
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d'
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309'
    },
    error: {
      50: '#fef2f2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c'
    },
    info: {
      50: '#eff6ff',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8'
    }
  },

  // Neutral Colors
  neutral: {
    white: '#ffffff',
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827'
    },
    black: '#000000'
  },

  // Maintenance Mode Colors
  maintenance: {
    background: 'from-orange-500 to-red-500',
    text: 'text-white',
    warning: 'from-yellow-400 via-orange-400 to-red-400'
  }
};

// Utility functions for getting theme-specific colors
export const getThemeColors = (theme = 'teacher') => {
  return COLORS.themes[theme] || COLORS.themes.teacher;
};

export const getStatusColor = (status, shade = 500) => {
  return COLORS.status[status]?.[shade] || COLORS.status.info[shade];
};

// Gradient utilities
export const GRADIENTS = {
  teacher: {
    primary: 'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600',
    secondary: 'bg-gradient-to-r from-blue-500 to-purple-600',
    background: 'bg-gradient-to-br from-blue-50 to-indigo-100'
  },
  student: {
    primary: 'bg-gradient-to-r from-purple-500 to-blue-500',
    secondary: 'bg-gradient-to-r from-purple-400 to-pink-400',
    background: 'bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100',
    footer: 'bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900'
  },
  maintenance: 'bg-gradient-to-r from-orange-500 to-red-500',
  success: 'bg-gradient-to-r from-green-400 to-emerald-500',
  warning: 'bg-gradient-to-r from-yellow-400 to-orange-500',
  error: 'bg-gradient-to-r from-red-400 to-pink-500'
};

export default COLORS;