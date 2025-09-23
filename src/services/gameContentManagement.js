import { apiRequest } from './apiClient.js';

/**
 * Game Content Management Service
 *
 * Provides API methods for managing game content templates and usage instances
 */

// ==================== TEMPLATE MANAGEMENT ====================

/**
 * Get all content templates
 */
export async function getContentTemplates(params = {}) {
  const searchParams = new URLSearchParams();

  if (params.game_type) searchParams.set('game_type', params.game_type);
  if (params.is_global !== undefined) searchParams.set('is_global', params.is_global);
  if (params.include_rules !== undefined) searchParams.set('include_rules', params.include_rules);

  const query = searchParams.toString();
  return apiRequest(`/game-content-templates${query ? `?${query}` : ''}`);
}

/**
 * Get templates for a specific game type
 */
export async function getTemplatesForGameType(gameType, includeGlobal = true) {
  const params = new URLSearchParams();
  if (!includeGlobal) params.set('include_global', 'false');

  const query = params.toString();
  return apiRequest(`/game-content-templates/game-type/${gameType}${query ? `?${query}` : ''}`);
}

/**
 * Get global templates
 */
export async function getGlobalTemplates() {
  return apiRequest('/game-content-templates/global');
}

/**
 * Get template by ID
 */
export async function getContentTemplate(templateId) {
  return apiRequest(`/game-content-templates/${templateId}`);
}

/**
 * Create a new content template
 */
export async function createContentTemplate(templateData) {
  return apiRequest('/game-content-templates', {
    method: 'POST',
    body: JSON.stringify(templateData)
  });
}

/**
 * Update a content template
 */
