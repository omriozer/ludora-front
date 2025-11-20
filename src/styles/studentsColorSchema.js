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
    violet: '#8b5cf6',
    amber: '#f59e0b',
    coral: '#ff7875',
    turquoise: '#1dd1a1',
    lavender: '#a78bfa',
    mint: '#10d9c4',
  },

  // Gamification Colors - For achievements, badges, and rewards
  gamification: {
    bronze: '#cd7f32',
    silver: '#c0c0c0',
    gold: '#ffd700',
    platinum: '#e5e4e2',
    diamond: '#b9f2ff',
    achievement: '#ff6b6b',
    streak: '#4ecdc4',
    reward: '#ffe66d',
    experience: '#a8e6cf',
    level: '#ff8b94',
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

  // New dynamic gradients for enhanced experience
  cosmic: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #8b5cf6 50%, #a855f7 75%, #c084fc 100%)',
  tropical: 'linear-gradient(135deg, #10d9c4 0%, #1dd1a1 25%, #4ecdc4 50%, #06b6d4 75%, #0ea5e9 100%)',
  aurora: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 25%, #6366f1 50%, #4f46e5 75%, #4338ca 100%)',
  galaxy: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #3730a3 50%, #1e40af 75%, #1d4ed8 100%)',
  neon: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 25%, #45b7d1 50%, #96ceb4 75%, #ffeaa7 100%)',

  // Animated background gradients
  pageBackground: 'linear-gradient(270deg, #667eea 0%, #764ba2 15%, #f093fb 30%, #f5576c 45%, #4facfe 60%, #10d9c4 75%, #8b5cf6 90%, #667eea 100%)',
  dynamicBackground: 'conic-gradient(from 0deg at 50% 50%, #667eea 0%, #764ba2 60%, #f093fb 120%, #f5576c 180%, #4facfe 240%, #10d9c4 300%, #667eea 360%)',

  // Button gradients
  primaryButton: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  secondaryButton: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  successButton: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  warningButton: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  explosiveButton: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #ffe66d 100%)',

  // Status gradients
  waiting: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
  active: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  full: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  expired: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',

  // Gamification gradients
  achievement: 'linear-gradient(135deg, #ffd700 0%, #ffb347 100%)',
  badge: 'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)',
  streak: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
  level: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
  reward: 'linear-gradient(135deg, #ffe66d 0%, #ff6b6b 50%, #4ecdc4 100%)',

  // Background gradients
  cardBackground: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
  glassCard: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
  lobbyTicket: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 75%, #f5576c 100%)',

  // Hover effects
  hoverPrimary: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
  hoverSecondary: 'linear-gradient(135deg, #e879f9 0%, #ef4444 100%)',
  hoverSuccess: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
  hoverExplosive: 'linear-gradient(135deg, #ef4444 0%, #06b6d4 50%, #f59e0b 100%)',
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
  // Basic animations
  bounce: 'bounce 1s infinite',
  pulse: 'pulse 2s infinite',
  wiggle: 'wiggle 1s ease-in-out infinite',
  float: 'float 3s ease-in-out infinite',

  // New dynamic animations for enhanced experience
  heartbeat: 'heartbeat 1.5s ease-in-out infinite',
  glow: 'glow 2s ease-in-out infinite alternate',
  rotate: 'rotate 2s linear infinite',
  shake: 'shake 0.8s ease-in-out infinite',
  rubber: 'rubber 1s ease-in-out',
  swing: 'swing 2s ease-in-out infinite',
  wobble: 'wobble 1s ease-in-out infinite',
  jello: 'jello 1s ease-in-out',

  // Entrance animations
  fadeInUp: 'fadeInUp 0.6s ease-out',
  fadeInDown: 'fadeInDown 0.6s ease-out',
  slideInLeft: 'slideInLeft 0.6s ease-out',
  slideInRight: 'slideInRight 0.6s ease-out',
  zoomIn: 'zoomIn 0.6s ease-out',
  flipInX: 'flipInX 0.6s ease-out',

  // Attention seekers
  flash: 'flash 1s infinite',
  tada: 'tada 1s ease-in-out',
  wave: 'wave 2s ease-in-out infinite',

  // Background animations
  rainbowShift: 'rainbowShift 6s ease-in-out infinite',
  particleFloat: 'particleFloat 8s ease-in-out infinite',
  gradientWave: 'gradientWave 4s ease-in-out infinite',

  // Interactive animations
  scaleOnHover: 'scaleOnHover 0.3s ease-out',
  liftOnHover: 'liftOnHover 0.3s ease-out',
  glowOnHover: 'glowOnHover 0.3s ease-out',
};

export default {
  COLORS: STUDENT_COLORS,
  GRADIENTS: STUDENT_GRADIENTS,
  SHADOWS: STUDENT_SHADOWS,
  ANIMATIONS: STUDENT_ANIMATIONS,
};