/**
 * Student Portal Color Schema
 * Bright, colorful, and kid-friendly design tokens for the student experience
 */

export const STUDENT_COLORS = {
  // Primary Colors - Bright and Engaging
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Main primary
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Secondary Colors - Playful Purple
  secondary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7', // Main secondary
    600: '#9333ea',
    700: '#7c2d12',
    800: '#6b21a8',
    900: '#581c87',
  },

  // Success Colors - Happy Green
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Main success
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Warning Colors - Sunny Yellow
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Main warning
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Error Colors - Gentle Red
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Main error
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Fun Colors - Additional playful colors
  fun: {
    pink: '#ec4899',
    orange: '#f97316',
    teal: '#14b8a6',
    indigo: '#6366f1',
    lime: '#84cc16',
    rose: '#f43f5e',
    emerald: '#10b981',
    cyan: '#06b6d4',
  },

  // Neutral Colors - Soft and warm
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
    900: '#111827',
  },
};

export const STUDENT_GRADIENTS = {
  // Primary gradients for backgrounds
  rainbow: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  sunset: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  ocean: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  candy: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',

  // Button gradients
  primaryButton: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  secondaryButton: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  successButton: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  warningButton: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',

  // Background gradients
  pageBackground: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
  cardBackground: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.8) 100%)',

  // Hover effects
  hoverPrimary: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
  hoverSecondary: 'linear-gradient(135deg, #e879f9 0%, #ef4444 100%)',
};

export const STUDENT_SHADOWS = {
  soft: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  medium: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  large: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  colored: {
    primary: '0 10px 15px -3px rgba(14, 165, 233, 0.3), 0 4px 6px -2px rgba(14, 165, 233, 0.1)',
    secondary: '0 10px 15px -3px rgba(168, 85, 247, 0.3), 0 4px 6px -2px rgba(168, 85, 247, 0.1)',
    success: '0 10px 15px -3px rgba(34, 197, 94, 0.3), 0 4px 6px -2px rgba(34, 197, 94, 0.1)',
  }
};

export const STUDENT_ANIMATIONS = {
  bounce: 'bounce 1s infinite',
  pulse: 'pulse 2s infinite',
  wiggle: 'wiggle 1s ease-in-out infinite',
  float: 'float 3s ease-in-out infinite',
};

export default {
  COLORS: STUDENT_COLORS,
  GRADIENTS: STUDENT_GRADIENTS,
  SHADOWS: STUDENT_SHADOWS,
  ANIMATIONS: STUDENT_ANIMATIONS,
};