export async function updateContentTemplate(templateId, updates) {
  return apiRequest(`/game-content-templates/${templateId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

/**
 * Delete a content template
 */
export async function deleteContentTemplate(templateId) {
  return apiRequest(`/game-content-templates/${templateId}`, {
    method: 'DELETE'
  });
}

/**
 * Add a rule to a template
 */
export async function addTemplateRule(templateId, ruleData) {
  return apiRequest(`/game-content-templates/${templateId}/rules`, {
    method: 'POST',
    body: JSON.stringify(ruleData)
  });
}

/**
 * Update a template rule
 */
export async function updateTemplateRule(templateId, ruleId, updates) {
  return apiRequest(`/game-content-templates/${templateId}/rules/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

/**
 * Delete a template rule
 */
export async function deleteTemplateRule(templateId, ruleId) {
  return apiRequest(`/game-content-templates/${templateId}/rules/${ruleId}`, {
    method: 'DELETE'
  });
}

/**
 * Preview content for a rule configuration (admin only)
 */
export async function previewRuleContent(ruleData) {
  return apiRequest('/game-content-templates/preview-rule', {
    method: 'POST',
    body: JSON.stringify(ruleData)
  });
}

// ==================== GAME CONTENT USAGE ====================

/**
 * Get all content usage for a game
 */
export async function getGameContentUsage(gameId) {
  return apiRequest(`/games/${gameId}/content-usage`);
}

/**
 * Get specific content usage by ID
 */
export async function getContentUsage(gameId, usageId) {
  return apiRequest(`/games/${gameId}/content-usage/${usageId}`);
}

/**
 * Create new content usage for a game
 */
export async function createContentUsage(gameId, usageData) {
  return apiRequest(`/games/${gameId}/content-usage`, {
    method: 'POST',
    body: JSON.stringify(usageData)
  });
}

/**
 * Copy template to create usage instance
 */
export async function copyTemplateToUsage(gameId, copyData) {
  return apiRequest(`/games/${gameId}/content-usage/copy-template`, {
    method: 'POST',
    body: JSON.stringify(copyData)
  });
}

/**
 * Update content usage
 */
export async function updateContentUsage(gameId, usageId, updates) {
  return apiRequest(`/games/${gameId}/content-usage/${usageId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

/**
 * Delete content usage
 */
export async function deleteContentUsage(gameId, usageId) {
  return apiRequest(`/games/${gameId}/content-usage/${usageId}`, {
    method: 'DELETE'
  });
}

/**
 * Add rule to content usage
 */
export async function addUsageRule(gameId, usageId, ruleData) {
  return apiRequest(`/games/${gameId}/content-usage/${usageId}/rules`, {
    method: 'POST',
    body: JSON.stringify(ruleData)
  });
}

/**
 * Update usage rule
 */
export async function updateUsageRule(gameId, usageId, ruleId, updates) {
  return apiRequest(`/games/${gameId}/content-usage/${usageId}/rules/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

/**
 * Delete usage rule
 */
export async function deleteUsageRule(gameId, usageId, ruleId) {
  return apiRequest(`/games/${gameId}/content-usage/${usageId}/rules/${ruleId}`, {
    method: 'DELETE'
  });
}

// ==================== CONTENT RESOLUTION ====================

/**
 * Resolve content for a usage instance
 */
export async function resolveContentForUsage(gameId, usageId) {
  return apiRequest(`/games/${gameId}/content-usage/${usageId}/resolve`);
}

/**
 * Preview content for rule configuration
 */
export async function previewGameRuleContent(gameId, ruleData) {
  return apiRequest(`/games/${gameId}/content-usage/preview-rule`, {
    method: 'POST',
    body: JSON.stringify(ruleData)
  });
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get available content types
 */
export function getContentTypes() {
  return [
    'word',
    'worden',
    'image',
    'qa',
    'grammar',
    'audiofile',
    'contentlist',
    'attribute'
  ];
}

/**
 * Get rule types with descriptions
 */
export function getRuleTypes() {
  return [
    {
      value: 'attribute_based',
      label: 'Attribute Based',
      description: 'Filter content based on attribute values'
    },
    {
      value: 'content_list',
      label: 'Content List',
      description: 'Use specific content lists'
    },
    {
      value: 'complex_attribute',
      label: 'Complex Attribute',
      description: 'Complex attribute-based filtering with multiple conditions'
    },
    {
      value: 'relation_based',
      label: 'Relation Based',
      description: 'Filter content based on relationships between items'
    }
  ];
}

/**
 * Get content type icons and labels
 */
export function getContentTypeInfo() {
  return {
    word: { label: 'Hebrew Words', icon: 'Languages' },
    worden: { label: 'English Words', icon: 'Languages' },
    image: { label: 'Images', icon: 'ImageIcon' },
    qa: { label: 'Q&A', icon: 'HelpCircle' },
    grammar: { label: 'Grammar', icon: 'Book' },
    audiofile: { label: 'Audio Files', icon: 'Volume2' },
    contentlist: { label: 'Content Lists', icon: 'List' },
    attribute: { label: 'Attributes', icon: 'Tags' }
  };
}

/**
 * Validate rule configuration based on rule type
 */
export function validateRuleConfig(ruleType, config) {
  const errors = [];

  switch (ruleType) {
    case 'attribute_based':
      if (!config.attribute_name) errors.push('Attribute name is required');
      if (config.attribute_value === undefined || config.attribute_value === '') {
        errors.push('Attribute value is required');
      }
      break;

    case 'content_list':
      if (!config.content_list_ids || !Array.isArray(config.content_list_ids) || config.content_list_ids.length === 0) {
        errors.push('At least one content list ID is required');
      }
      break;

    case 'complex_attribute':
      if (!config.conditions || !Array.isArray(config.conditions) || config.conditions.length === 0) {
        errors.push('At least one condition is required');
      } else {
        config.conditions.forEach((condition, index) => {
          if (!condition.attribute_name) errors.push(`Condition ${index + 1}: Attribute name is required`);
          if (!condition.operator) errors.push(`Condition ${index + 1}: Operator is required`);
          if (condition.value === undefined) errors.push(`Condition ${index + 1}: Value is required`);
        });
      }
      break;

    case 'relation_based':
      if (!config.source_content_type) errors.push('Source content type is required');
      if (!config.relationship_type) errors.push('Relationship type is required');
      if (!config.target_content_types || !Array.isArray(config.target_content_types) || config.target_content_types.length === 0) {
        errors.push('At least one target content type is required');
      }
      break;

    default:
      errors.push('Invalid rule type');
  }

  return errors;
}

/**
 * Format rule config for display
 */
export function formatRuleConfigDisplay(ruleType, config) {
  switch (ruleType) {
    case 'attribute_based':
      return `${config.attribute_name} = "${config.attribute_value}"`;

    case 'content_list':
      return `Content Lists: ${config.content_list_ids?.length || 0} lists`;

    case 'complex_attribute':
      const conditionsCount = config.conditions?.length || 0;
      const logicalOp = config.logical_operator || 'AND';
      return `${conditionsCount} conditions with ${logicalOp}`;

    case 'relation_based':
      const targetCount = config.target_content_types?.length || 0;
      return `${config.source_content_type} → ${targetCount} target types (${config.relationship_type})`;

    default:
      return 'Invalid rule configuration';
  }
}