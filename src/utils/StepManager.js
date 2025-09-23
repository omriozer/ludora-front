/**
 * Step Manager Utility
 *
 * Handles dynamic step injection and modification for wizard components.
 * Allows plugins to inject custom steps at specific positions or modify
 * existing steps while maintaining the overall wizard flow.
 */

export class StepManager {
  constructor(baseSteps = []) {
    this.baseSteps = baseSteps;
  }

  /**
   * Merge custom steps with base steps according to injection rules
   * @param {Array} customSteps - Array of custom step definitions
   * @returns {Array} - Merged steps array
   */
  injectSteps(customSteps) {
    if (!customSteps || customSteps.length === 0) {
      return [...this.baseSteps];
    }

    let steps = [...this.baseSteps];

    // Sort custom steps by their injection order
    const sortedCustomSteps = this.sortStepsByInjectionOrder(customSteps, steps);

    // Process each custom step
    sortedCustomSteps.forEach(customStep => {
      steps = this.insertStep(steps, customStep);
    });

    return steps;
  }

  /**
   * Insert a custom step into the steps array
   * @param {Array} steps - Current steps array
   * @param {Object} customStep - Custom step to insert
   * @returns {Array} - Updated steps array
   */
  insertStep(steps, customStep) {
    const {
      insertAfter,
      insertBefore,
      insertAt,
      replace,
      ...stepDefinition
    } = customStep;

    // Replace existing step
    if (replace) {
      const replaceIndex = steps.findIndex(step => step.id === replace);
      if (replaceIndex !== -1) {
        steps[replaceIndex] = { ...steps[replaceIndex], ...stepDefinition };
      }
      return steps;
    }

    // Insert at specific index
    if (typeof insertAt === 'number') {
      const insertIndex = Math.max(0, Math.min(insertAt, steps.length));
      steps.splice(insertIndex, 0, stepDefinition);
      return steps;
    }

    // Insert after specific step
    if (insertAfter) {
      const afterIndex = steps.findIndex(step => step.id === insertAfter);
      if (afterIndex !== -1) {
        steps.splice(afterIndex + 1, 0, stepDefinition);
      } else {
        // If the step to insert after is not found, append at the end
        steps.push(stepDefinition);
      }
      return steps;
    }

    // Insert before specific step
    if (insertBefore) {
      const beforeIndex = steps.findIndex(step => step.id === insertBefore);
      if (beforeIndex !== -1) {
        steps.splice(beforeIndex, 0, stepDefinition);
      } else {
        // If the step to insert before is not found, prepend at the beginning
        steps.unshift(stepDefinition);
      }
      return steps;
    }

    // Default: append at the end
    steps.push(stepDefinition);
    return steps;
  }

  /**
   * Sort custom steps by their injection order to ensure proper positioning
   * @param {Array} customSteps - Array of custom steps
   * @param {Array} baseSteps - Array of base steps for reference
   * @returns {Array} - Sorted custom steps
   */
  sortStepsByInjectionOrder(customSteps, baseSteps) {
    // Create a priority map for insertion positions
    const priorityMap = new Map();

    baseSteps.forEach((step, index) => {
      priorityMap.set(step.id, index);
    });

    return customSteps.sort((a, b) => {
      // Steps with specific indices go first
      if (typeof a.insertAt === 'number' && typeof b.insertAt === 'number') {
        return a.insertAt - b.insertAt;
      }

      if (typeof a.insertAt === 'number') return -1;
      if (typeof b.insertAt === 'number') return 1;

      // Then sort by reference to base steps
      const aPriority = this.getInsertionPriority(a, priorityMap);
      const bPriority = this.getInsertionPriority(b, priorityMap);

      return aPriority - bPriority;
    });
  }

  /**
   * Get insertion priority for a custom step
   * @param {Object} step - Custom step definition
   * @param {Map} priorityMap - Map of step IDs to their base positions
   * @returns {number} - Priority value for sorting
   */
  getInsertionPriority(step, priorityMap) {
    if (step.insertAfter && priorityMap.has(step.insertAfter)) {
      return priorityMap.get(step.insertAfter) + 0.5;
    }

    if (step.insertBefore && priorityMap.has(step.insertBefore)) {
      return priorityMap.get(step.insertBefore) - 0.5;
    }

    if (step.replace && priorityMap.has(step.replace)) {
      return priorityMap.get(step.replace);
    }

    // Default priority for steps without specific positioning
    return Number.MAX_SAFE_INTEGER;
  }

  /**
   * Apply plugin modifications to steps
   * @param {Array} steps - Current steps array
   * @param {Function} modifyFunction - Plugin's modify function
   * @returns {Array} - Modified steps array
   */
  applyModifications(steps, modifyFunction) {
    if (typeof modifyFunction !== 'function') {
      return steps;
    }

    try {
      const modifiedSteps = modifyFunction([...steps]);
      return Array.isArray(modifiedSteps) ? modifiedSteps : steps;
    } catch (error) {
      console.error('Error applying step modifications:', error);
      return steps;
    }
  }

  /**
   * Build the final steps array with all customizations applied
   * @param {Object} plugin - The plugin instance
   * @returns {Array} - Final steps array
   */
  buildSteps(plugin) {
    let steps = [...this.baseSteps];

    if (!plugin) {
      return steps;
    }

    // Apply custom step injections
    if (typeof plugin.getCustomSteps === 'function') {
      const customSteps = plugin.getCustomSteps();
      steps = this.injectSteps(customSteps);
    }

    // Apply step modifications
    if (typeof plugin.modifySteps === 'function') {
      steps = this.applyModifications(steps, plugin.modifySteps);
    }

    return steps;
  }

  /**
   * Validate that all steps have required properties
   * @param {Array} steps - Steps array to validate
   * @returns {Object} - Validation result
   */
  validateSteps(steps) {
    const errors = [];
    const duplicateIds = new Set();
    const seenIds = new Set();

    steps.forEach((step, index) => {
      // Check required properties
      if (!step.id) {
        errors.push(`Step at index ${index} is missing required 'id' property`);
      } else {
        // Check for duplicate IDs
        if (seenIds.has(step.id)) {
          duplicateIds.add(step.id);
        } else {
          seenIds.add(step.id);
        }
      }

      if (!step.title) {
        errors.push(`Step '${step.id || index}' is missing required 'title' property`);
      }

      if (!step.component) {
        errors.push(`Step '${step.id || index}' is missing required 'component' property`);
      }
    });

    // Add duplicate ID errors
    duplicateIds.forEach(id => {
      errors.push(`Duplicate step ID found: '${id}'`);
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Create a step manager with base steps
 * @param {Array} baseSteps - Base steps for the wizard
 * @returns {StepManager} - Step manager instance
 */
export function createStepManager(baseSteps) {
  return new StepManager(baseSteps);
}

export default StepManager;