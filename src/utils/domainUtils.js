/**
 * Utility functions for domain detection
 * Simple domain detection for student vs teacher portal
 * Uses centralized configuration for consistent domain handling
 */

import { config, PORTAL_TYPES } from '@/config/environment';

/**
 * Checks if the current domain is the student portal
 * @returns {boolean} True if on student portal domain
 */
export const isStudentPortal = () => {
  return config.portals.getCurrentType() === PORTAL_TYPES.STUDENT;
};

/**
 * Gets the current domain type
 * @returns {'student' | 'teacher'} The domain type
 */
export const getDomainType = () => {
  return config.portals.getCurrentType();
};