/**
 * Centralized Product Types Configuration
 *
 * This is the ONLY file in the application that should contain
 * hardcoded Hebrew product type names and text variations.
 *
 * All other components should import and use names from this file.
 */

import { Calendar, BookOpen, FileText, Play, GraduationCap } from "lucide-react";

// Product Types Configuration
export const PRODUCT_TYPES = {
  workshop: {
    key: 'workshop',
    singular: 'הדרכה',
    plural: 'הדרכות',
    navText: 'הדרכות',
    description: 'הדרכות אונליין חיות או מוקלטות',
    icon: Calendar,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    gradient: "from-blue-500 via-indigo-500 to-purple-600"
  },
  course: {
    key: 'course',
    singular: 'קורס',
    plural: 'קורסים',
    navText: 'קורסים',
    description: 'קורסים עם מודולים מרובים',
    icon: BookOpen,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    gradient: "from-orange-400 via-red-500 to-pink-600"
  },
  file: {
    key: 'file',
    singular: 'קובץ',
    plural: 'קבצים',
    navText: 'קבצים',
    description: 'קבצים דיגיטליים',
    icon: FileText,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    gradient: "from-emerald-400 via-teal-500 to-cyan-600"
  },
  tool: {
    key: 'tool',
    singular: 'כלי',
    plural: 'כלים',
    navText: 'כלים',
    description: 'כלים דיגיטליים',
    icon: FileText,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    gradient: "from-emerald-400 via-teal-500 to-cyan-600"
  },
  game: {
    key: 'game',
    singular: 'משחק',
    plural: 'משחקים',
    navText: 'משחקים',
    description: 'משחקים חינוכיים',
    icon: Play,
    color: 'from-pink-500 to-red-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    gradient: "from-purple-500 via-pink-500 to-red-500"
  }
};

// Navigation Items Configuration
export const NAV_ITEMS = {
  files: {
    key: 'files',
    text: 'קבצים',
    defaultIcon: 'FileText',
    description: 'קבצים דיגיטליים להדפסה',
    gradient: "from-emerald-400 via-teal-500 to-cyan-600"
  },
  tools: {
    key: 'tools',
    text: 'כלים',
    defaultIcon: 'Settings',
    description: 'כלים דיגיטליים ויישומונים',
    gradient: "from-slate-400 via-gray-500 to-zinc-600"
  },
  games: {
    key: 'games',
    text: 'משחקים',
    defaultIcon: 'Play',
    description: 'משחקים חינוכיים',
    gradient: "from-purple-500 via-pink-500 to-red-500"
  },
  workshops: {
    key: 'workshops',
    text: 'הדרכות',
    defaultIcon: 'Calendar',
    description: 'הדרכות וסדנאות',
    gradient: "from-blue-500 via-indigo-500 to-purple-600"
  },
  courses: {
    key: 'courses',
    text: 'קורסים',
    defaultIcon: 'BookOpen',
    description: 'קורסים מקוונים',
    gradient: "from-orange-400 via-red-500 to-pink-600"
  },
  classrooms: {
    key: 'classrooms',
    text: 'הכיתות שלי',
    defaultIcon: 'GraduationCap',
    description: 'ניהול כיתות ותלמידים',
    requiresSubscription: true,
    gradient: "from-teal-400 via-cyan-500 to-blue-600"
  },
  account: {
    key: 'account',
    text: 'החשבון שלי',
    defaultIcon: 'UserIcon',
    description: 'ניהול חשבון משתמש',
    gradient: "from-gray-500 via-slate-500 to-gray-600"
  },
  content_creators: {
    key: 'content_creators',
    text: 'יוצרי תוכן',
    defaultIcon: 'Users',
    description: 'פורטל יוצרי תוכן',
    specialVisibility: true,
    gradient: "from-indigo-500 via-purple-500 to-pink-600"
  }
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

// Export arrays for iteration
export const PRODUCT_TYPE_KEYS = Object.keys(PRODUCT_TYPES);
export const NAV_ITEM_KEYS = Object.keys(NAV_ITEMS);