/**
 * Tool Categories Configuration
 *
 * Hebrew translations and styling for tool categories.
 * This file provides consistent translation and visual styling for tool categories
 * across the product catalog.
 */

// Tool category mappings with Hebrew labels and styling
export const TOOL_CATEGORIES = {
  'utilities': {
    label: 'כלים שימושיים',
    bg: 'bg-blue-500',
    text: 'text-white',
    border: 'border-blue-400',
    gradient: 'from-blue-500 to-blue-600'
  },
  'educational_games': {
    label: 'משחקים חינוכיים',
    bg: 'bg-purple-500',
    text: 'text-white',
    border: 'border-purple-400',
    gradient: 'from-purple-500 to-purple-600'
  },
  'templates': {
    label: 'תבניות',
    bg: 'bg-green-500',
    text: 'text-white',
    border: 'border-green-400',
    gradient: 'from-green-500 to-green-600'
  },
  'generators': {
    label: 'כלים אוטומטיים',
    bg: 'bg-orange-500',
    text: 'text-white',
    border: 'border-orange-400',
    gradient: 'from-orange-500 to-orange-600'
  },
  'default': {
    label: 'כלים',
    bg: 'bg-slate-500',
    text: 'text-white',
    border: 'border-slate-400',
    gradient: 'from-slate-500 to-slate-600'
  }
};

/**
 * Get Hebrew label for a tool category
 * @param {string} category - The English category name
 * @returns {string} Hebrew label for the category
 */
export const getToolCategoryLabel = (category) => {
  if (!category) return TOOL_CATEGORIES.default.label;
  return TOOL_CATEGORIES[category]?.label || category;
};

/**
 * Get styling colors for a tool category
 * @param {string} category - The English category name
 * @returns {object} Color configuration object
 */
export const getToolCategoryColors = (category) => {
  if (!category) return TOOL_CATEGORIES.default;
  return TOOL_CATEGORIES[category] || TOOL_CATEGORIES.default;
};

/**
 * Get all available tool categories
 * @returns {Array} Array of category objects with name and label
 */
export const getAllToolCategories = () => {
  return Object.entries(TOOL_CATEGORIES)
    .filter(([key]) => key !== 'default')
    .map(([key, config]) => ({
      name: key,
      label: config.label
    }));
};

/**
 * Check if a category exists in our mappings
 * @param {string} category - The category to check
 * @returns {boolean} Whether the category exists
 */
export const isValidToolCategory = (category) => {
  return Boolean(TOOL_CATEGORIES[category]);
};